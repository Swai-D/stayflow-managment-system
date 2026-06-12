import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { bookingsService } from '../services/bookings.service'
import { availabilityService } from '../services/availability.service'
import { AuthRequest } from '../middleware/authenticate'

export const getBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search, dateFrom, dateTo, page, limit } = req.query
  const result = await bookingsService.getBookings(req.user!.hotelId, {
    status: status as any,
    search: search as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  })
  res.json(new ApiResponse(result.bookings, 'OK', result.meta))
})

export const getBookingStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await bookingsService.getTodayStats(req.user!.hotelId)
  res.json(new ApiResponse(stats))
})

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

export const getBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.getBooking(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking))
})

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body
  const booking = await bookingsService.createBooking({
    ...body,
    hotelId: req.user!.hotelId,
    createdById: req.user!.id,
    checkIn: new Date(body.checkIn),
    checkOut: new Date(body.checkOut),
  })
  res.status(201).json(new ApiResponse(booking, 'Booking imeundwa'))
})

export const updateBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.updateBooking(
    req.params.id, req.user!.hotelId, req.body
  )
  res.json(new ApiResponse(booking, 'Booking imesasishwa'))
})

export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const booking = await bookingsService.cancelBooking(
    req.params.id, req.user!.hotelId,
    reason || 'Imefutwa na mfumo', req.user!.id
  )
  res.json(new ApiResponse(booking, 'Booking imefutwa'))
})

export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.checkIn(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking, 'Check-in imefanyika'))
})

export const checkOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await bookingsService.checkOut(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(booking, 'Check-out imefanyika'))
})
