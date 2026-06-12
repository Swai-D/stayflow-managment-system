# ⚠️ DESIGN REFERENCE — READ BEFORE WRITING ANY UI CODE
> Design: YowStay Hotel Management Dashboard
> Link  : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Designer: https://dribbble.com/yowdesain
> Rules : White bg, Blue (#2563EB) only accent, Inter font, NO purple, NO gradients
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STAYFLOW — PHASE 1, TASK 4: AVAILABILITY SERVICE + BOOKING CRUD
> Tegemea: Tasks 1, 2, 3 zimekamilika
> Matokeo: Booking engine inafanya kazi — create, read, update, cancel + availability check
> Hii ndiyo moyo wa mfumo — ifanywe vizuri, bulletproof

---

## OVERVIEW

```
1. Backend  : Availability service (overlap detection), Booking CRUD, Ref generator
2. Frontend : Reservations page na live data, New Booking modal (full form)
3. Tests    : Unit tests za availability (CRITICAL — lazima zipite)
4. Verify   : Booking mpya → inaonekana kwenye table → room status inabadilika
```

---

## TASK 4A — Availability Service (CRITICAL)

> Hii ndiyo logic muhimu zaidi kwenye mfumo wote.
> Kosa hapa = double booking = wageni wawili kwenye chumba kimoja.
> Tests LAZIMA zipite kabla ya kuendelea.

### apps/api/src/services/availability.service.ts
```typescript
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
    }).then(bookings => bookings.map(b => b.roomId))

    // Return only available rooms
    return allRooms.filter(room => !bookedRoomIds.includes(room.id))
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
```

---

## TASK 4B — Availability Tests (MUST PASS BEFORE CONTINUING)

### apps/api/src/services/availability.service.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AvailabilityService } from './availability.service'
import { ApiError } from '../utils/ApiError'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    room: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), findMany: vi.fn() }
  }))
}))

const service = new AvailabilityService()

// Helper dates
const d = (str: string) => new Date(str)

describe('AvailabilityService', () => {

  describe('isAvailable', () => {

    it('❌ should throw if checkOut is before checkIn', async () => {
      await expect(service.isAvailable({
        roomId: 'r1',
        checkIn:  d('2026-06-10'),
        checkOut: d('2026-06-08'), // before checkIn!
      })).rejects.toThrow('Tarehe ya kuondoka')
    })

    it('❌ should throw if checkOut equals checkIn', async () => {
      await expect(service.isAvailable({
        roomId: 'r1',
        checkIn:  d('2026-06-10'),
        checkOut: d('2026-06-10'), // same day!
      })).rejects.toThrow()
    })

    it('❌ should return false if room is in maintenance', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'maintenance', type: 'standard', isActive: true
      })

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(false)
    })

    it('❌ should return false if room is blocked', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'blocked', type: 'standard', isActive: true
      })

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(false)
    })

    it('✅ should return true if no overlapping bookings', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mock.booking.findFirst.mockResolvedValue(null) // no overlap

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(true)
    })

    it('❌ should return false if booking overlaps (full overlap)', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mock.booking.findFirst.mockResolvedValue({ id: 'existing-booking' }) // overlap found

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-15')
      })
      expect(result).toBe(false)
    })

    it('✅ should return true if existing booking ends before new one starts', async () => {
      // Existing: Jun 5–10. New: Jun 10–15. Jun 10 checkout = Jun 10 checkin allowed.
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mock.booking.findFirst.mockResolvedValue(null) // no overlap (checkout = checkin is fine)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-15')
      })
      expect(result).toBe(true)
    })

    it('✅ should ignore cancelled bookings when checking availability', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      // findFirst returns null because cancelled bookings are excluded in query
      mock.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(true)
    })

    it('✅ should allow editing existing booking (excludeBookingId)', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      // Returns null because the overlapping booking IS the one being edited (excluded)
      mock.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-15'),
        excludeBookingId: 'booking-being-edited'
      })
      expect(result).toBe(true)
    })

  })

  describe('calculateNights', () => {
    it('should calculate 1 night correctly', () => {
      expect(service.calculateNights(d('2026-06-10'), d('2026-06-11'))).toBe(1)
    })
    it('should calculate 3 nights correctly', () => {
      expect(service.calculateNights(d('2026-06-10'), d('2026-06-13'))).toBe(3)
    })
    it('should calculate 7 nights correctly', () => {
      expect(service.calculateNights(d('2026-06-01'), d('2026-06-08'))).toBe(7)
    })
  })

  describe('calculateRoomTotal', () => {
    it('should calculate total for 2 nights at 80000', () => {
      expect(service.calculateRoomTotal(80000, 2)).toBe(160000)
    })
    it('should calculate total for 7 nights at 75000', () => {
      expect(service.calculateRoomTotal(75000, 7)).toBe(525000)
    })
  })

})
```

```bash
# Run tests — ALL must pass before continuing
cd apps/api && npm run test
# Expected: 14+ tests pass
```

---

## TASK 4C — Booking Service

### apps/api/src/services/bookings.service.ts
```typescript
import { PrismaClient, BookingStatus, BookingSource } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { availabilityService } from './availability.service'
import { generateBookingRef } from '../utils/generateRef'

