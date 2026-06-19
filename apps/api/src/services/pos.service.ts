import { PrismaClient, ChargeStatus } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class POSService {
  async getSellableItems(hotelId: string) {
    return prisma.storeItem.findMany({
      where: { hotelId, isActive: true, isSellable: true },
      orderBy: { name: 'asc' }
    })
  }

  async getActiveBookings(hotelId: string) {
    return prisma.booking.findMany({
      where: { hotelId, status: 'checked_in' },
      include: { 
        guest: { select: { fullName: true, phone: true } },
        room: { select: { roomNumber: true, type: true } }
      },
      orderBy: { room: { roomNumber: 'asc' } }
    })
  }

  async postCharge(hotelId: string, userId: string, data: {
    bookingId: string;
    items: Array<{ itemId: string; quantity: number }>;
    notes?: string;
  }) {
    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, hotelId, status: 'checked_in' }
    })
    if (!booking) throw ApiError.notFound('Mgeni hajapatikana au hajafanya check-in')

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0
      const chargeItemsData = []

      for (const reqItem of data.items) {
        const item = await tx.storeItem.findFirst({
          where: { id: reqItem.itemId, hotelId, isActive: true, isSellable: true }
        })
        if (!item) throw ApiError.notFound(`Item ${reqItem.itemId} haikupatikana au haiuzwi`)
        if (item.currentStock < reqItem.quantity) {
          throw ApiError.badRequest(`Stock haitoshi kwa ${item.name}. Inapatikana: ${item.currentStock}`)
        }

        const unitPrice = item.sellingPrice || 0
        const totalPrice = unitPrice * reqItem.quantity
        totalAmount += totalPrice

        chargeItemsData.push({
          itemId: item.id,
          itemName: item.name,
          quantity: reqItem.quantity,
          unitPrice,
          totalPrice
        })

        // STOCK_OUT transaction
        const balanceBefore = item.currentStock
        const balanceAfter = balanceBefore - reqItem.quantity

        await tx.storeItem.update({
          where: { id: item.id },
          data: { currentStock: balanceAfter }
        })

        await tx.storeTransaction.create({
          data: {
            itemId: item.id,
            type: 'STOCK_OUT',
            quantity: reqItem.quantity,
            unitCost: item.unitCost,
            balanceBefore,
            balanceAfter,
            reference: booking.bookingRef,
            notes: `POS Charge: ${booking.bookingRef}`,
            performedById: userId
          }
        })
      }

      const charge = await tx.roomCharge.create({
        data: {
          bookingId: booking.id,
          totalAmount,
          notes: data.notes,
          postedById: userId,
          items: {
            create: chargeItemsData
          }
        },
        include: { items: true }
      })

      // Update booking balance
      await tx.booking.update({
        where: { id: booking.id },
        data: { 
          balanceDue: { increment: totalAmount },
          totalAmount: { increment: totalAmount }
        }
      })

      return charge
    })
  }

  async getFolio(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        guest: true,
        room: true,
        roomCharges: {
          include: { items: true, postedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        payments: true
      }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')
    return booking
  }

  async voidCharge(chargeId: string, hotelId: string, userId: string) {
    const charge = await prisma.roomCharge.findUnique({
      where: { id: chargeId },
      include: { items: true, booking: true }
    })
    if (!charge || charge.booking.hotelId !== hotelId) throw ApiError.notFound('Charge haikupatikana')
    if (charge.status === 'SETTLED') throw ApiError.badRequest('Haiwezi kufuta charge iliyolipwa tayari')

    return prisma.$transaction(async (tx) => {
      // 1. Reverse stock for each item
      for (const cItem of charge.items) {
        const item = await tx.storeItem.findUnique({ where: { id: cItem.itemId } })
        if (item) {
          const balanceBefore = item.currentStock
          const balanceAfter = balanceBefore + cItem.quantity
          
          await tx.storeItem.update({
            where: { id: item.id },
            data: { currentStock: balanceAfter }
          })

          await tx.storeTransaction.create({
            data: {
              itemId: item.id,
              type: 'ADJUSTMENT',
              quantity: cItem.quantity,
              unitCost: item.unitCost,
              balanceBefore,
              balanceAfter,
              reference: `VOID-${charge.id}`,
              notes: `Void charge reversal for ${charge.booking.bookingRef}`,
              performedById: userId
            }
          })
        }
      }

      // 2. Update booking balance
      await tx.booking.update({
        where: { id: charge.bookingId },
        data: { 
          balanceDue: { decrement: charge.totalAmount },
          totalAmount: { decrement: charge.totalAmount }
        }
      })

      // 3. Delete charge items and charge
      await tx.roomChargeItem.deleteMany({ where: { roomChargeId: charge.id } })
      return tx.roomCharge.delete({ where: { id: charge.id } })
    })
  }

  async getInvoiceData(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        guest: true,
        room: true,
        roomCharges: { include: { items: true } },
        hotel: true,
        createdBy: { select: { fullName: true } }
      }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    const nights = Math.max(1, Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    
    const posCharges = booking.roomCharges.flatMap(c => c.items.map(i => ({
      date: c.createdAt,
      description: i.itemName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.totalPrice
    })))

    return {
      invoiceNumber: `INV-${new Date().getFullYear()}-${booking.bookingRef.split('-').pop()}`,
      hotel: {
        name: booking.hotel.name,
        address: booking.hotel.address,
        phone: booking.hotel.phone,
        email: booking.hotel.email
      },
      guest: {
        name: booking.guest.fullName,
        phone: booking.guest.phone,
        nationality: booking.guest.nationality
      },
      booking: {
        ref: booking.bookingRef,
        room: booking.room.roomNumber,
        roomType: booking.room.type,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights
      },
      charges: {
        accommodation: Number(booking.roomTotal),
        roomCharges: posCharges
      },
      summary: {
        subtotal: Number(booking.totalAmount),
        tax: Number(booking.taxAmount),
        total: Number(booking.totalAmount),
        amountPaid: Number(booking.paidAmount),
        balanceDue: Number(booking.balanceDue)
      },
      issuedAt: new Date(),
      issuedBy: booking.createdBy.fullName
    }
  }

  async checkout(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId, status: 'checked_in' }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana au mgeni hajaingia')

    return prisma.$transaction(async (tx) => {
      // 1. Settle all open room charges
      await tx.roomCharge.updateMany({
        where: { bookingId: booking.id, status: 'OPEN' },
        data: { status: 'SETTLED', settledAt: new Date() }
      })

      // 2. Settle the booking balance as per spec
      // Note: In real scenarios, this should record a Payment too.
      return tx.booking.update({
        where: { id: booking.id },
        data: { 
          balanceDue: 0,
          paidAmount: booking.totalAmount, // Assuming paid everything at checkout
          updatedAt: new Date() 
        }
      })
    })
  }
}

export const posService = new POSService()