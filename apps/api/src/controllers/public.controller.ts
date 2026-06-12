import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    }
  })
  res.json(new ApiResponse(hotel))
})

export const getPublicRooms = asyncHandler(async (req, res) => {
  const { slug } = req.params
  const rooms = await prisma.room.findMany({
    where: {
      hotel: { slug },
      isActive: true,
      status: 'available'
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
  res.json(new ApiResponse(rooms))
})

export const createPublicBooking = asyncHandler(async (req, res) => {
  const { slug } = req.params
  // Implementation for public booking (Self-service)
  // Needs guestData, roomId, checkIn, checkOut, etc.
  res.json(new ApiResponse({ message: 'Booking received' }))
})
