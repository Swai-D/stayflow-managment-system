import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export interface AvailabilityParams {
  roomId: string
  checkIn: Date       // Start of day
  checkOut: Date      // Start of day (exclusive — guest leaves this day)
  excludeBookingId?: string  // For editing existing bookings
  // Conference rooms only:
  startTime?: string  // "09:00"
  endTime?: string    // "17:00"
}

export class AvailabilityService {

  // ─── Core check — returns true if room is free ───────
  async isAvailable(params: AvailabilityParams): Promise<boolean> {
    const { roomId, checkIn, checkOut, excludeBookingId } = params

    // 1. Validate dates
    if (checkOut <= checkIn) {
      throw ApiError.badRequest('Tarehe ya kuondoka lazima iwe baada ya tarehe ya kuwasili')
    }

    // 2. Check room exists and is not blocked/maintenance
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true, type: true, isActive: true }
    })

    if (!room || !room.isActive) {
      throw ApiError.notFound('Chumba hakikupatikana')
    }

    if (room.status === 'maintenance' || room.status === 'blocked') {
      return false
    }

    // 3. Check for overlapping bookings
    // A booking overlaps if: existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn
    const overlapping = await prisma.booking.findFirst({
      where: {
        roomId,
        // Exclude terminal statuses
        status: {
          notIn: ['cancelled', 'no_show', 'checked_out']
        },
        // Overlap condition — DO NOT CHANGE THIS LOGIC
        AND: [
          { checkIn: { lt: checkOut } },   // existing starts before requested ends
          { checkOut: { gt: checkIn } },   // existing ends after requested starts
        ],
        // Exclude the booking being edited
        ...(excludeBookingId && { id: { not: excludeBookingId } })
      }
    })

    return !overlapping
  }

  // ─── Check with conference room time overlap ──────────
  async isConferenceAvailable(params: AvailabilityParams): Promise<boolean> {
    const { roomId, checkIn, checkOut, startTime, endTime, excludeBookingId } = params

    if (!startTime || !endTime) {
      throw ApiError.badRequest('Wakati wa kuanza na kumaliza unahitajika kwa ukumbi wa mikutano')
    }

    // First check date overlap
    const dateAvailable = await this.isAvailable(params)
    if (!dateAvailable) return false

    // For same-day conference bookings, also check time overlap
    const checkInDate = checkIn.toISOString().split('T')[0]
    const checkOutDate = checkOut.toISOString().split('T')[0]

    if (checkInDate === checkOutDate) {
      // Same day — check time overlap
      const overlapping = await prisma.booking.findFirst({
        where: {
          roomId,
          status: { notIn: ['cancelled', 'no_show', 'checked_out'] },
          AND: [
            { checkIn: { gte: checkIn } },
            { checkIn: { lt: checkOut } },
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
          ...(excludeBookingId && { id: { not: excludeBookingId } })
        }
      })
      return !overlapping
    }

    return true
  }

  // ─── Get available rooms for date range ───────────────
  async getAvailableRooms(hotelId: string, checkIn: Date, checkOut: Date) {
    if (checkOut <= checkIn) {
      throw ApiError.badRequest('Tarehe za booking si sahihi')
    }

    // Get all rooms for this hotel
    const allRooms = await prisma.room.findMany({
      where: {
        hotelId,
        isActive: true,
        status: { notIn: ['maintenance', 'blocked'] }
      },
      select: { id: true, roomNumber: true, name: true, type: true,
                pricePerNight: true, capacity: true, amenities: true }
    })

    // Find rooms with overlapping bookings
    const bookedRoomIds = await prisma.booking.findMany({
      where: {
        room: { hotelId },
        status: { notIn: ['cancelled', 'no_show', 'checked_out'] },
        AND: [
          { checkIn: { lt: checkOut } },
          { checkOut: { gt: checkIn } },
        ]
      },
      select: { roomId: true }
    }).then((bookings: { roomId: string }[]) => bookings.map((b: { roomId: string }) => b.roomId))

    // Return only available rooms
    return allRooms.filter((room: { id: string }) => !bookedRoomIds.includes(room.id))
  }

  // ─── Calculate nights ─────────────────────────────────
  calculateNights(checkIn: Date, checkOut: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24
    return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay)
  }

  // ─── Calculate room total ─────────────────────────────
  calculateRoomTotal(pricePerNight: number, nights: number): number {
    return pricePerNight * nights
  }
}

export const availabilityService = new AvailabilityService()