const prisma = new PrismaClient()

export interface CreateBookingParams {
  hotelId: string
  guestId?: string      // Existing guest
  guestData?: {         // New guest (walk-in)
    fullName: string
    phone: string
    email?: string
    idType?: string
    idNumber?: string
    nationality?: string
  }
  roomId: string
  checkIn: Date
  checkOut: Date
  startTime?: string    // Conference only
  endTime?: string      // Conference only
  adults?: number
  children?: number
  specialRequests?: string
  source: BookingSource
  createdById: string
  addonIds?: { addonId: string; quantity: number }[]
}

export class BookingsService {

  // ─── Create booking ───────────────────────────────────
  async createBooking(params: CreateBookingParams) {
    const {
      hotelId, roomId, checkIn, checkOut, startTime, endTime,
      adults = 1, children = 0, specialRequests, source, createdById,
      addonIds = []
    } = params

    // 1. Get room details
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId, isActive: true }
    })
    if (!room) throw ApiError.notFound('Chumba hakikupatikana')

    // 2. Check availability
    const isConference = room.type === 'conference'
    const available = isConference
      ? await availabilityService.isConferenceAvailable({
          roomId, checkIn, checkOut, startTime, endTime
        })
      : await availabilityService.isAvailable({ roomId, checkIn, checkOut })

    if (!available) {
      throw ApiError.conflict(
        'Chumba hiki hakipatikani kwa tarehe uliyochagua. Tafadhali chagua tarehe nyingine.'
      )
    }

    // 3. Resolve or create guest
    let guestId = params.guestId
    if (!guestId && params.guestData) {
      // Create new guest
      const guest = await prisma.guest.create({
        data: {
          fullName: params.guestData.fullName,
          phone: params.guestData.phone,
          email: params.guestData.email,
          idType: params.guestData.idType as any,
          idNumber: params.guestData.idNumber,
          nationality: params.guestData.nationality,
        }
      })
      guestId = guest.id
    }
    if (!guestId) throw ApiError.badRequest('Taarifa za mgeni zinahitajika')

    // 4. Calculate totals
    const nights = availabilityService.calculateNights(checkIn, checkOut)
    const pricePerNight = Number(room.pricePerNight)

    // Conference: use hourly or daily rate
    let roomTotal: number
    if (isConference && startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
      if (hours >= 8 || nights > 0) {
        roomTotal = pricePerNight * (nights || 1)
      } else {
        const pricePerHour = Number(room.pricePerHour) || pricePerNight / 8
        roomTotal = pricePerHour * hours
      }
    } else {
      roomTotal = pricePerNight * nights
    }

    // 5. Calculate addons total
    let addonsTotal = 0
    const addonDetails: { addonId: string; quantity: number; unitPrice: number; subtotal: number }[] = []

    if (addonIds.length > 0) {
      const addons = await prisma.addonService.findMany({
        where: { id: { in: addonIds.map(a => a.addonId) }, isActive: true }
      })

      for (const req of addonIds) {
        const addon = addons.find(a => a.id === req.addonId)
        if (addon) {
          const unitPrice = Number(addon.price)
          const subtotal = unitPrice * req.quantity
          addonsTotal += subtotal
          addonDetails.push({ addonId: addon.id, quantity: req.quantity, unitPrice, subtotal })
        }
      }
    }

    const totalAmount = roomTotal + addonsTotal
    const bookingRef = await generateBookingRef()

    // 6. Create booking + addons in transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          hotelId,
          guestId: guestId!,
          roomId,
          createdById,
          source,
          status: 'pending',
          checkIn,
          checkOut,
          startTime,
          endTime,
          adults,
          children,
          specialRequests,
          roomTotal,
          addonsTotal,
          totalAmount,
          balanceDue: totalAmount,
          paidAmount: 0,
        },
        include: {
          guest: { select: { id: true, fullName: true, phone: true, email: true } },
          room: { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
        }
      })

      // Create addon records
      if (addonDetails.length > 0) {
        await tx.bookingAddon.createMany({
          data: addonDetails.map(a => ({ ...a, bookingId: newBooking.id }))
        })
      }

      return newBooking
    })

    return booking
  }

  // ─── Get all bookings ─────────────────────────────────
  async getBookings(hotelId: string, filters?: {
    status?: BookingStatus
    search?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  }) {
    const { status, search, dateFrom, dateTo, page = 1, limit = 20 } = filters || {}
    const skip = (page - 1) * limit

    const where: any = {
      hotelId,
      ...(status && { status }),
      ...(dateFrom && dateTo && {
        checkIn: { gte: dateFrom, lte: dateTo }
      }),
      ...(search && {
        OR: [
          { bookingRef: { contains: search, mode: 'insensitive' } },
          { guest: { fullName: { contains: search, mode: 'insensitive' } } },
          { room: { roomNumber: { contains: search, mode: 'insensitive' } } },
        ]
      })
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          guest: { select: { id: true, fullName: true, phone: true, nationality: true } },
          room:  { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
          payments: { select: { id: true, amount: true, status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where })
    ])

    return {
      bookings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  }

  // ─── Get single booking ───────────────────────────────
  async getBooking(id: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id, hotelId },
      include: {
        guest: true,
        room: true,
        createdBy: { select: { id: true, fullName: true } },
        payments: true,
        receipts: true,
        addons: { include: { addon: true } },
      }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')
    return booking
  }

  // ─── Update booking ───────────────────────────────────
  async updateBooking(id: string, hotelId: string, data: Partial<{
    checkIn: Date
    checkOut: Date
    adults: number
    children: number
    specialRequests: string
    internalNotes: string
    status: BookingStatus
  }>) {
    const booking = await prisma.booking.findFirst({ where: { id, hotelId } })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    // If dates are changing, re-check availability
    if (data.checkIn || data.checkOut) {
      const newCheckIn  = data.checkIn  || booking.checkIn
      const newCheckOut = data.checkOut || booking.checkOut

      const available = await availabilityService.isAvailable({
        roomId: booking.roomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        excludeBookingId: id  // Exclude this booking from conflict check
      })
      if (!available) {
        throw ApiError.conflict('Chumba hakipatikani kwa tarehe mpya uliyochagua')
      }
    }

    return prisma.booking.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        guest: { select: { id: true, fullName: true, phone: true } },
        room:  { select: { id: true, roomNumber: true, name: true } },
      }
    })
  }

  // ─── Cancel booking ───────────────────────────────────
  async cancelBooking(id: string, hotelId: string, reason: string, cancelledById: string) {
    const booking = await prisma.booking.findFirst({ where: { id, hotelId } })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    if (booking.status === 'checked_in') {
      throw ApiError.badRequest('Haiwezekani kufuta booking — mgeni ameshaingia')
    }
    if (booking.status === 'cancelled') {
      throw ApiError.badRequest('Booking hii tayari imefutwa')
    }

    return prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'cancelled', cancelReason: reason, updatedAt: new Date() }
      })

      // If room was occupied by this booking, make it available again
      const room = await tx.room.findUnique({ where: { id: booking.roomId } })
      if (room?.status === 'occupied') {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: 'dirty' }  // Needs cleaning after cancellation
        })
      }

      return updated
    })
  }

  // ─── Check in ─────────────────────────────────────────
  async checkIn(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: true }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw ApiError.badRequest(`Haiwezekani kufanya check-in — hali ya booking: ${booking.status}`)
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'checked_in',
          actualCheckIn: new Date(),
          updatedAt: new Date()
        },
        include: {
          guest: { select: { fullName: true, phone: true } },
          room:  { select: { roomNumber: true } }
        }
      })

      // Update room status to occupied
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied', updatedAt: new Date() }
      })

      return updated
    })
  }

  // ─── Check out ────────────────────────────────────────
  async checkOut(bookingId: string, hotelId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: true }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    if (booking.status !== 'checked_in') {
      throw ApiError.badRequest('Haiwezekani kufanya check-out — mgeni hajaingia')
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'checked_out',
          actualCheckOut: new Date(),
          updatedAt: new Date()
        }
      })

      // Update room to dirty — needs cleaning
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'dirty', updatedAt: new Date() }
      })

      // Create housekeeping log
      await tx.housekeepingLog.create({
        data: {
          roomId: booking.roomId,
          status: 'dirty',
          notes: `Checkout: ${booking.bookingRef} — ${new Date().toLocaleString()}`
        }
      })

      return updated
    })
  }

  // ─── Get today's stats ────────────────────────────────
  async getTodayStats(hotelId: string) {
    const today     = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [checkInsToday, checkOutsToday, totalActive, pendingCount] = await Promise.all([
      prisma.booking.count({
        where: { hotelId, checkIn: { gte: today, lt: tomorrow } }
      }),
      prisma.booking.count({
        where: { hotelId, checkOut: { gte: today, lt: tomorrow } }
      }),
      prisma.booking.count({
        where: { hotelId, status: { in: ['confirmed', 'checked_in'] } }
      }),
      prisma.booking.count({
        where: { hotelId, status: 'pending' }
      }),
    ])

    return { checkInsToday, checkOutsToday, totalActive, pendingCount }
  }
}

