import { PrismaClient, BookingStatus, BookingSource, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { availabilityService } from './availability.service'
import { generateBookingRef } from '../utils/generateRef'
import { auditService } from './audit.service'

const prisma = new PrismaClient()

export interface CreateBookingParams {
  hotelId: string
  guestId?: string      // Existing guest
  guestData?: {
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

    let addonsTotal = 0
    const addonDetails: { addonId: string; quantity: number; unitPrice: number; subtotal: number }[] = []

    if (addonIds.length > 0) {
      const addons = await prisma.addonService.findMany({
        where: { id: { in: addonIds.map((a: { addonId: string }) => a.addonId) }, isActive: true }
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

    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          guest: { select: { id: true, fullName: true, phone: true, email: true, idType: true, idNumber: true, nationality: true } },
          room: { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
        }
      })

      if (addonDetails.length > 0) {
        await tx.bookingAddon.createMany({
          data: addonDetails.map(a => ({ ...a, bookingId: newBooking.id }))
        })
      }

      await auditService.logBookingCreated(createdById, newBooking.id, bookingRef)

      return newBooking
    })

    return booking
  }

  // ─── Get all bookings ─────────────────────────────────
  async getBookings(hotelId: string, filters?: {
    status?: BookingStatus
    source?: BookingSource | 'direct'
    search?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  }) {
    const { status, source, search, dateFrom, dateTo, page = 1, limit = 20 } = filters || {}
    const skip = (page - 1) * limit

    const where: any = {
      hotelId,
      ...(status && { status }),
      ...(source && { 
        source: source === 'direct' ? { in: ['staff_entry', 'walk_in'] } : source 
      }),
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
          guest: { select: { id: true, fullName: true, phone: true, nationality: true, idType: true, idNumber: true } },
          room:  { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
          payments: { select: { id: true, amount: true, status: true, method: true } },
          receipts: { select: { id: true, pdfUrl: true, receiptNumber: true } },
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

    if (data.checkIn || data.checkOut) {
      const newCheckIn = data.checkIn || booking.checkIn
      const newCheckOut = data.checkOut || booking.checkOut

      const available = await availabilityService.isAvailable({
        roomId: booking.roomId,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        excludeBookingId: id
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

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'cancelled', cancelReason: reason, updatedAt: new Date() }
      })

      const room = await tx.room.findUnique({ where: { id: booking.roomId } })
      if (room?.status === 'occupied') {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: 'dirty' }
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

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied', updatedAt: new Date() }
      })

      await auditService.log({
        userId: booking.createdById,
        action: 'booking.check_in',
        entity: 'booking',
        entityId: bookingId
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

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'checked_out',
          actualCheckOut: new Date(),
          updatedAt: new Date()
        }
      })

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'dirty', updatedAt: new Date() }
      })

      await tx.housekeepingLog.create({
        data: {
          roomId: booking.roomId,
          status: 'dirty',
          notes: `Checkout: ${booking.bookingRef} — ${new Date().toLocaleString()}`
        }
      })

      await auditService.log({
        userId: booking.createdById,
        action: 'booking.check_out',
        entity: 'booking',
        entityId: bookingId
      })

      return updated
    })
  }

  // ─── Get today's stats ────────────────────────────────
  async getTodayStats(hotelId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    const [
      checkInsToday, 
      checkOutsToday, 
      totalActive, 
      pendingCount,
      allCount,
      onlineCount,
      directCount
    ] = await Promise.all([
      prisma.booking.count({
        where: { hotelId, checkIn: { gte: today, lt: tomorrow } }
      }),
      prisma.booking.count({
        where: { hotelId, checkOut: { gte: today, lt: tomorrow } }
      }),
      prisma.booking.count({
        where: { hotelId, status: { in: ['confirmed', 'checked_in'] } } }
      ),
      prisma.booking.count({
        where: { hotelId, status: 'pending' }
      }),
      prisma.booking.count({
        where: { hotelId, status: { not: 'cancelled' } }
      }),
      prisma.booking.count({
        where: { hotelId, source: 'online_self', status: { not: 'cancelled' } }
      }),
      prisma.booking.count({
        where: { hotelId, source: { in: ['staff_entry', 'walk_in'] }, status: { not: 'cancelled' } }
      }),
    ])

    return { 
      checkInsToday, 
      checkOutsToday, 
      totalActive, 
      pendingCount,
      allCount,
      onlineCount,
      directCount
    }
  }
}

export const bookingsService = new BookingsService()
