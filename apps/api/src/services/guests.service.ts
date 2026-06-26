import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class GuestsService {
  async getGuests(hotelId: string, search?: string) {
    return prisma.guest.findMany({
      where: {
        OR: search ? [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] : undefined,
        bookings: {
          some: { hotelId }
        }
      },
      orderBy: { fullName: 'asc' }
    })
  }

  async getGuest(id: string, hotelId: string) {
    const guest = await prisma.guest.findFirst({
      where: { 
        id,
        bookings: { some: { hotelId } }
      },
      include: {
        bookings: {
          where: { hotelId },
          include: { room: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    if (!guest) throw ApiError.notFound('Mgeni hakupatikana')
    return guest
  }

  async createGuest(data: {
    fullName: string
    phone: string
    email?: string
    idType?: any
    idNumber?: string
    nationality?: string
    notes?: string
  }) {
    return prisma.guest.create({ data })
  }

  async updateGuest(id: string, data: Partial<{
    fullName: string
    phone: string
    email: string
    idType: any
    idNumber: string
    nationality: string
    notes: string
  }>) {
    return prisma.guest.update({
      where: { id },
      data
    })
  }

  // Get all registered guests from bookings (including company guests, children, etc.)
  async getRegisteredGuests(hotelId: string, search?: string) {
    return prisma.bookingGuest.findMany({
      where: {
        booking: { hotelId },
        ...(search ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { booking: { bookingRef: { contains: search, mode: 'insensitive' } } }
          ]
        } : {})
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingRef: true,
            bookingType: true,
            checkIn: true,
            checkOut: true,
            status: true,
            guest: { select: { fullName: true, email: true } },
            room: { select: { roomNumber: true, type: true } },
            company: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getGuestStats(hotelId: string) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total unique primary guests ever
    const totalPrimaryGuests = await prisma.guest.count({
      where: { bookings: { some: { hotelId } } }
    })

    // Total registered guests ever (includes companions, children, company guests)
    const totalRegisteredGuests = await prisma.bookingGuest.count({
      where: { booking: { hotelId } }
    })

    // Active guests today (checked in and not yet checked out)
    const activeGuestsToday = await prisma.bookingGuest.count({
      where: {
        booking: {
          hotelId,
          status: { in: ['checked_in', 'late_checkout'] },
          checkIn: { lte: now },
          checkOut: { gte: todayStart }
        }
      }
    })

    // New primary guests this month
    const newThisMonth = await prisma.guest.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        bookings: { some: { hotelId } }
      }
    })

    // New primary guests last month
    const newLastMonth = await prisma.guest.count({
      where: {
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        bookings: { some: { hotelId } }
      }
    })

    // Returning guests (primary guests with more than 1 booking)
    const returningGuestsResult = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT g.id
        FROM guests g
        JOIN bookings b ON b."guestId" = g.id
        WHERE b."hotelId" = ${hotelId}
        GROUP BY g.id
        HAVING COUNT(b.id) >= 2
      ) sub
    `
    const returningGuestsCount = Number(returningGuestsResult[0]?.count || 0)

    // Guests by nationality
    const nationalityDistribution = await prisma.$queryRaw<{ nationality: string | null; count: number }[]>`
      SELECT COALESCE(NULLIF(g.nationality, ''), "booking_guests".nationality, 'Unknown') as nationality, COUNT(*) as count
      FROM "booking_guests"
      JOIN bookings ON bookings.id = "booking_guests"."bookingId"
      LEFT JOIN guests g ON g.id = bookings."guestId"
      WHERE bookings."hotelId" = ${hotelId}
      GROUP BY COALESCE(NULLIF(g.nationality, ''), "booking_guests".nationality, 'Unknown')
      ORDER BY count DESC
      LIMIT 8
    `

    // Age category distribution
    const ageDistribution = await prisma.bookingGuest.groupBy({
      by: ['ageCategory'],
      where: { booking: { hotelId } },
      _count: { ageCategory: true }
    })

    // Guests over last 12 months
    const yearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const monthlyTrend = await prisma.$queryRaw<{ month: string; count: number }[]>`
      SELECT TO_CHAR("booking_guests"."createdAt", 'YYYY-MM') as month, COUNT(*) as count
      FROM "booking_guests"
      JOIN bookings ON bookings.id = "booking_guests"."bookingId"
      WHERE bookings."hotelId" = ${hotelId}
        AND "booking_guests"."createdAt" >= ${yearStart}
      GROUP BY TO_CHAR("booking_guests"."createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `

    // Recent guests last 7 days
    const last7Days = new Date(todayStart)
    last7Days.setDate(last7Days.getDate() - 6)
    const dailyTrend = await prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT TO_CHAR("booking_guests"."createdAt", 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM "booking_guests"
      JOIN bookings ON bookings.id = "booking_guests"."bookingId"
      WHERE bookings."hotelId" = ${hotelId}
        AND "booking_guests"."createdAt" >= ${last7Days}
      GROUP BY TO_CHAR("booking_guests"."createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `

    // Bookings by guest type (individual vs company)
    const bookingTypeDistribution = await prisma.booking.groupBy({
      by: ['bookingType'],
      where: { hotelId },
      _count: { bookingType: true }
    })

    return {
      totalPrimaryGuests,
      totalRegisteredGuests,
      activeGuestsToday,
      newThisMonth,
      newLastMonth,
      returningGuestsCount,
      nationalityDistribution: nationalityDistribution.map(d => ({ nationality: d.nationality, count: Number(d.count) })),
      ageDistribution,
      monthlyTrend: monthlyTrend.map(d => ({ month: d.month, count: Number(d.count) })),
      dailyTrend: dailyTrend.map(d => ({ date: d.date, count: Number(d.count) })),
      bookingTypeDistribution
    }
  }
}

export const guestsService = new GuestsService()
