import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Store seeder is not allowed in production environment.')
  }

  console.log('🌱 Seeding store & inventory data...')

  // ── Lookup default hotel + admin user ─────────────────────────────────────
  const hotel = await prisma.hotel.findUnique({ where: { slug: 'default' } })
  if (!hotel) throw new Error('Default hotel not found. Run `npm run db:seed` first.')

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@buffalo-hotel.co.tz' }
  })
  if (!admin) throw new Error('Admin user not found. Run `npm run db:seed` first.')

  const performedById = admin.id
  const hotelId = hotel.id

  // ── Clean existing store data (dev only) ──────────────────────────────────
  console.log('🧹 Cleaning existing store data...')
  await prisma.roomChargeItem.deleteMany()
  await prisma.roomCharge.deleteMany()
  await prisma.storeTransaction.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.storeItem.deleteMany()
  await prisma.supplier.deleteMany()

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const suppliersData = [
    {
      id: 'sup-001',
      name: 'Morogoro General Supplies',
      phone: '+255712000001',
      email: 'supplies@mgs.co.tz',
      address: 'Morogoro Town, Lumumba Street',
      paymentTerms: '30 days net',
      notes: 'Reliable supplier — delivers within 24hrs',
      isActive: true,
    },
    {
      id: 'sup-002',
      name: 'Tanzania Breweries Ltd',
      phone: '+255712000002',
      email: null,
      address: 'Dar es Salaam (Morogoro branch)',
      paymentTerms: '14 days net',
      notes: 'Minimum order: 2 crates per item',
      isActive: true,
    },
    {
      id: 'sup-003',
      name: 'Karibu Textiles',
      phone: '+255712000003',
      email: 'karibu.textiles@gmail.com',
      address: 'Morogoro Industrial Area',
      paymentTerms: 'Cash on delivery',
      notes: 'Quality linen supplier. Custom sizes available.',
      isActive: true,
    },
  ]

  for (const s of suppliersData) {
    await prisma.supplier.create({ data: { ...s, hotelId } })
    console.log('✅ Supplier:', s.name)
  }

  // ── Store Items ───────────────────────────────────────────────────────────
  const itemsData = [
    // F&B — Bar Stock
    { id: 'item-001', name: 'Serengeti Beer (500ml)', sku: 'FB-001', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 48, minimumStock: 24, maximumStock: 120, unitCost: 1800, sellingPrice: 3500, isSellable: true, supplierId: 'sup-002' },
    { id: 'item-002', name: 'Kilimanjaro Beer (500ml)', sku: 'FB-002', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 36, minimumStock: 24, maximumStock: 120, unitCost: 1800, sellingPrice: 3500, isSellable: true, supplierId: 'sup-002' },
    // F&B — Beverages
    { id: 'item-003', name: 'Coca Cola (300ml)', sku: 'FB-003', category: 'FB', subCategory: 'Beverages', unit: 'BOTTLE', currentStock: 60, minimumStock: 30, maximumStock: 150, unitCost: 600, sellingPrice: 1500, isSellable: true, supplierId: 'sup-001' },
    { id: 'item-004', name: 'Mineral Water (500ml)', sku: 'FB-004', category: 'FB', subCategory: 'Beverages', unit: 'BOTTLE', currentStock: 40, minimumStock: 40, maximumStock: 200, unitCost: 400, sellingPrice: 1000, isSellable: true, supplierId: 'sup-001' },
    { id: 'item-007', name: 'Fresh Juice (Orange)', sku: 'FB-007', category: 'FB', subCategory: 'Beverages', unit: 'PCS', currentStock: 20, minimumStock: 10, maximumStock: 50, unitCost: 1500, sellingPrice: 4000, isSellable: true, supplierId: 'sup-001' },
    // F&B — Dry Foods
    { id: 'item-005', name: 'Rice (25kg bag)', sku: 'FB-005', category: 'FB', subCategory: 'Dry Foods', unit: 'KG', currentStock: 75, minimumStock: 25, maximumStock: 200, unitCost: 2200, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
    { id: 'item-006', name: 'Cooking Oil (20L)', sku: 'FB-006', category: 'FB', subCategory: 'Dry Foods', unit: 'LTR', currentStock: 40, minimumStock: 20, maximumStock: 100, unitCost: 4500, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
    // F&B — Food (POS / kitchen)
    { id: 'item-008', name: 'Breakfast Plate (Full)', sku: 'FB-008', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 3000, sellingPrice: 8000, isSellable: true, supplierId: 'sup-001' },
    { id: 'item-009', name: 'Chips (Portion)', sku: 'FB-009', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 1000, sellingPrice: 3000, isSellable: true, supplierId: 'sup-001' },
    { id: 'item-010', name: 'Pilau (Plate)', sku: 'FB-010', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 1500, sellingPrice: 5000, isSellable: true, supplierId: 'sup-001' },
    { id: 'item-011', name: 'Chicken (Half)', sku: 'FB-011', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 5000, sellingPrice: 12000, isSellable: true, supplierId: 'sup-001' },
    // Hotel — Linen & Towels
    { id: 'item-101', name: 'Bath Towel (Large)', sku: 'HT-001', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 20, minimumStock: 16, maximumStock: 40, unitCost: 8000, sellingPrice: null, isSellable: false, supplierId: 'sup-003' },
    { id: 'item-102', name: 'Bed Sheet (King)', sku: 'HT-002', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 12, minimumStock: 8, maximumStock: 24, unitCost: 15000, sellingPrice: null, isSellable: false, supplierId: 'sup-003' },
    // Hotel — Bathroom Amenities
    { id: 'item-103', name: 'Shower Gel (50ml)', sku: 'HT-003', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 8, minimumStock: 20, maximumStock: 80, unitCost: 1200, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
    { id: 'item-104', name: 'Toilet Soap (bar)', sku: 'HT-004', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 15, minimumStock: 20, maximumStock: 80, unitCost: 800, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
    { id: 'item-105', name: 'Toilet Paper (roll)', sku: 'HT-005', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'ROLL', currentStock: 30, minimumStock: 24, maximumStock: 100, unitCost: 500, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
    // Hotel — Cleaning Supplies
    { id: 'item-106', name: 'Garbage Bags (roll)', sku: 'HT-006', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'ROLL', currentStock: 5, minimumStock: 6, maximumStock: 24, unitCost: 2000, sellingPrice: null, isSellable: false, supplierId: 'sup-001' },
  ]

  for (const item of itemsData) {
    await prisma.storeItem.create({
      data: {
        id: item.id,
        hotelId,
        name: item.name,
        sku: item.sku,
        category: item.category as any,
        subCategory: item.subCategory,
        unit: item.unit as any,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        maximumStock: item.maximumStock,
        unitCost: item.unitCost,
        sellingPrice: item.sellingPrice,
        isSellable: item.isSellable,
        isActive: true,
        supplierId: item.supplierId,
      }
    })
    console.log('✅ Store item:', item.name)
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────
  const purchaseOrdersData = [
    {
      id: 'po-003',
      poNumber: 'PO-2025-003',
      status: 'DRAFT',
      supplierId: 'sup-001',
      totalAmount: 140000,
      notes: 'Urgent — items below minimum stock',
      expectedDelivery: new Date(Date.now() + 86400000 * 2),
      receivedAt: null,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000),
      items: [
        { itemId: 'item-103', quantityOrdered: 60, quantityReceived: 0, unitCost: 1200, totalCost: 72000 },
        { itemId: 'item-104', quantityOrdered: 40, quantityReceived: 0, unitCost: 800, totalCost: 32000 },
        { itemId: 'item-106', quantityOrdered: 18, quantityReceived: 0, unitCost: 2000, totalCost: 36000 },
      ],
    },
    {
      id: 'po-002',
      poNumber: 'PO-2025-002',
      status: 'RECEIVED',
      supplierId: 'sup-002',
      totalAmount: 122400,
      notes: null,
      expectedDelivery: new Date(Date.now() - 86400000),
      receivedAt: new Date(Date.now() - 43200000),
      createdAt: new Date(Date.now() - 259200000),
      updatedAt: new Date(Date.now() - 43200000),
      items: [
        { itemId: 'item-001', quantityOrdered: 48, quantityReceived: 48, unitCost: 1800, totalCost: 86400 },
        { itemId: 'item-003', quantityOrdered: 60, quantityReceived: 60, unitCost: 600, totalCost: 36000 },
      ],
    },
    {
      id: 'po-001',
      poNumber: 'PO-2025-001',
      status: 'SENT_TO_SUPPLIER',
      supplierId: 'sup-003',
      totalAmount: 340000,
      notes: 'Monthly linen restock',
      expectedDelivery: new Date(Date.now() + 86400000 * 3),
      receivedAt: null,
      createdAt: new Date(Date.now() - 432000000),
      updatedAt: new Date(Date.now() - 172800000),
      items: [
        { itemId: 'item-101', quantityOrdered: 20, quantityReceived: 0, unitCost: 8000, totalCost: 160000 },
        { itemId: 'item-102', quantityOrdered: 12, quantityReceived: 0, unitCost: 15000, totalCost: 180000 },
      ],
    },
  ]

  for (const po of purchaseOrdersData) {
    await prisma.purchaseOrder.create({
      data: {
        id: po.id,
        hotelId,
        poNumber: po.poNumber,
        status: po.status as any,
        supplierId: po.supplierId,
        totalAmount: po.totalAmount,
        notes: po.notes,
        expectedDelivery: po.expectedDelivery,
        receivedAt: po.receivedAt,
        createdById: performedById,
        createdAt: po.createdAt,
        updatedAt: po.updatedAt,
        items: {
          create: po.items.map(i => ({
            itemId: i.itemId,
            quantityOrdered: i.quantityOrdered,
            quantityReceived: i.quantityReceived,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      }
    })
    console.log('✅ Purchase order:', po.poNumber)
  }

  // ── Store Transactions (history) ──────────────────────────────────────────
  const transactionsData = [
    { id: 'tx-001', itemId: 'item-001', type: 'STOCK_IN', quantity: 24, unitCost: 1800, balanceBefore: 24, balanceAfter: 48, reference: 'PO-2025-002', notes: 'Delivery received from TBL', createdAt: new Date(Date.now() - 3600000) },
    { id: 'tx-002', itemId: 'item-004', type: 'STOCK_OUT', quantity: 6, unitCost: 400, balanceBefore: 46, balanceAfter: 40, reference: 'Room 108 — Amina', notes: undefined, createdAt: new Date(Date.now() - 7200000) },
    { id: 'tx-003', itemId: 'item-103', type: 'STOCK_OUT', quantity: 4, unitCost: 1200, balanceBefore: 12, balanceAfter: 8, reference: 'Housekeeping', notes: undefined, createdAt: new Date(Date.now() - 10800000) },
    { id: 'tx-004', itemId: 'item-007', type: 'WASTAGE', quantity: 2, unitCost: 1500, balanceBefore: 22, balanceAfter: 20, reference: undefined, notes: 'Expired — not sold', createdAt: new Date(Date.now() - 14400000) },
    { id: 'tx-005', itemId: 'item-105', type: 'STOCK_IN', quantity: 12, unitCost: 500, balanceBefore: 18, balanceAfter: 30, reference: 'PO-2025-002', notes: undefined, createdAt: new Date(Date.now() - 86400000) },
    { id: 'tx-006', itemId: 'item-003', type: 'STOCK_IN', quantity: 30, unitCost: 600, balanceBefore: 30, balanceAfter: 60, reference: 'PO-2025-002', notes: undefined, createdAt: new Date(Date.now() - 90000000) },
    { id: 'tx-007', itemId: 'item-101', type: 'ADJUSTMENT', quantity: 20, unitCost: 8000, balanceBefore: 18, balanceAfter: 20, reference: 'Stock count', notes: 'Stock count correction', createdAt: new Date(Date.now() - 172800000) },
  ]

  for (const tx of transactionsData) {
    await prisma.storeTransaction.create({
      data: {
        id: tx.id,
        itemId: tx.itemId,
        type: tx.type as any,
        quantity: tx.quantity,
        unitCost: tx.unitCost,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        reference: tx.reference,
        notes: tx.notes,
        performedById,
        createdAt: tx.createdAt,
      }
    })
    console.log('✅ Transaction:', tx.type, tx.itemId)
  }

  console.log('\n🎉 Store & inventory seeding completed!')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
