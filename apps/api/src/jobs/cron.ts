import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { startOfDay, subDays, endOfDay } from 'date-fns'
import { notificationService } from '../services/notification.service'
import { checkLowStockAlerts } from '../services/alerts.service'
import { advisorService } from '../services/advisor.service'
import { bookingsService } from '../services/bookings.service'
import { invoicesService } from '../services/invoices.service'
import { getSystemHotelId } from '../utils/systemHotel'

const prisma = new PrismaClient()

// Run every day at 05:00 EAT (02:00 UTC)
export const initJobs = () => {
  console.log('⏰ Initializing background jobs...')

  // 1. Send reminders for tomorrow's check-ins
  cron.schedule('0 7 * * *', async () => {
    console.log('[Job] Running check-in reminders...')
    const tomorrow = startOfDay(new Date(Date.now() + 86400000))
    const endTomorrow = endOfDay(tomorrow)

    const bookings = await prisma.booking.findMany({
      where: {
        checkIn: { gte: tomorrow, lte: endTomorrow },
        status: 'confirmed'
      },
      include: { guest: true, hotel: true }
    })

    for (const b of bookings) {
      await notificationService.notify({
        bookingId: b.id,
        type: 'check_in_reminder',
        channel: 'both',
        recipientEmail: b.guest.email || undefined,
        recipientPhone: b.guest.phone,
        data: { bookingRef: b.bookingRef, hotelName: b.hotel.name }
      })
    }
  })

  // Low stock alerts
  cron.schedule('0 8 * * *', async () => {
    console.log('[Job] Checking low stock alerts...')
    await checkLowStockAlerts()
  })

  // 2. Auto-checkout guests at 05:00 EAT
  //    - Checks out all checked_in bookings whose checkOut date is today
  //    - Creates invoice record (paid if balance cleared, sent if balance due)
  //    - Marks room as dirty and creates housekeeping log
  cron.schedule('0 2 * * *', async () => {
    console.log('[Job] Running 05:00 EAT auto-checkout...')
    const today = startOfDay(new Date())
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    const hotels = await prisma.hotel.findMany({ where: { isActive: true } })

    for (const hotel of hotels) {
      const dueToday = await prisma.booking.findMany({
        where: {
          hotelId: hotel.id,
          status: 'checked_in',
          checkOut: { gte: today, lt: tomorrow }
        },
        include: { guest: true, room: true, company: true }
      })

      for (const booking of dueToday) {
        try {
          const checkedOut = await bookingsService.checkOut(booking.id, hotel.id)

          // Create or update invoice
          let invoice = await prisma.invoice.findFirst({
            where: {
              bookingId: booking.id,
              type: booking.bookingType === 'company' ? 'company' : 'individual',
              status: { not: 'cancelled' }
            }
          })

          const balanceDue = Number(booking.balanceDue)
          const totalAmount = Number(booking.totalAmount)
          const paidAmount = Number(booking.paidAmount)

          if (!invoice) {
            invoice = await invoicesService.createInvoice(hotel.id, {
              type: booking.bookingType === 'company' ? 'company' : 'individual',
              bookingId: booking.id,
              companyId: booking.companyId || undefined,
              amount: totalAmount,
              totalAmount,
              notes: `Auto-generated invoice on check-out for ${booking.bookingRef}`
            })
          }

          if (balanceDue <= 0) {
            await invoicesService.updateInvoice(invoice.id, hotel.id, {
              status: 'paid',
              paidAmount: totalAmount,
              paidAt: new Date()
            })
          } else {
            await invoicesService.updateInvoice(invoice.id, hotel.id, {
              status: 'sent',
              paidAmount,
              notes: `Balance due: TZS ${balanceDue.toLocaleString()}`
            })
          }

          console.log(`[AutoCheckout] ${booking.bookingRef} checked out. Invoice: ${invoice.invoiceNumber}, Balance: ${balanceDue}`)
        } catch (err: any) {
          console.error(`[AutoCheckout] Failed for ${booking.bookingRef}:`, err.message)
        }
      }
    }
  })

  // 3. Flag overdue checkouts as late_checkout (after auto-checkout grace period)
  cron.schedule('0 11 * * *', async () => {
    console.log('[Job] Running late-checkout flagging...')
    const today = startOfDay(new Date())

    await prisma.booking.updateMany({
      where: {
        checkOut: { lt: today },
        status: 'checked_in'
      },
      data: { status: 'late_checkout' }
    })
  })

  // 4. Send review links for yesterday's check-outs
  cron.schedule('0 10 * * *', async () => {
     console.log('[Job] Running review requests...')
     const yesterday = startOfDay(subDays(new Date(), 1))
     const endYesterday = endOfDay(yesterday)

     const bookings = await prisma.booking.findMany({
       where: {
         actualCheckOut: { gte: yesterday, lte: endYesterday },
         status: 'checked_out'
       },
       include: { guest: true, hotel: true }
     })

     for (const b of bookings) {
        await notificationService.notify({
          bookingId: b.id,
          type: 'review_request',
          channel: 'email',
          recipientEmail: b.guest.email || undefined,
          data: { hotelName: b.hotel.name, reviewUrl: `https://stayflow.app/review/${b.id}` }
        })
     }
  })

  // 5. Buffalo Business Advisor — background LLM advice generation
  cron.schedule('0 7 * * *', async () => {
    console.log('[Job] Generating morning DAILY business advice...')
    await advisorService.generateAdviceForAllHotels('DAILY')
  })

  cron.schedule('0 12 * * *', async () => {
    console.log('[Job] Generating midday DAILY business advice...')
    await advisorService.generateAdviceForAllHotels('DAILY')
  })

  cron.schedule('0 18 * * *', async () => {
    console.log('[Job] Generating evening DAILY business advice...')
    await advisorService.generateAdviceForAllHotels('DAILY')
  })

  cron.schedule('0 7 * * 1', async () => {
    console.log('[Job] Generating WEEKLY business advice...')
    await advisorService.generateAdviceForAllHotels('WEEKLY')
  })

  cron.schedule('0 7 1 * *', async () => {
    console.log('[Job] Generating MONTHLY business advice...')
    await advisorService.generateAdviceForAllHotels('MONTHLY')
  })
}