export const bookingsService = new BookingsService()
```

---

## TASK 4D — Booking Controller & Routes

### apps/api/src/controllers/bookings.controller.ts
```typescript
import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { bookingsService } from '../services/bookings.service'
import { availabilityService } from '../services/availability.service'
import { AuthRequest } from '../middleware/authenticate'

// GET /bookings
export const getBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search, dateFrom, dateTo, page, limit } = req.query
  const result = await bookingsService.getBookings(req.user!.hotelId, {
    status: status as any,
    search: search as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo:   dateTo   ? new Date(dateTo as string)   : undefined,
    page:  page  ? Number(page)  : 1,
    limit: limit ? Number(limit) : 20,
  })
  res.json(new ApiResponse(result.bookings, 'OK', result.meta))
})

// GET /bookings/stats
export const getBookingStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await bookingsService.getTodayStats(req.user!.hotelId)
  res.json(new ApiResponse(stats))
})

// GET /bookings/availability
export const checkAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { checkIn, checkOut } = req.query
  if (!checkIn || !checkOut) throw new Error('checkIn na checkOut zinahitajika')

  const rooms = await availabilityService.getAvailableRooms(
    req.user!.hotelId,
    new Date(checkIn as string),
    new Date(checkOut as string)
  )
  res.json(new ApiResponse(rooms))
})

