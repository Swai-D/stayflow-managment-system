import { Router } from 'express'
import { apiKeyAuth, ApiRequest } from '../middleware/apiKeyAuth'
import { rateLimiter } from '../middleware/rateLimiter'
import { apiLogger } from '../middleware/apiLogger'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// All routes require a valid API key, are rate-limited, and logged
router.use(rateLimiter({ windowMs: 60 * 1000, max: 100 }))
router.use(apiKeyAuth())
router.use(apiLogger())

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get('/bookings', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const bookings = await prisma.booking.findMany({
    where: { hotelId },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      guest: { select: { fullName: true, email: true, phone: true } },
      company: { select: { name: true } },
      room: { select: { roomNumber: true, type: true } },
    }
  })
  res.json(new ApiResponse(bookings))
}))

router.get('/bookings/:id', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, hotelId },
    include: {
      guest: true,
      company: true,
      room: true,
      guests: true,
      roomCharges: { include: { items: true } },
      payments: true,
    }
  })
  if (!booking) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking haikupatikana' } })
    return
  }
  res.json(new ApiResponse(booking))
}))

// ─── Guests ───────────────────────────────────────────────────────────────────
router.get('/guests', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const guests = await prisma.guest.findMany({
    where: { bookings: { some: { hotelId } } },
    take: 100,
    orderBy: { createdAt: 'desc' },
  })
  res.json(new ApiResponse(guests))
}))

// ─── Rooms ────────────────────────────────────────────────────────────────────
router.get('/rooms', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const rooms = await prisma.room.findMany({
    where: { hotelId },
    orderBy: { roomNumber: 'asc' },
  })
  res.json(new ApiResponse(rooms))
}))

// ─── Availability ─────────────────────────────────────────────────────────────
router.get('/availability', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const { checkIn, checkOut } = req.query

  if (!checkIn || !checkOut) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'checkIn na checkOut zinahitajika' } })
    return
  }

  const rooms = await prisma.room.findMany({ where: { hotelId, isActive: true } })
  const checkInDate = new Date(checkIn as string)
  const checkOutDate = new Date(checkOut as string)

  const available = []
  for (const room of rooms) {
    const overlapping = await prisma.booking.count({
      where: {
        roomId: room.id,
        status: { not: 'cancelled' },
        OR: [
          { checkIn: { lte: checkOutDate }, checkOut: { gte: checkInDate } },
        ]
      }
    })
    if (overlapping === 0) available.push(room)
  }

  res.json(new ApiResponse(available))
}))

// ─── Invoices ─────────────────────────────────────────────────────────────────
router.get('/invoices', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const invoices = await prisma.invoice.findMany({
    where: { hotelId },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      invoiceBookings: { include: { booking: { select: { bookingRef: true } } } },
      company: { select: { name: true } },
    }
  })
  res.json(new ApiResponse(invoices))
}))

// ─── Payments ─────────────────────────────────────────────────────────────────
router.get('/payments', asyncHandler(async (req: ApiRequest, res) => {
  const hotelId = req.hotelId!
  const payments = await prisma.payment.findMany({
    where: { booking: { hotelId } },
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { select: { bookingRef: true } },
    }
  })
  res.json(new ApiResponse(payments))
}))

export default router
