import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { bookingsService } from '../services/bookings.service'
import { availabilityService } from '../services/availability.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createWebsiteBooking = asyncHandler(async (req: Request, res: Response) => {
  const {
    firstName, lastName, email, phone, nationality, idType, idNumber,
    checkIn, checkOut, adults, children, roomType, additionalServices, message, source
  } = req.body

  // 1. Find the system admin and resolve the hotel they belong to
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@buffalo-hotel.co.tz' }
  })
  if (!admin) throw ApiError.internal('System admin user not found')
  const hotelId = admin.hotelId

  // 2. Find an available room of the requested type
  const availableRooms = await availabilityService.getAvailableRooms(
    hotelId,
    new Date(checkIn),
    new Date(checkOut)
  )

  const room = availableRooms.find(r =>
    r.name.toLowerCase().includes(roomType.toLowerCase()) ||
    r.type.toLowerCase() === roomType.toLowerCase()
  )

  if (!room) {
    throw ApiError.conflict('Samahani, chumba cha aina hii hakipatikani kwa tarehe ulizochagua.')
  }

  // 3. Create the booking
  const booking = await bookingsService.createBooking({
    hotelId,
    roomId: room.id,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    guestData: {
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      nationality,
      idType,
      idNumber,
    },
    source: 'online_self',
    createdById: admin.id,
    specialRequests: `${additionalServices ? 'Services: ' + additionalServices + '. ' : ''}${message || ''}`,
  })

  const nights = availabilityService.calculateNights(new Date(checkIn), new Date(checkOut))

  res.status(201).json({
    success: true,
    bookingId: booking.bookingRef,
    totalAmount: Number(booking.totalAmount),
    currency: 'TZS',
    nights,
    roomType: room.name
  })
})

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId, amount, currency, customerEmail } = req.body

  // Use Origin header if available (from website), fallback to APP_URL
  const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000'

  // Mock payment URL
  const paymentUrl = `${origin}/payment-success.html?bookingId=${bookingId}`

  res.json({
    success: true,
    paymentUrl,
    reference: `PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  })
})

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { checkIn, checkOut } = req.query

  if (!checkIn || !checkOut) {
    throw ApiError.badRequest('checkIn and checkOut dates are required')
  }

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@buffalo-hotel.co.tz' },
    select: { hotelId: true }
  })
  const hotelId = admin?.hotelId || process.env.DEFAULT_HOTEL_ID || 'default-hotel-id'

  const availableRooms = await availabilityService.getAvailableRooms(
    hotelId,
    new Date(checkIn as string),
    new Date(checkOut as string)
  )

  // Group by room type, keeping the lowest price per type
  const typeMap = new Map<string, { type: string; price: number; name: string; available: boolean }>()

  availableRooms.forEach(r => {
    const price = Number(r.pricePerNight)
    const existing = typeMap.get(r.type)
    if (!existing || price < existing.price) {
      typeMap.set(r.type, {
        type: r.type,
        price,
        name: r.name,
        available: true
      })
    }
  })

  const roomsStatus = Array.from(typeMap.values()).map(rt => ({
    type: rt.type,
    price: rt.price,
    available: rt.available
  }))

  res.json({
    success: true,
    rooms: roomsStatus
  })
})
