import { PrismaClient, BookingStatus, BookingSource, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { availabilityService } from './availability.service'
import { generateBookingRef, generateInvoiceNumber } from '../utils/generateRef'
import { auditService } from './audit.service'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface CreateBookingParams {
  hotelId: string
  guestId?: string      // Existing guest
  guestData?: {
    fullName: string
    phone: string
    email: string
    idType?: string
    idNumber?: string
    nationality?: string
  }
  guests?: {
    fullName: string
    phone?: string
    email?: string
    idType?: string
    idNumber?: string
    nationality?: string
    ageCategory: 'adult' | 'child'
  }[]
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
  bookingType?: 'individual' | 'company'
  companyId?: string
  companyData?: {
    name: string
    email?: string
    phone?: string
    address?: string
    tinNumber?: string
    contactPerson?: string
    notes?: string
  }
}

export class BookingsService {

  // ─── Create booking ───────────────────────────────────
  async createBooking(params: CreateBookingParams) {
    const {
      hotelId, roomId, checkIn, checkOut, startTime, endTime,
      specialRequests, source, createdById,
      addonIds = [],
      bookingType = 'individual'
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

    // 3. Resolve or create primary guest
    let guestId = params.guestId
    let guestList = params.guests && params.guests.length > 0 ? params.guests : undefined

    if (guestList) {
      const primary = guestList[0]
      const email = primary.email?.trim()
      if (!email) {
        throw ApiError.badRequest('Email ya mgeni mkuu inahitajika kwa ajili ya invoice na guest portal.')
      }
      const guest = await prisma.guest.create({
        data: {
          fullName: primary.fullName,
          phone: primary.phone || '',
          email,
          idType: primary.idType as any,
          idNumber: primary.idNumber,
          nationality: primary.nationality,
        }
      })
      guestId = guest.id
    } else if (!guestId && params.guestData) {
      const email = params.guestData.email?.trim()
      if (!email) {
        throw ApiError.badRequest('Email ya mgeni inahitajika kwa ajili ya invoice na guest portal.')
      }
      const guest = await prisma.guest.create({
        data: {
          fullName: params.guestData.fullName,
          phone: params.guestData.phone,
          email,
          idType: params.guestData.idType as any,
          idNumber: params.guestData.idNumber,
          nationality: params.guestData.nationality,
        }
      })
      guestId = guest.id
    }
    if (!guestId) throw ApiError.badRequest('Taarifa za mgeni zinahitajika')

    // 3b. Resolve or create company (for company bookings)
    let companyId: string | undefined = params.companyId
    if (bookingType === 'company') {
      if (params.companyData && !companyId) {
        const existingCompany = await prisma.company.findFirst({
          where: { hotelId, name: { equals: params.companyData.name, mode: 'insensitive' }, isActive: true }
        })
        if (existingCompany) {
          companyId = existingCompany.id
        } else {
          const company = await prisma.company.create({
            data: { ...params.companyData, hotelId }
          })
          companyId = company.id
        }
      }
      if (!companyId) throw ApiError.badRequest('Kampuni inahitajika kwa ajili ya company booking')
      if (!guestList || guestList.length === 0) {
        throw ApiError.badRequest('Tafadhali sajili angalau mgeni mmoja kwa ajili ya company booking')
      }
    }

    // Derive adults / children counts from guest list or legacy params
    const adults = guestList
      ? guestList.filter(g => g.ageCategory === 'adult').length
      : (params.adults ?? 1)
    const children = guestList
      ? guestList.filter(g => g.ageCategory === 'child').length
      : (params.children ?? 0)

    // Validate room capacity (non-conference rooms)
    if (!isConference && room.capacity && adults + children > room.capacity) {
      throw ApiError.badRequest(`Jumla ya wageni (${adults + children}) imeshinda uwezo wa chumba (${room.capacity})`)
    }

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
          companyId: companyId || null,
          roomId,
          createdById,
          source,
          status: 'pending',
          bookingType,
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
          company: { select: { id: true, name: true, phone: true, email: true } },
          room: { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
        }
      })

      // Create detailed guest list if provided
      if (guestList && guestList.length > 0) {
        await tx.bookingGuest.createMany({
          data: guestList.map((g, idx) => ({
            bookingId: newBooking.id,
            fullName: g.fullName,
            phone: g.phone || null,
            email: g.email || null,
            nationality: g.nationality || null,
            idType: g.idType || null,
            idNumber: g.idNumber || null,
            ageCategory: g.ageCategory,
            isPrimary: idx === 0
          }))
        })
      }

      if (addonDetails.length > 0) {
        await tx.bookingAddon.createMany({
          data: addonDetails.map(a => ({ ...a, bookingId: newBooking.id }))
        })
      }

      await auditService.logBookingCreated(createdById, newBooking.id, bookingRef)

      return newBooking
    })

    // Fetch full booking with registered guests
    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        guest: { select: { id: true, fullName: true, phone: true, email: true, idType: true, idNumber: true, nationality: true } },
        company: { select: { id: true, name: true, phone: true, email: true } },
        room: { select: { id: true, roomNumber: true, name: true, type: true } },
        createdBy: { select: { id: true, fullName: true } },
        guests: true,
        payments: { select: { id: true, amount: true, status: true, method: true } }
      }
    })

    return fullBooking!
  }

  // ─── Get all bookings ─────────────────────────────────
  async getBookings(hotelId: string, filters?: {
    status?: BookingStatus
    source?: BookingSource | 'direct'
    bookingType?: 'individual' | 'company'
    search?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  }) {
    const { status, source, bookingType, search, dateFrom, dateTo, page = 1, limit = 20 } = filters || {}
    const skip = (page - 1) * limit

    const where: any = {
      hotelId,
      ...(status && { status }),
      ...(source && { 
        source: source === 'direct' ? { in: ['staff_entry', 'walk_in'] } : source 
      }),
      ...(bookingType && { bookingType }),
      ...(dateFrom && dateTo && {
        checkIn: { gte: dateFrom, lte: dateTo }
      }),
      ...(search && {
        OR: [
          { bookingRef: { contains: search, mode: 'insensitive' } },
          { guest: { fullName: { contains: search, mode: 'insensitive' } } },
          { company: { name: { contains: search, mode: 'insensitive' } } },
          { room: { roomNumber: { contains: search, mode: 'insensitive' } } },
        ]
      })
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          guest: { select: { id: true, fullName: true, phone: true, nationality: true, idType: true, idNumber: true } },
          company: { select: { id: true, name: true, phone: true, email: true } },
          room:  { select: { id: true, roomNumber: true, name: true, type: true } },
          createdBy: { select: { id: true, fullName: true } },
          payments: { select: { id: true, amount: true, status: true, method: true } },
          receipts: { select: { id: true, pdfUrl: true, receiptNumber: true } },
          guests: true,
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
        company: true,
        room: true,
        createdBy: { select: { id: true, fullName: true } },
        payments: true,
        receipts: true,
        addons: { include: { addon: true } },
        guests: true,
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
      include: { room: true, guest: true }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw ApiError.badRequest(`Haiwezekani kufanya check-in — hali ya booking: ${booking.status}`)
    }

    if (!booking.guest.email) {
      throw ApiError.badRequest('Mgeni hana email — inahitajika kwa ajili ya guest portal.')
    }

    const guestEmail = booking.guest.email
    const guestPhone = booking.guest.phone || undefined

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'checked_in',
          actualCheckIn: new Date(),
          updatedAt: new Date()
        },
        include: {
          guest: { select: { fullName: true, phone: true, email: true } },
          room:  { select: { roomNumber: true } }
        }
      })

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied', updatedAt: new Date() }
      })

      // Generate/refresh room QR login token
      const qrToken = crypto.randomBytes(32).toString('hex')
      const qrExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await tx.room.update({
        where: { id: booking.roomId },
        data: {
          qrCodeToken: qrToken,
          qrCodeExpiresAt: qrExpiresAt
        }
      })

      // Create or update guest portal account for frictionless access
      const [firstName, ...rest] = booking.guest.fullName.split(' ')
      const lastName = rest.join(' ') || ''

      const existingAccount = await tx.guestAccount.findUnique({
        where: { email: guestEmail }
      })

      if (existingAccount) {
        await tx.guestAccount.update({
          where: { id: existingAccount.id },
          data: {
            firstName: existingAccount.firstName || firstName,
            lastName: existingAccount.lastName || lastName,
            phone: existingAccount.phone || guestPhone,
            linkedBookingId: booking.id,
            roomId: booking.roomId,
            status: existingAccount.status === 'PENDING_ACTIVATION' ? 'ACTIVE' : existingAccount.status,
            updatedAt: new Date()
          }
        })
      } else {
        await tx.guestAccount.create({
          data: {
            email: guestEmail,
            firstName,
            lastName,
            phone: guestPhone,
            linkedBookingId: booking.id,
            roomId: booking.roomId,
            status: 'ACTIVE'
          }
        })
      }

      // Create invoice immediately on check-in with payment status matching booking
      const totalAmount = Number(booking.totalAmount)
      const paidAmount = Number(booking.paidAmount)
      const balanceDue = Number(booking.balanceDue)
      const invoiceType = booking.bookingType === 'company' ? 'company' : 'individual'

      const invoiceData: any = {
        hotelId,
        invoiceNumber: await generateInvoiceNumber(),
        type: invoiceType,
        amount: balanceDue,
        taxAmount: 0,
        totalAmount,
        paidAmount,
        status: paidAmount >= totalAmount ? 'paid' : ('draft' as any),
        dueDate: booking.checkOut,
        notes: `Invoice generated on check-in for booking ${booking.bookingRef}`
      }

      if (invoiceType === 'company') {
        invoiceData.companyId = booking.companyId
      } else {
        invoiceData.bookingId = booking.id
      }

      const invoice = await tx.invoice.create({ data: invoiceData })

      if (invoiceType === 'company' && booking.companyId) {
        await tx.invoiceBooking.create({
          data: { invoiceId: invoice.id, bookingId: booking.id }
        })
      }

      await auditService.log({
        userId: booking.createdById,
        action: 'booking.check_in',
        entity: 'booking',
        entityId: bookingId
      })

      return { ...updated, qrToken, invoice }
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

  // ─── Extend stay ──────────────────────────────────────
  async extendStay(bookingId: string, hotelId: string, extraNights: number, reason?: string) {
    if (!extraNights || extraNights < 1) {
      throw ApiError.badRequest('Idadi ya usiku wa ziada inahitajika (angalau 1)')
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: { room: true, guest: true, company: true }
    })
    if (!booking) throw ApiError.notFound('Booking haikupatikana')

    if (booking.status !== 'checked_in' && booking.status !== 'late_checkout') {
      throw ApiError.badRequest('Haiwezekani kuongeza siku — booking sio checked_in au late_checkout')
    }

    const currentCheckOut = new Date(booking.checkOut)
    const newCheckOut = new Date(currentCheckOut)
    newCheckOut.setDate(newCheckOut.getDate() + extraNights)

    // Check room availability for extended dates (excluding this booking)
    const isAvailable = await availabilityService.isAvailable({
      roomId: booking.roomId,
      checkIn: currentCheckOut,
      checkOut: newCheckOut,
      excludeBookingId: bookingId
    })
    if (!isAvailable) {
      throw ApiError.conflict('Chumba hakipatikani kwa siku za ziada. Tafadhali chagua chumba kingine au siku nyingine.')
    }

    const pricePerNight = Number(booking.room?.pricePerNight || 0)
    const extraRoomTotal = pricePerNight * extraNights
    const newTotalAmount = Number(booking.totalAmount) + extraRoomTotal
    const newBalanceDue = newTotalAmount - Number(booking.paidAmount)

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          checkOut: newCheckOut,
          roomTotal: { increment: extraRoomTotal },
          totalAmount: newTotalAmount,
          balanceDue: newBalanceDue,
          status: booking.status === 'late_checkout' ? 'checked_in' : booking.status,
          updatedAt: new Date()
        }
      })

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'occupied', updatedAt: new Date() }
      })

      await auditService.log({
        userId: booking.createdById,
        action: 'booking.extend',
        entity: 'booking',
        entityId: bookingId,
        changes: { extraNights, reason, oldCheckOut: currentCheckOut.toISOString() }
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