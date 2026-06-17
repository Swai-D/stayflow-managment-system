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
    firstName, lastName, email, phone, checkIn, checkOut,
    guests, roomType, additionalServices, message, source
  } = req.body

  // 1. Get default hotel
  const hotelId = process.env.DEFAULT_HOTEL_ID || 'default-hotel-id'
  
  // 2. Find an available room of the requested type
  // Map roomType from website to RoomType enum if necessary
  // Website roomType examples: "Kilimanjaro View Suite", "Buffalo Executive Room", etc.
  // We'll search by room name or type.
  
  // For now, let's look for a room that matches the 'name' or 'type'
  const availableRooms = await availabilityService.getAvailableRooms(
    hotelId,
    new Date(checkIn),
    new Date(checkOut)
  )

  // Find a room that matches the roomType name
  // Note: roomType from website might be the name of the room category
  const room = availableRooms.find(r => 
    r.name.toLowerCase().includes(roomType.toLowerCase()) || 
    r.type.toLowerCase() === roomType.toLowerCase()
  )

  if (!room) {
    throw ApiError.conflict('Samahani, chumba cha aina hii hakipatikani kwa tarehe ulizochagua.')
  }

  // 3. Find a system user to be the creator (e.g. the admin)
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@buffalo-hotel.co.tz' }
  })
  if (!admin) throw ApiError.internal('System admin user not found')

  // 4. Create the booking
  const booking = await bookingsService.createBooking({
    hotelId,
    roomId: room.id,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guestData: {
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
    },
    source: 'online_self', // or 'website' if we add it to enum, but online_self fits
    createdById: admin.id,
    specialRequests: `${additionalServices ? 'Services: ' + additionalServices + '. ' : ''}${message || ''}`,
  })

  const nights = availabilityService.calculateNights(new Date(checkIn), new Date(checkOut))

  res.status(201).json({
    success: true,
    bookingId: booking.bookingRef,
    totalAmount: Number(booking.totalAmount),
    currency: 'USD', // Buffalo website uses USD
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

  const hotelId = process.env.DEFAULT_HOTEL_ID || 'default-hotel-id'
  
  const availableRooms = await availabilityService.getAvailableRooms(
    hotelId,
    new Date(checkIn as string),
    new Date(checkOut as string)
  )

  // Group by room type/name for the website
  const roomTypes = [
    { type: 'Standard', price: 30 },
    { type: 'Twin', price: 40 },
    { type: 'Deluxe', price: 80 },
    { type: 'Triple', price: 70 },
  ]

  const roomsStatus = roomTypes.map(rt => {
    const isAvailable = availableRooms.some(r => r.type.toLowerCase() === rt.type.toLowerCase())
    return {
      type: rt.type,
      price: rt.price,
      available: isAvailable
    }
  })

  res.json({
    success: true,
    rooms: roomsStatus
  })
})
