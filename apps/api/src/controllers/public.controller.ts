import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { PrismaClient } from '@prisma/client'
import { bookingsService } from '../services/bookings.service'
import { availabilityService } from '../services/availability.service'
import { nextSmsService } from '../services/nextsms.service'

const prisma = new PrismaClient()

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '255' + cleaned.slice(1)
  if (!cleaned.startsWith('+') && !cleaned.startsWith('255') && cleaned.length === 9) {
    cleaned = '255' + cleaned
  }
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned
}

export const getPublicHotel = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const hotel = await prisma.hotel.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      wifiName: true,
      checkInTime: true,
      checkOutTime: true,
      defaultLanguage: true,
      paymentNumbers: true,
    }
  })
  res.json(new ApiResponse(hotel))
})

export const getPublicRooms = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const { checkIn, checkOut } = req.query

  const hotel = await prisma.hotel.findUnique({ where: { slug } })
  if (!hotel) throw ApiError.notFound('Hotel haikupatikana')

  let rooms: any[] = []

  // If dates are provided, return truly available rooms for that range
  if (checkIn && checkOut) {
    rooms = await availabilityService.getAvailableRooms(
      hotel.id,
      new Date(checkIn as string),
      new Date(checkOut as string)
    )
  } else {
    // Fallback: show rooms that are active and not under maintenance/blocked
    rooms = await prisma.room.findMany({
      where: {
        hotelId: hotel.id,
        isActive: true,
        status: { notIn: ['maintenance', 'blocked'] }
      },
      select: {
        id: true,
        roomNumber: true,
        name: true,
        type: true,
        pricePerNight: true,
        capacity: true,
        amenities: true,
        images: true,
      }
    })
  }

  res.json(new ApiResponse(rooms))
})

export const checkPublicAvailability = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const { roomId, checkIn, checkOut } = req.query

  if (!roomId || !checkIn || !checkOut) {
    throw ApiError.badRequest('roomId, checkIn, and checkOut are required')
  }

  const hotel = await prisma.hotel.findUnique({ where: { slug } })
  if (!hotel) throw ApiError.notFound('Hotel haikupatikana')

  const room = await prisma.room.findFirst({
    where: { id: roomId as string, hotelId: hotel.id, isActive: true }
  })
  if (!room) throw ApiError.notFound('Chumba hakikupatikana')

  const available = await availabilityService.isAvailable({
    roomId: roomId as string,
    checkIn: new Date(checkIn as string),
    checkOut: new Date(checkOut as string)
  })

  res.json(new ApiResponse({ available }))
})

export const createPublicBooking = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const { roomId, checkIn, checkOut, adults, children, guestData, specialRequests } = req.body

  if (!guestData?.email?.trim()) {
    throw ApiError.badRequest('Email ya mgeni inahitajika.')
  }

  const hotel = await prisma.hotel.findUnique({ where: { slug } })
  if (!hotel) throw ApiError.notFound('Hotel haikupatikana')

  // Find a hotel admin/staff to mark as creator of the public booking
  const creator = await prisma.user.findFirst({
    where: { hotelId: hotel.id, role: 'admin', isActive: true }
  })

  if (!creator) {
    throw ApiError.internal('Hotel haijaweza kupokea booking kwa sasa. Tafadhali wasiliana na usimamizi.')
  }

  // 1. Create booking via existing service
  const booking = await bookingsService.createBooking({
    hotelId: hotel.id,
    roomId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    adults: adults || 1,
    children: children || 0,
    guestData: {
      fullName: guestData.fullName,
      phone: normalizePhone(guestData.phone),
      email: guestData.email,
      nationality: guestData.nationality,
      idType: guestData.idType,
      idNumber: guestData.idNumber,
    },
    specialRequests: specialRequests || '',
    source: 'online_self',
    createdById: creator.id
  })

  // 2. Generate OTP for guest dashboard
  const otp = generateOtp()
  const otpExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

  await prisma.guest.update({
    where: { id: booking.guestId },
    data: { dashboardOtp: otp, otpExpiresAt }
  })

  // 3. Send SMS via NextSMS
  try {
    await nextSmsService.sendBookingConfirmationWithOtp(
      guestData.phone,
      guestData.fullName,
      booking.bookingRef,
      otp,
      hotel.name
    )
  } catch (err: any) {
    console.error('[Public Booking] SMS sending failed:', err.message)
    // Don't fail the booking if SMS fails; still return OTP in response
  }

  res.status(201).json(new ApiResponse({
    booking,
    otp,
    otpExpiresAt: otpExpiresAt.toISOString(),
    message: 'Booking imeundwa. Tafadhali lipia kupitia namba zilizotolewa kisha uingize OTP iliyotumwa kwa SMS.'
  }))
})
