import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { startOfDay, subDays, endOfDay } from 'date-fns'
import { notificationService } from '../services/notification.service'
import { checkLowStockAlerts } from '../services/alerts.service'

const prisma = new PrismaClient()

// Run every day at 07:00 EAT (04:00 UTC)
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

  // 2. Auto-checkout overdue bookings
  cron.schedule('0 11 * * *', async () => {
    console.log('[Job] Running auto-checkout for overdue bookings...')
    const today = startOfDay(new Date())

    await prisma.booking.updateMany({
      where: {
        checkOut: { lt: today },
        status: 'checked_in'
      },
      data: { status: 'late_checkout' }
    })
  })

  // 3. Send review links for yesterday's check-outs
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
}
