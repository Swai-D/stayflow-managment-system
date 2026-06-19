import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns'

const prisma = new PrismaClient()

export class ReportsService {
  async getRevenueReport(hotelId: string, days: number = 30) {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    const payments = await prisma.payment.findMany({
      where: {
        booking: { hotelId },
        status: 'completed',
        paidAt: { gte: startDate, lte: endDate }
      },
      select: { amount: true, paidAt: true }
    })

    const interval = eachDayOfInterval({ start: startDate, end: endDate })
    const report = interval.map(date => {
      const dayStr = format(date, 'yyyy-MM-dd')
      const dayTotal = payments
        .filter((p: { amount: any; paidAt: Date | null }) => p.paidAt && format(new Date(p.paidAt), 'yyyy-MM-dd') === dayStr)
        .reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0)
      
      return { date: dayStr, total: dayTotal }
    })

    return report
  }

  async getOccupancyReport(hotelId: string, days: number = 30) {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    const [roomsCount, bookings] = await Promise.all([
      prisma.room.count({ where: { hotelId, isActive: true } }),
      prisma.booking.findMany({
        where: {
          hotelId,
          status: { in: ['confirmed', 'checked_in', 'checked_out'] },
          OR: [
            { checkIn: { lte: endDate }, checkOut: { gte: startDate } }
          ]
        },
        select: { checkIn: true, checkOut: true }
      })
    ])

    const interval = eachDayOfInterval({ start: startDate, end: endDate })
    const report = interval.map(date => {
      const dayStr = format(date, 'yyyy-MM-dd')
      const currDate = startOfDay(date)
      
      const occupiedRooms = bookings.filter((b: { checkIn: Date; checkOut: Date }) => {
        const bIn = startOfDay(new Date(b.checkIn))
        const bOut = startOfDay(new Date(b.checkOut))
        return currDate >= bIn && currDate < bOut
      }).length

      const rate = roomsCount > 0 ? (occupiedRooms / roomsCount) * 100 : 0
      
      return { date: dayStr, rate: Math.round(rate), count: occupiedRooms }
    })

    return report
  }

  async getFinancialReport(hotelId: string, days: number = 30) {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    const [revenue, expenses, roomsCount, roomNightsSold] = await Promise.all([
      // Total Revenue
      prisma.payment.aggregate({
        where: {
          booking: { hotelId },
          status: 'completed',
          paidAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      // Total Expenses
      prisma.expense.aggregate({
        where: {
          hotelId,
          date: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      // Total active rooms
      prisma.room.count({ where: { hotelId, isActive: true } }),
      // Room nights sold (to calculate ADR)
      prisma.booking.findMany({
        where: {
          hotelId,
          status: { in: ['confirmed', 'checked_in', 'checked_out'] },
          checkIn: { lte: endDate },
          checkOut: { gte: startDate }
        },
        select: { checkIn: true, checkOut: true }
      })
    ])

    const totalRevenue = Number(revenue._sum.amount || 0)
    const totalExpenses = Number(expenses._sum.amount || 0)
    const netProfit = totalRevenue - totalExpenses
    
    // Calculate actual occupied nights in this period
    let totalNightsSold = 0
    roomNightsSold.forEach(b => {
      const start = b.checkIn > startDate ? b.checkIn : startDate
      const end = b.checkOut < endDate ? b.checkOut : endDate
      const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      totalNightsSold += nights
    })

    const totalAvailableNights = roomsCount * days
    const adr = totalNightsSold > 0 ? totalRevenue / totalNightsSold : 0
    const revpar = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      adr,
      revpar,
      expenseRatio,
      totalNightsSold,
      periodDays: days
    }
  }

  async getDashboardSummary(hotelId: string) {
    const today = startOfDay(new Date())
    const tomorrow = endOfDay(today)

    const [
      checkIns,
      checkOuts,
      roomStats,
      revenueToday,
      onlineReservations,
      directReservations,
      totalActive
    ] = await Promise.all([
      prisma.booking.count({ where: { hotelId, checkIn: { gte: today, lte: tomorrow } } }),
      prisma.booking.count({ where: { hotelId, checkOut: { gte: today, lte: tomorrow } } }),
      prisma.room.groupBy({
        by: ['status'],
        where: { hotelId, isActive: true },
        _count: true
      }),
      prisma.payment.aggregate({
        where: { 
          booking: { hotelId }, 
          status: 'completed',
          paidAt: { gte: today, lte: tomorrow }
        },
        _sum: { amount: true }
      }),
      prisma.booking.count({ 
        where: { 
          hotelId, 
          source: 'online_self',
          status: { not: 'cancelled' }
        } 
      }),
      prisma.booking.count({ 
        where: { 
          hotelId, 
          source: { in: ['staff_entry', 'walk_in'] },
          status: { not: 'cancelled' }
        } 
      }),
      prisma.booking.count({
        where: { hotelId, status: { in: ['confirmed', 'checked_in'] } }
      })
    ])

    return {
      checkInsToday: checkIns,
      checkOutsToday: checkOuts,
      roomStats: roomStats.reduce((acc: any, curr: { status: string; _count: number }) => {
        acc[curr.status] = curr._count
        return acc
      }, {}),
      revenueToday: Number(revenueToday._sum.amount || 0),
      onlineReservations,
      directReservations,
      totalActive
    }
  }

  /**
   * Calendar view data: all active rooms plus every non-cancelled booking
   * overlapping the requested year. The frontend computes daily occupancy
   * from these two arrays, keeping the payload small (max ~365 days × 30 rooms
   * would be huge; this way we only send rooms + bookings).
   */
  async getCalendarReport(hotelId: string, year?: number) {
    const targetYear = year || new Date().getFullYear()
    const startDate = startOfYear(new Date(targetYear, 0, 1))
    const endDate = endOfYear(new Date(targetYear, 0, 1))

    const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({
        where: { hotelId, isActive: true },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        select: {
          id: true,
          roomNumber: true,
          name: true,
          type: true,
          floor: true,
          pricePerNight: true,
          capacity: true,
          beds: true
        }
      }),
      prisma.booking.findMany({
        where: {
          hotelId,
          status: { not: 'cancelled' },
          OR: [
            { checkIn: { gte: startDate, lte: endDate } },
            { checkOut: { gte: startDate, lte: endDate } },
            { AND: [{ checkIn: { lte: startDate } }, { checkOut: { gte: endDate } }] }
          ]
        },
        select: {
          id: true,
          bookingRef: true,
          roomId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          adults: true,
          children: true,
          guest: { select: { fullName: true, phone: true, nationality: true, idType: true, idNumber: true } },
          room: { select: { roomNumber: true } }
        }
      })
    ])

    return {
      year: targetYear,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      rooms,
      bookings: bookings.map(b => ({
        id: b.id,
        bookingRef: b.bookingRef,
        roomId: b.roomId,
        roomNumber: b.room?.roomNumber,
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        status: b.status,
        adults: b.adults,
        children: b.children,
        guestName: b.guest.fullName,
        guestPhone: b.guest.phone,
        nationality: b.guest.nationality,
        idType: b.guest.idType,
        idNumber: b.guest.idNumber
      }))
    }
  }
}

export const reportsService = new ReportsService()
