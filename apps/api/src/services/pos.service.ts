import { PrismaClient, ChargeStatus } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { pdfService } from './pdf.service'
import { brevoService } from './brevo.service'
import { webhookService } from './webhook.service'
import { format } from 'date-fns'

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

      // Dispatch webhook asynchronously
      webhookService.dispatch(booking.hotelId, 'room_charge.created', { charge, booking }).catch(console.error)

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
        company: true,
        room: true,
        roomCharges: { include: { items: true } },
        hotel: true,
        createdBy: { select: { fullName: true } }
      }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    const nights = Math.max(1, Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    const isCompany = !!booking.company
    const billToName = isCompany ? booking.company!.name : booking.guest.fullName
    const billToEmail = isCompany ? booking.company!.email : booking.guest.email
    const billToPhone = isCompany ? booking.company!.phone : booking.guest.phone

    const posCharges = booking.roomCharges.flatMap(c => c.items.map(i => ({
      date: c.createdAt,
      description: i.itemName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.totalPrice
    })))

    return {
      invoiceNumber: `FOL-${new Date().getFullYear()}-${booking.bookingRef.split('-').pop()}`,
      hotel: {
        name: booking.hotel.name,
        address: booking.hotel.address,
        phone: booking.hotel.phone,
        email: booking.hotel.email
      },
      guest: {
        name: billToName,
        phone: billToPhone,
        email: billToEmail,
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

  async sendInvoiceEmail(bookingId: string, hotelId: string, type: 'invoice' | 'folio' = 'folio') {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { guest: true, room: true, hotel: true, company: true }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    const recipientEmail = booking.company?.email || booking.guest.email
    const recipientName = booking.company?.name || booking.guest.fullName
    if (!recipientEmail) throw ApiError.badRequest('Mgeni au kampuni hana email address')

    // POS emails a running folio by default; checkout/payment can request the final invoice PDF.
    const pdfBuffer = await pdfService.generateInvoice(bookingId, type)
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )
    const docLabel = type === 'invoice'
      ? (booking.company ? 'Company Invoice' : 'Guest Invoice')
      : (booking.company ? 'Folio Summary' : 'Guest Folio')

    const hotel = booking.hotel
    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563EB; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${hotel.name}</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Comfort in every stay</p>
        </div>

        <div style="padding: 24px; background: #ffffff;">
          <h2 style="color: #2563EB; margin-top: 0;">${docLabel}</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Please find your updated ${docLabel.toLowerCase()} attached for your stay at <strong>${hotel.name}</strong>. This is a running statement; the official invoice will be issued at checkout or upon payment confirmation.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="background: #F3F4F6;">
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Booking Reference</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">${booking.bookingRef}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Room</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">${booking.room.roomNumber} (${booking.room.type})</td>
            </tr>
            <tr style="background: #F3F4F6;">
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Check-in</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">${format(new Date(booking.checkIn), 'dd MMM yyyy')}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Check-out</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">${format(new Date(booking.checkOut), 'dd MMM yyyy')}</td>
            </tr>
            <tr style="background: #F3F4F6;">
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Nights</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB;">${nights}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold;">Balance Due</td>
              <td style="padding: 10px; border: 1px solid #E5E7EB; font-weight: bold; color: #2563EB;">TZS ${Number(booking.balanceDue).toLocaleString('en-TZ')}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">
            <strong>Booking Policy</strong><br/>
            All bookings will be confirmed upon receiving a deposit. The remaining balance should be cleared on arrival or before check-out. Full pre-payment may be required within 7 days of booking.
          </p>

          <p>
            <strong>Cancellation & No Show Policy</strong><br/>
            All cancellations must be received with written confirmation. Cancellations made within 24 hours of check-in or no-shows may be charged the full booking amount.
          </p>

          <p>If you have any questions, please contact us at your earliest convenience.</p>

          <p>Best regards,<br/><strong>${hotel.name} Team</strong></p>
        </div>

        <div style="padding: 20px; background: #F9FAFB; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
          ${hotel.name}<br/>
          ${hotel.address || 'Moshi, Tanzania'}<br/>
          Mobile/WhatsApp: ${hotel.phone || '+255765068295'}<br/>
          Email: ${hotel.email || '—'}<br/>
          <em>${process.env.POWERED_BY || 'Powered by Odessa Lab'}</em>
        </div>
      </div>
    `

    const result = await brevoService.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: `${docLabel} - ${booking.bookingRef}`,
      htmlContent,
      attachments: [{ name: `${type === 'invoice' ? 'Invoice' : 'Folio'}-${booking.bookingRef}.pdf`, content: pdfBuffer }]
    })

    if (!result.success) {
      console.error('[POS Service] Failed to send folio email:', result.error)
      throw ApiError.internal('Imeshindwa kutuma folio kwa email')
    }

    return { success: true, email: recipientEmail }
  }
}

export const posService = new POSService()