// GET /bookings/:id
export const getBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.getBooking(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking))
})

// POST /bookings
export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body
  const booking = await bookingsService.createBooking({
    ...body,
    hotelId: req.user!.hotelId,
    createdById: req.user!.id,
    checkIn:  new Date(body.checkIn),
    checkOut: new Date(body.checkOut),
  })
  res.status(201).json(new ApiResponse(booking, 'Booking imeundwa'))
})

// PATCH /bookings/:id
export const updateBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.updateBooking(
    req.params.id, req.user!.hotelId, req.body
  )
  res.json(new ApiResponse(booking, 'Booking imesasishwa'))
})

// DELETE /bookings/:id (soft cancel)
export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const booking = await bookingsService.cancelBooking(
    req.params.id, req.user!.hotelId,
    reason || 'Imefutwa na mfumo', req.user!.id
  )
  res.json(new ApiResponse(booking, 'Booking imefutwa'))
})

// POST /bookings/:id/check-in
export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.checkIn(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking, 'Check-in imefanyika'))
})

// POST /bookings/:id/check-out
export const checkOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.checkOut(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking, 'Check-out imefanyika'))
})
```

### apps/api/src/routes/bookings.routes.ts
```typescript
import { Router } from 'express'
import {
  getBookings, getBooking, createBooking, updateBooking,
  cancelBooking, checkIn, checkOut, checkAvailability, getBookingStats
} from '../controllers/bookings.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const createBookingSchema = z.object({
  roomId:     z.string().uuid(),
  checkIn:    z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  checkOut:   z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  startTime:  z.string().optional(),
  endTime:    z.string().optional(),
  adults:     z.number().min(1).default(1),
  children:   z.number().min(0).default(0),
  source:     z.enum(['online_self', 'staff_entry', 'walk_in']).default('staff_entry'),
  specialRequests: z.string().optional(),
  // Guest — either existing id or new guest data
  guestId:    z.string().uuid().optional(),
  guestData:  z.object({
    fullName:    z.string().min(2),
    phone:       z.string().min(9),
    email:       z.string().email().optional(),
    idType:      z.string().optional(),
    idNumber:    z.string().optional(),
    nationality: z.string().optional(),
  }).optional(),
  addonIds: z.array(z.object({
    addonId:  z.string().uuid(),
    quantity: z.number().min(1),
  })).optional(),
}).refine(data => data.guestId || data.guestData, {
  message: 'Lazima uweke guestId au guestData'
})

const cancelSchema = z.object({
  reason: z.string().optional()
})

router.get('/',            getBookings)
router.get('/stats',       getBookingStats)
router.get('/availability',checkAvailability)
router.get('/:id',         getBooking)
router.post('/',           validate(createBookingSchema), createBooking)
router.patch('/:id',       updateBooking)
router.delete('/:id',      authorize('admin', 'receptionist'), validate(cancelSchema), cancelBooking)
router.post('/:id/check-in',  checkIn)
router.post('/:id/check-out', checkOut)

