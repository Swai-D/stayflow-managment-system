import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns'

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
        .filter(p => p.paidAt && format(new Date(p.paidAt), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, p) => sum + Number(p.amount), 0)
      
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
      
      const occupiedRooms = bookings.filter(b => {
        const bIn = startOfDay(new Date(b.checkIn))
        const bOut = startOfDay(new Date(b.checkOut))
        return currDate >= bIn && currDate < bOut
      }).length

      const rate = roomsCount > 0 ? (occupiedRooms / roomsCount) * 100 : 0
      
      return { date: dayStr, rate: Math.round(rate), count: occupiedRooms }
    })

    return report
  }

  async getDashboardSummary(hotelId: string) {
    const today = startOfDay(new Date())
    const tomorrow = endOfDay(today)

    const [
      checkIns,
      checkOuts,
      roomStats,
      revenueToday
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
      })
    ])

    return {
      checkInsToday: checkIns,
      checkOutsToday: checkOuts,
      roomStats: roomStats.reduce((acc: any, curr) => {
        acc[curr.status] = curr._count
        return acc
      }, {}),
      revenueToday: revenueToday._sum.amount || 0
    }
  }
}

export const reportsService = new ReportsService()
