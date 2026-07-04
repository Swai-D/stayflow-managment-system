import { PrismaClient, BookingStatus, RoomStatus } from '@prisma/client'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns'

const prisma = new PrismaClient()

function formatTZS(amount: number | null | undefined): string {
  const value = amount == null ? 0 : Number(amount)
  return `TZS ${Math.round(value).toLocaleString('en-TZ')}`
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy')
}

export class AiContextService {
  async buildContext(hotelId: string, includeDetails: boolean = false): Promise<string> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, address: true, phone: true, email: true }
    })

    if (!hotel) return 'Hotel information not available.'

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    // ─── Rooms summary ───────────────────────────────
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      select: { id: true, roomNumber: true, status: true, type: true }
    })

    const totalRooms = rooms.length
    const occupiedRooms = rooms.filter(r => r.status === RoomStatus.occupied).length
    const availableRooms = rooms.filter(r => r.status === RoomStatus.available).length
    const dirtyRooms = rooms.filter(r => r.status === RoomStatus.dirty).length
    const maintenanceRooms = rooms.filter(r => r.status === RoomStatus.maintenance).length
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    // ─── Bookings summary ────────────────────────────
    const [totalBookings, monthBookings, todayCheckIns, todayCheckOuts] = await Promise.all([
      prisma.booking.count({ where: { hotelId } }),
      prisma.booking.count({
        where: {
          hotelId,
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      }),
      prisma.booking.count({
        where: {
          hotelId,
          checkIn: { gte: todayStart, lte: todayEnd },
          status: { notIn: [BookingStatus.cancelled, BookingStatus.no_show] }
        }
      }),
      prisma.booking.count({
        where: {
          hotelId,
          checkOut: { gte: todayStart, lte: todayEnd },
          status: { notIn: [BookingStatus.cancelled, BookingStatus.no_show, BookingStatus.checked_out] }
        }
      })
    ])

    // ─── Financials ──────────────────────────────────
    const [monthRevenueAgg, outstandingAgg] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          booking: { hotelId },
          status: 'completed',
          paidAt: { gte: monthStart, lte: monthEnd }
        }
      }),
      prisma.booking.aggregate({
        _sum: { balanceDue: true },
        where: {
          hotelId,
          status: { notIn: [BookingStatus.cancelled, BookingStatus.no_show, BookingStatus.checked_out] }
        }
      })
    ])

    const monthRevenue = Number(monthRevenueAgg._sum.amount || 0)
    const outstandingBalance = Number(outstandingAgg._sum.balanceDue || 0)

    // ─── Recent bookings (last 10) ───────────────────
    let recentBookingsText = ''
    if (includeDetails) {
      const recentBookings = await prisma.booking.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          bookingRef: true,
          status: true,
          checkIn: true,
          checkOut: true,
          totalAmount: true,
          balanceDue: true,
          guest: { select: { fullName: true } },
          room: { select: { roomNumber: true } }
        }
      })

      recentBookingsText = recentBookings.length
        ? '\nRecent Bookings (last 10):\n' +
          recentBookings
            .map(
              b =>
                `- ${b.bookingRef}: ${b.guest.fullName}, Room ${b.room.roomNumber}, ${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}, Status: ${b.status}, Total: ${formatTZS(Number(b.totalAmount))}, Balance: ${formatTZS(Number(b.balanceDue))}`
            )
            .join('\n')
        : '\nRecent Bookings: None'
    }

    // ─── Recent expenses (this month) ────────────────
    let expensesText = ''
    if (includeDetails) {
      const expenses = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          hotelId,
          date: { gte: monthStart, lte: monthEnd }
        }
      })
      const monthExpenses = Number(expenses._sum.amount || 0)
      expensesText = `\nThis Month Expenses: ${formatTZS(monthExpenses)}`
    }

    // ─── Top guests by bookings ──────────────────────
    let topGuestsText = ''
    if (includeDetails) {
      const topGuests = await prisma.guest.findMany({
        where: { bookings: { some: { hotelId } } },
        take: 5,
        select: {
          fullName: true,
          _count: { select: { bookings: { where: { hotelId } } } }
        },
        orderBy: { bookings: { _count: 'desc' } }
      })

      topGuestsText = topGuests.length
        ? '\nTop Guests:\n' + topGuests.map(g => `- ${g.fullName}: ${g._count.bookings} bookings`).join('\n')
        : ''
    }

    // ─── Build context text ──────────────────────────
    const context = `
HOTEL CONTEXT (current as of ${format(today, 'dd/MM/yyyy HH:mm')}):
Hotel Name: ${hotel.name}
Location: ${hotel.address || 'Not set'}
Contact: ${hotel.phone || 'Not set'} | ${hotel.email || 'Not set'}

ROOMS & OCCUPANCY:
- Total Rooms: ${totalRooms}
- Occupied: ${occupiedRooms}
- Available: ${availableRooms}
- Dirty: ${dirtyRooms}
- Maintenance: ${maintenanceRooms}
- Occupancy Rate: ${occupancyRate}%

BOOKINGS:
- Total Bookings (all time): ${totalBookings}
- New Bookings This Month: ${monthBookings}
- Check-ins Today: ${todayCheckIns}
- Check-outs Today: ${todayCheckOuts}

FINANCIALS:
- Revenue This Month: ${formatTZS(monthRevenue)}
- Outstanding Balance (unpaid): ${formatTZS(outstandingBalance)}${expensesText}
${recentBookingsText}
${topGuestsText}

When answering, use the data above and mention specific numbers where relevant. If the user asks about something not in this context, be honest that you don't have that data.
`.trim()

    return context
  }
}

export const aiContextService = new AiContextService()