export default router
```

---

## TASK 4E — Frontend Types & Hook

### apps/web/types/booking.ts
```typescript
export type BookingStatus =
  | 'pending' | 'confirmed' | 'checked_in'
  | 'checked_out' | 'cancelled' | 'no_show' | 'late_checkout'

export type BookingSource = 'online_self' | 'staff_entry' | 'walk_in'

export interface Guest {
  id: string
  fullName: string
  phone: string
  email?: string
  nationality?: string
  idType?: string
  idNumber?: string
}

export interface Booking {
  id: string
  bookingRef: string
  status: BookingStatus
  source: BookingSource
  checkIn: string
  checkOut: string
  startTime?: string
  endTime?: string
  adults: number
  children: number
  roomTotal: number
  addonsTotal: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  specialRequests?: string
  internalNotes?: string
  actualCheckIn?: string
  actualCheckOut?: string
  createdAt: string
  guest: Guest
  room: {
    id: string
    roomNumber: string
    name: string
    type: string
  }
  createdBy?: { id: string; fullName: string }
  payments?: Payment[]
}

export interface Payment {
  id: string
  amount: number
  method: string
  status: string
  paidAt?: string
}

export interface BookingStats {
  checkInsToday: number
  checkOutsToday: number
  totalActive: number
  pendingCount: number
}

export interface CreateBookingPayload {
  roomId: string
  checkIn: string
  checkOut: string
  startTime?: string
  endTime?: string
  adults: number
  children: number
  source: BookingSource
  specialRequests?: string
  guestId?: string
  guestData?: {
    fullName: string
    phone: string
    email?: string
    nationality?: string
    idType?: string
    idNumber?: string
  }
  addonIds?: { addonId: string; quantity: number }[]
}

// ─── UI Helpers ──────────────────────────────────────

export const STATUS_CONFIG: Record<BookingStatus, {
  label: string; labelSw: string; className: string
}> = {
  pending:      { label:'Pending',        labelSw:'Inasubiri',       className:'bg-[#FEF9C3] text-[#854D0E]' },
  confirmed:    { label:'Confirmed',      labelSw:'Imethibitishwa',  className:'bg-[#EFF6FF] text-[#2563EB]' },
  checked_in:   { label:'Checked in',     labelSw:'Amewasili',       className:'bg-[#DBEAFE] text-[#1D4ED8]' },
  checked_out:  { label:'Checked out',    labelSw:'Ameondoka',       className:'bg-[#F3F4F6] text-[#6B7280]' },
  cancelled:    { label:'Cancelled',      labelSw:'Imefutwa',        className:'bg-[#F3F4F6] text-[#6B7280]' },
  no_show:      { label:'No Show',        labelSw:'Hakuja',          className:'bg-[#FEE2E2] text-[#DC2626]' },
  late_checkout:{ label:'Late CO',        labelSw:'CO Marehemu',     className:'bg-[#FEE2E2] text-[#DC2626]' },
}

export const ARRIVING_TODAY_CLASS = 'bg-[#DCFCE7] text-[#166534]'

export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString('en-TZ')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay
  )
}
```

### apps/web/hooks/useBookings.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Booking, BookingStats, CreateBookingPayload } from '@/types/booking'

export function useBookings(filters?: {
  status?: string; search?: string; page?: number
}) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page)   params.append('page', String(filters.page))

  return useQuery<Booking[]>({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await api.get(`/bookings?${params}`)
      return res.data.data
    },
    staleTime: 30_000,
  })
}

export function useBooking(id: string) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useBookingStats() {
  return useQuery<BookingStats>({
    queryKey: ['bookings', 'stats'],
    queryFn: async () => {
      const res = await api.get('/bookings/stats')
      return res.data.data
    },
    refetchInterval: 60_000,
  })
}

export function useAvailableRooms(checkIn: string, checkOut: string) {
  return useQuery({
    queryKey: ['availability', checkIn, checkOut],
    queryFn: async () => {
      const res = await api.get(`/bookings/availability?checkIn=${checkIn}&checkOut=${checkOut}`)
      return res.data.data
    },
    enabled: !!(checkIn && checkOut && checkIn < checkOut),
    staleTime: 60_000,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const res = await api.post('/bookings', payload)
      return res.data.data as Booking
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      const res = await api.patch(`/bookings/${id}`, data)
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.delete(`/bookings/${id}`, { data: { reason } })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-in`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-out`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}
```

---

## TASK 4F — Reservations Page (Live Data)

### apps/web/app/(dashboard)/reservations/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { useBookings, useBookingStats } from '@/hooks/useBookings'
import { Booking, STATUS_CONFIG, ARRIVING_TODAY_CLASS, formatDate, formatTZS } from '@/types/booking'
import NewBookingModal from '@/components/reservations/NewBookingModal'

