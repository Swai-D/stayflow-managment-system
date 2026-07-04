import { PrismaClient, StoreCategory, StockUnit, TransactionType, POStatus, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class StoreService {
  // ─── Items ─────────────────────────────────────────────
  async getItems(hotelId: string, filters?: { category?: StoreCategory; subCategory?: string; isActive?: boolean }) {
    const items = await prisma.storeItem.findMany({
      where: {
        hotelId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.subCategory && { subCategory: filters.subCategory }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: { supplier: true },
      orderBy: { name: 'asc' },
    })

    return items.map(item => ({
      ...item,
      stockStatus: this.calculateStockStatus(item)
    }))
  }

  async getItem(id: string, hotelId: string) {
    const item = await prisma.storeItem.findFirst({
      where: { id, hotelId },
      include: { supplier: true }
    })
    if (!item) throw ApiError.notFound('Item haikupatikana')
    
    return {
      ...item,
      stockStatus: this.calculateStockStatus(item)
    }
  }

  async createItem(hotelId: string, data: any) {
    return prisma.storeItem.create({
      data: { ...data, hotelId }
    })
  }

  async updateItem(id: string, hotelId: string, data: any) {
    return prisma.storeItem.update({
      where: { id },
      data
    })
  }

  async getLowStockItems(hotelId: string) {
    // Standard Prisma findMany doesn't support column-to-column comparison
    // We use queryRaw for efficiency or findMany + filter for small sets.
    // Given the SaaS structure, queryRaw is safer.
    const items = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM "store_items" 
      WHERE "hotelId" = ${hotelId} 
      AND "isActive" = true 
      AND "currentStock" < "minimumStock"
    `)

    return items.map(item => ({
      ...item,
      stockStatus: 'low_stock'
    }))
  }

  // ─── Transactions ──────────────────────────────────────
  async getTransactions(hotelId: string, filters?: { itemId?: string; type?: TransactionType }) {
    return prisma.storeTransaction.findMany({
      where: {
        item: { hotelId },
        ...(filters?.itemId && { itemId: filters.itemId }),
        ...(filters?.type && { type: filters.type }),
      },
      include: { 
        item: true,
        performedBy: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async createTransaction(hotelId: string, userId: string, data: {
    itemId: string;
    type: TransactionType;
    quantity: number;
    notes?: string;
    reference?: string;
    unitCost?: number;
  }) {
    const item = await prisma.storeItem.findFirst({
      where: { id: data.itemId, hotelId }
    })
    if (!item) throw ApiError.notFound('Item haikupatikana')

    if (data.type === 'STOCK_OUT' || data.type === 'WASTAGE') {
      if (item.currentStock < data.quantity) {
        throw ApiError.badRequest(`Stock haitoshi. Inapatikana: ${item.currentStock}`)
      }
    }

    if ((data.type === 'ADJUSTMENT' || data.type === 'WASTAGE') && !data.notes?.trim()) {
      throw ApiError.badRequest('Tafadhali eleza sababu ya adjustment au wastage')
    }

    const balanceBefore = item.currentStock
    const balanceAfter = data.type === 'STOCK_IN' || (data.type === 'ADJUSTMENT' && data.quantity > 0)
      ? balanceBefore + Math.abs(data.quantity)
      : balanceBefore - Math.abs(data.quantity)

    return prisma.$transaction(async (tx) => {
      await tx.storeItem.update({
        where: { id: item.id },
        data: { currentStock: balanceAfter }
      })

      return tx.storeTransaction.create({
        data: {
          itemId: item.id,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost || item.unitCost,
          balanceBefore,
          balanceAfter,
          reference: data.reference,
          notes: data.notes,
          performedById: userId
        }
      })
    })
  }

  async recordHousekeepingConsumption(hotelId: string, userId: string, data: {
    roomNumber: string;
    items: Array<{ itemId: string; quantity: number }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const results = []
      for (const reqItem of data.items) {
        if (!reqItem.quantity || reqItem.quantity <= 0) continue

        const item = await tx.storeItem.findFirst({
          where: { id: reqItem.itemId, hotelId, isActive: true }
        })
        if (!item) continue
        if (item.currentStock < reqItem.quantity) {
          throw ApiError.badRequest(`Stock haitoshi kwa ${item.name}. Inapatikana: ${item.currentStock}`)
        }

        const balanceBefore = item.currentStock
        const balanceAfter = balanceBefore - reqItem.quantity

        await tx.storeItem.update({
          where: { id: item.id },
          data: { currentStock: balanceAfter }
        })

        const transaction = await tx.storeTransaction.create({
          data: {
            itemId: item.id,
            type: 'STOCK_OUT',
            quantity: reqItem.quantity,
            unitCost: item.unitCost,
            balanceBefore,
            balanceAfter,
            reference: `Room ${data.roomNumber}`,
            notes: `Housekeeping consumption for room ${data.roomNumber}`,
            performedById: userId
          }
        })
        results.push(transaction)
      }
      return results
    })
  }

  // ─── Purchase Orders ───────────────────────────────────
  async getPurchaseOrders(hotelId: string) {
    return prisma.purchaseOrder.findMany({
      where: { hotelId },
      include: {
        supplier: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async createPurchaseOrder(hotelId: string, userId: string, data: {
    supplierId: string;
    notes?: string;
    expectedDelivery?: Date;
    items: Array<{ itemId: string; quantityOrdered: number; unitCost: number }>;
  }) {
    const poNumber = await this.generatePONumber(hotelId)
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0)

    return prisma.purchaseOrder.create({
      data: {
        hotelId,
        poNumber,
        supplierId: data.supplierId,
        notes: data.notes,
        expectedDelivery: data.expectedDelivery,
        createdById: userId,
        totalAmount,
        items: {
          create: data.items.map(item => ({
            itemId: item.itemId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            totalCost: item.quantityOrdered * item.unitCost
          }))
        }
      },
      include: { items: true }
    })
  }

  async receivePurchaseOrder(id: string, hotelId: string, userId: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, hotelId },
      include: { items: true }
    })
    if (!po) throw ApiError.notFound('PO haikupatikana')
    if (po.status === 'RECEIVED' || po.status === 'CLOSED') throw ApiError.badRequest('PO tayari imeshapokelewa au imefungwa')

    return prisma.$transaction(async (tx) => {
      // 1. Update PO status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() }
      })

      // 2. Create Stock In transactions for each item
      for (const poItem of po.items) {
        const item = await tx.storeItem.findUnique({ where: { id: poItem.itemId } })
        if (!item) continue

        const balanceBefore = item.currentStock
        const balanceAfter = balanceBefore + poItem.quantityOrdered

        await tx.storeItem.update({
          where: { id: item.id },
          data: { currentStock: balanceAfter }
        })

        await tx.storeTransaction.create({
          data: {
            itemId: item.id,
            type: 'STOCK_IN',
            quantity: poItem.quantityOrdered,
            unitCost: poItem.unitCost,
            balanceBefore,
            balanceAfter,
            reference: po.poNumber,
            notes: `Received from PO: ${po.poNumber}`,
            performedById: userId
          }
        })
      }
    })
  }

  async autoGeneratePO(hotelId: string, userId: string) {
    const allItems = await prisma.storeItem.findMany({
      where: {
        hotelId,
        isActive: true,
        supplierId: { not: null }
      }
    })

    const lowStockItems = allItems.filter(item => item.currentStock < item.minimumStock)

    const itemsBySupplier: Record<string, typeof lowStockItems> = {}
    lowStockItems.forEach(item => {
      const sId = item.supplierId!
      if (!itemsBySupplier[sId]) itemsBySupplier[sId] = []
      itemsBySupplier[sId].push(item)
    })

    const createdPOs = []
    for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
      const po = await this.createPurchaseOrder(hotelId, userId, {
        supplierId,
        notes: 'Auto-generated for low stock items',
        items: items.map(item => ({
          itemId: item.id,
          quantityOrdered: item.maximumStock - item.currentStock,
          unitCost: Number(item.unitCost)
        }))
      })
      createdPOs.push(po)
    }

    return createdPOs
  }

  async updatePOStatus(id: string, hotelId: string, status: POStatus) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, hotelId } })
    if (!po) throw ApiError.notFound('PO haikupatikana')
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    })
  }

  // ─── Suppliers ─────────────────────────────────────────
  async getSuppliers(hotelId: string) {
    const suppliers = await prisma.supplier.findMany({
      where: { hotelId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        items: { where: { isActive: true }, select: { id: true } },
        purchaseOrders: {
          where: { status: { not: 'CLOSED' } },
          select: { id: true, totalAmount: true, createdAt: true }
        }
      }
    })

    return suppliers.map(s => {
      const lastOrder = s.purchaseOrders.length > 0
        ? s.purchaseOrders.reduce((latest, po) =>
            po.createdAt > latest ? po.createdAt : latest,
            s.purchaseOrders[0].createdAt
          )
        : null

      return {
        ...s,
        itemCount: s.items.length,
        totalOrders: s.purchaseOrders.length,
        totalValue: s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
        lastOrder
      }
    })
  }

  async createSupplier(hotelId: string, data: any) {
    return prisma.supplier.create({
      data: { ...data, hotelId }
    })
  }

  async updateSupplier(id: string, hotelId: string, data: any) {
    const supplier = await prisma.supplier.findFirst({ where: { id, hotelId } })
    if (!supplier) throw ApiError.notFound('Supplier haikupatikana')
    return prisma.supplier.update({
      where: { id },
      data
    })
  }

  // ─── Dashboard ─────────────────────────────────────────
  async getDashboardStats(hotelId: string) {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)

    const [
      totalItems,
      lowStockCount,
      outOfStockCount,
      monthlySpend,
      pendingPOs,
      recentTransactions
    ] = await Promise.all([
      prisma.storeItem.count({ where: { hotelId, isActive: true } }),
      prisma.storeItem.count({ 
        where: { hotelId, isActive: true, currentStock: { lt: prisma.storeItem.fields.minimumStock, gt: 0 } } 
      }),
      prisma.storeItem.count({ 
        where: { hotelId, isActive: true, currentStock: 0 } 
      }),
      prisma.storeTransaction.aggregate({
        where: { 
          item: { hotelId }, 
          type: 'STOCK_IN',
          createdAt: { gte: startOfMonth }
        },
        _sum: { quantity: true, unitCost: true } // Simplified spend calculation
      }),
      prisma.purchaseOrder.count({ where: { hotelId, status: { notIn: ['RECEIVED', 'CLOSED'] as POStatus[] } } }),
      prisma.storeTransaction.findMany({
        where: { item: { hotelId } },
        include: { item: true, performedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    // Real spend calculation
    const stockInTransactions = await prisma.storeTransaction.findMany({
      where: { 
        item: { hotelId }, 
        type: 'STOCK_IN',
        createdAt: { gte: startOfMonth }
      },
      include: { item: { select: { category: true } } }
    })
    const realMonthlySpend = stockInTransactions.reduce((sum, t) => sum + (t.quantity * Number(t.unitCost || 0)), 0)

    // Monthly spend trend (last 6 months) — real data
    const monthlyTrend: Array<{ month: string; fb: number; hotel: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(startOfMonth)
      d.setMonth(d.getMonth() - i)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const label = monthStart.toLocaleString('default', { month: 'short' })

      const monthTx = await prisma.storeTransaction.findMany({
        where: {
          item: { hotelId },
          type: 'STOCK_IN',
          createdAt: { gte: monthStart, lt: monthEnd }
        },
        include: { item: { select: { category: true } } }
      })

      const fb = monthTx
        .filter(t => t.item?.category === 'FB')
        .reduce((sum, t) => sum + (t.quantity * Number(t.unitCost || 0)), 0)
      const hotel = monthTx
        .filter(t => t.item?.category === 'HOTEL')
        .reduce((sum, t) => sum + (t.quantity * Number(t.unitCost || 0)), 0)

      monthlyTrend.push({ month: label, fb, hotel })
    }

    // Low stock items for dashboard
    const lowStockItemsRaw = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM "store_items" 
      WHERE "hotelId" = ${hotelId} 
      AND "isActive" = true 
      AND "currentStock" < "minimumStock"
      LIMIT 5
    `)
    const lowStockItems = lowStockItemsRaw.map(item => ({
      ...item,
      stockStatus: 'low_stock'
    }))

    // Top used items (STOCK_OUT / WASTAGE) this month
    const topUsedItemsRaw = await prisma.storeTransaction.groupBy({
      by: ['itemId'],
      where: {
        item: { hotelId },
        type: { in: ['STOCK_OUT', 'WASTAGE'] },
        createdAt: { gte: startOfMonth }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    })

    const topUsedItems = await Promise.all(
      topUsedItemsRaw.map(async (t) => {
        const item = await prisma.storeItem.findUnique({
          where: { id: t.itemId }
        })
        return {
          item,
          totalUsed: t._sum.quantity || 0
        }
      })
    )

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      monthlySpend: realMonthlySpend,
      monthlySpendTrend: monthlyTrend,
      pendingPOs,
      recentTransactions,
      lowStockItems,
      topUsedItems
    }
  }

  // ─── Helpers ───────────────────────────────────────────
  private calculateStockStatus(item: any) {
    if (item.currentStock <= 0) return 'out_of_stock'
    if (item.currentStock < item.minimumStock) return 'low_stock'
    if (item.currentStock > item.maximumStock) return 'overstocked'
    return 'in_stock'
  }

  private async generatePONumber(hotelId: string) {
    const year = new Date().getFullYear()
    const count = await prisma.purchaseOrder.count({
      where: { 
        hotelId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    })
    return `PO-${year}-${String(count + 1).padStart(3, '0')}`
  }
}

export const storeService = new StoreService()