const TABS = ['All reservation', 'Online reservation', 'Direct reservation']
const SOURCE_MAP = {
  'Online reservation':  'online_self',
  'Direct reservation':  'staff_entry',
}

export default function ReservationsPage() {
  const [activeTab, setActiveTab]           = useState(0)
  const [search, setSearch]                 = useState('')
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const sourceFilter = activeTab > 0
    ? SOURCE_MAP[TABS[activeTab] as keyof typeof SOURCE_MAP]
    : undefined

  const { data: bookings = [], isLoading } = useBookings({
    status: undefined,
    search: search || undefined,
  })

  const { data: stats } = useBookingStats()

  // Filter by source on frontend (simple filter)
  const filtered = bookings.filter(b =>
    !sourceFilter || b.source === sourceFilter
  )

  // Check if arriving today
  const isArrivingToday = (b: Booking) => {
    const today = new Date().toDateString()
    return new Date(b.checkIn).toDateString() === today &&
           (b.status === 'confirmed' || b.status === 'pending')
  }

  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-gray-900">All Reservation</h1>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors"
        >
          <span className="text-lg leading-none">+</span> New booking
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Checkin',   value: stats?.checkInsToday  ?? '—', up: true },
          { label:'Total Checkout',  value: stats?.checkOutsToday ?? '—', up: false },
          { label:'Active Bookings', value: stats?.totalActive    ?? '—', up: true },
          { label:'Pending',         value: stats?.pendingCount   ?? '—', up: false },
        ].map((s, i) => (
          <div key={s.label} className="bg-white rounded-xl px-5 py-4"
               style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-2">{s.label}</p>
            <div className="flex items-center justify-between">
              <span className="text-[28px] font-bold text-gray-900">{s.value}</span>
              <svg viewBox="0 0 64 24" className="w-16 h-6" preserveAspectRatio="none">
                <polyline
                  points={s.up ? "0,20 16,14 32,16 48,8 64,4" : "0,4 16,8 32,6 48,14 64,20"}
                  fill="none"
                  stroke={s.up ? '#2563EB' : '#EF4444'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl" style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>

        {/* Tabs + search */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex gap-1">
            {TABS.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  activeTab === i ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-44">
              <span className="text-gray-400 text-[13px]">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-[13px] outline-none placeholder-gray-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-gray-50 animate-pulse">
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Full name','Booking Ref','Room','Check In','Nights','Guests','Status','Total'].map(h => (
                  <th key={h}
                    className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const arriving = isArrivingToday(b)
                const statusConf = STATUS_CONFIG[b.status]
                const nights = Math.round(
                  (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
                )

                return (
                  <tr key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 text-[13px] font-medium text-gray-900">
                      {b.guest.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-500 font-mono">
                      {b.bookingRef}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600">
                      {b.room.roomNumber}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                      {formatDate(b.checkIn)}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600">{nights}N</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600">
                      {b.adults + b.children} guests
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        arriving ? ARRIVING_TODAY_CLASS : statusConf.className
                      }`}>
                        {arriving ? 'Arriving today' : statusConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">
                      {formatTZS(b.totalAmount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[15px] text-gray-400 mb-2">Hakuna bookings</p>
            <p className="text-[13px] text-gray-300">
              {search ? 'Jaribu maneno mengine ya kutafuta' : 'Bonyeza "+ New Booking" kuunda ya kwanza'}
            </p>
          </div>
        )}
      </div>

      {/* New Booking Modal */}
      {showNewBooking && (
        <NewBookingModal onClose={() => setShowNewBooking(false)} />
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  )
}

// ─── Booking Detail Modal ─────────────────────────────
function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { mutate: checkIn,  isPending: checkingIn }  = useCheckIn()
  const { mutate: checkOut, isPending: checkingOut } = useCheckOut()
  const { mutate: cancel,   isPending: cancelling }  = useCancelBooking()

  function useCheckIn() { return { mutate: (_: string) => {}, isPending: false } }
  function useCheckOut() { return { mutate: (_: string) => {}, isPending: false } }
  function useCancelBooking() { return { mutate: (_: any) => {}, isPending: false } }

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-[520px] overflow-hidden"
           style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[20px] font-bold text-gray-900">{booking.bookingRef}</h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_CONFIG[booking.status].className}`}>
                {STATUS_CONFIG[booking.status].label}
              </span>
            </div>
            <p className="text-[13px] text-gray-500">
              {booking.guest.fullName} · Room {booking.room.roomNumber}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg mt-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Check In',   value: formatDate(booking.checkIn) },
              { label:'Check Out',  value: formatDate(booking.checkOut) },
              { label:'Nights',     value: `${nights} nights` },
              { label:'Guests',     value: `${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}` },
              { label:'Room Total', value: formatTZS(booking.roomTotal) },
              { label:'Balance Due',value: formatTZS(booking.balanceDue) },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
                <p className="text-[13px] font-semibold text-gray-900 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Special requests */}
          {booking.specialRequests && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1">Mahitaji Maalum</p>
              <p className="text-[12px] text-gray-700">{booking.specialRequests}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {booking.status === 'pending' || booking.status === 'confirmed' ? (
              <button
                onClick={() => { checkIn(booking.id); onClose() }}
                className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-bold transition-colors">
                ✓ Check In
              </button>
            ) : null}

            {booking.status === 'checked_in' ? (
              <button
                onClick={() => { checkOut(booking.id); onClose() }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[13px] font-bold transition-colors">
                Check Out
              </button>
            ) : null}

            {['pending','confirmed'].includes(booking.status) && (
              <button
                onClick={() => { cancel({ id: booking.id, reason: 'Imefutwa na staff' }); onClose() }}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-[13px] font-medium hover:bg-red-50 transition-colors">
                Futa
              </button>
            )}

            <button onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors">
              Funga
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## TASK 4G — New Booking Modal

### apps/web/components/reservations/NewBookingModal.tsx
```typescript
'use client'

import { useState } from 'react'
import { useCreateBooking, useAvailableRooms } from '@/hooks/useBookings'
import { CreateBookingPayload } from '@/types/booking'

interface Props { onClose: () => void }

export default function NewBookingModal({ onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [checkIn, setCheckIn]     = useState(today)
  const [checkOut, setCheckOut]   = useState(tomorrow)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [adults, setAdults]       = useState(1)
  const [children, setChildren]   = useState(0)
  const [specialReqs, setSpecialReqs] = useState('')

  // Guest fields
  const [guestName, setGuestName]     = useState('')
  const [guestPhone, setGuestPhone]   = useState('')
  const [guestEmail, setGuestEmail]   = useState('')
  const [guestNat, setGuestNat]       = useState('')

  const { data: availableRooms = [], isLoading: checkingAvail } =
    useAvailableRooms(checkIn, checkOut)

  const { mutate: createBooking, isPending, error } = useCreateBooking()

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  )

  const selectedRoom = availableRooms.find((r: any) => r.id === selectedRoomId)
  const roomTotal = selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0

  const handleSubmit = () => {
    if (!selectedRoomId || !guestName || !guestPhone) return

    const payload: CreateBookingPayload = {
      roomId: selectedRoomId,
      checkIn,
      checkOut,
      adults,
      children,
      source: 'staff_entry',
      specialRequests: specialReqs,
      guestData: {
        fullName: guestName,
        phone: guestPhone,
        email: guestEmail || undefined,
        nationality: guestNat || undefined,
      }
    }

    createBooking(payload, {
      onSuccess: () => onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
           style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">Booking Mpya</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Hatua {step} kati ya 3 — {step===1?'Tarehe & Chumba':step===2?'Taarifa za Mgeni':'Thibitisha'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* STEP 1 — Dates & Room */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Check In</label>
                  <input type="date" value={checkIn}
                    min={today}
                    onChange={e => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Check Out</label>
                  <input type="date" value={checkOut}
                    min={checkIn}
                    onChange={e => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Nights indicator */}
              {nights > 0 && (
                <p className="text-[12px] text-[#2563EB] font-semibold">
                  📅 Usiku {nights} · {checkIn} → {checkOut}
                </p>
              )}

              {/* Available rooms */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-2">
                  Vyumba Vinavyopatikana
                  {checkingAvail && <span className="text-gray-400 font-normal ml-2">Inaangalia...</span>}
                </p>

                {availableRooms.length === 0 && !checkingAvail ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <p className="text-[13px] text-gray-400">Hakuna vyumba vinavyopatikana kwa tarehe hizi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableRooms.map((room: any) => (
                      <label key={room.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedRoomId === room.id
                            ? 'border-[#2563EB] bg-[#EFF6FF]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <input type="radio" name="room"
                          value={room.id}
                          checked={selectedRoomId === room.id}
                          onChange={() => setSelectedRoomId(room.id)}
                          className="w-4 h-4 accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-gray-900">
                              Room {room.roomNumber}
                            </span>
                            <span className="text-[11px] text-gray-500 capitalize">{room.type}</span>
                          </div>
                          <p className="text-[12px] text-gray-500 truncate">{room.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[13px] font-bold text-gray-900">
                            TZS {Number(room.pricePerNight).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-400">/ usiku</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Guests count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Watu Wazima
                  </label>
                  <input type="number" min={1} max={10} value={adults}
                    onChange={e => setAdults(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Watoto
                  </label>
                  <input type="number" min={0} max={10} value={children}
                    onChange={e => setChildren(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — Guest Info */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Jina Kamili <span className="text-red-400">*</span>
                  </label>
                  <input value={guestName} onChange={e => setGuestName(e.target.value)}
                    placeholder="Jina la mgeni"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Simu <span className="text-red-400">*</span>
                  </label>
                  <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Utaifa</label>
                  <input value={guestNat} onChange={e => setGuestNat(e.target.value)}
                    placeholder="Tanzania"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Mahitaji Maalum
                  </label>
                  <textarea value={specialReqs} onChange={e => setSpecialReqs(e.target.value)}
                    placeholder="Kama kuna mahitaji yoyote..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — Confirm */}
          {step === 3 && selectedRoom && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {[
                  { label:'Mgeni',      value: guestName },
                  { label:'Simu',       value: guestPhone },
                  { label:'Chumba',     value: `Room ${selectedRoom.roomNumber} — ${selectedRoom.name}` },
                  { label:'Check In',   value: checkIn },
                  { label:'Check Out',  value: checkOut },
                  { label:'Usiku',      value: nights },
                  { label:'Wageni',     value: `${adults} wazima${children ? `, ${children} watoto` : ''}` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center px-4 py-3 bg-[#EFF6FF] rounded-xl">
                <span className="text-[14px] font-bold text-gray-900">Jumla</span>
                <span className="text-[18px] font-bold text-[#2563EB]">
                  TZS {roomTotal.toLocaleString()}
                </span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <p className="text-[12px] text-red-600">
                    {(error as any)?.response?.data?.error?.message || 'Hitilafu imetokea'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {step > 1 && (
              <button onClick={() => setStep(s => (s - 1) as any)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-50">
                ← Rudi
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => (s + 1) as any)}
                disabled={
                  (step === 1 && (!selectedRoomId || !checkIn || !checkOut)) ||
                  (step === 2 && (!guestName || !guestPhone))
                }
                className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Endelea →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isPending}
                className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60">
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Inaunda booking...
                  </span>
                ) : '✓ Thibitisha Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## TASK 4H — Create Components Folder

```bash
# Run this command kwenye apps/web/
mkdir -p components/reservations
```

---

## CHECKPOINT — Verify Task 4

```bash
# 1. Run ALL tests — must pass
cd apps/api && npm run test
# Expected: 14+ tests pass (including 8 availability tests)

# 2. PowerShell — test booking creation
$token = (Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@g4homez.com","password":"Admin@2026!"}').data.accessToken

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Check availability
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/bookings/availability?checkIn=2026-07-01&checkOut=2026-07-03" `
  -Headers $headers

# Create booking
$body = @{
  roomId    = "<room-id-from-db>"
  checkIn   = "2026-07-01"
  checkOut  = "2026-07-03"
  adults    = 2
  source    = "staff_entry"
  guestData = @{ fullName = "Test Guest"; phone = "+255712345678" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/bookings" `
  -Method POST -Headers $headers -Body $body
```

**UI Verification checklist:**
- [ ] http://localhost:3000/reservations → table inaonyesha bookings kutoka DB (si sample data)
- [ ] Stats cards zinaonyesha takwimu za kweli (checkins today, etc.)
- [ ] "+ New Booking" button → modal inafunguka
- [ ] Step 1: Chagua tarehe → vyumba vinavyopatikana vinaonekana
- [ ] Step 2: Jaza taarifa za mgeni
- [ ] Step 3: Confirm → booking inaundwa
- [ ] Baada ya booking: table inasasishwa (React Query invalidation)
- [ ] Click booking kwenye table → detail modal inafunguka
- [ ] Check In button → status inabadilika kuwa "Checked in"
- [ ] Kujaribu ku-book chumba kilichokwisha bookwa → error "Chumba hakipatikani"
- [ ] **Double booking test**: Book room 111 Jul 1–3, jaribu tena Jul 2–4 → inakataa ✓

---

## KUMBUKA KWA GEMINI/AI AGENT

1. **Availability tests LAZIMA zipite** kabla ya kuendelea — hii ni moyo wa system
2. **Transaction ya prisma** — createBooking na checkIn/checkOut lazima zitumie `prisma.$transaction`
3. **React Query invalidation** — baada ya kila mutation, invalidate `['bookings']` na `['rooms']`
4. **Error messages** — Kiswahili kwa backend errors, zionyeshwe vizuri kwenye modal
5. **Double booking test** — fanya manually kabla ya kuripoti "done"
6. **No sample data** — reservations page lazima itumie live data kutoka API

---

*StayFlow Phase 1 Task 4 — Availability + Booking CRUD*
*Next: Task 5 — Guests CRUD + Guest Search*
