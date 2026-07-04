import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { guestService } from '../services/guest.service'
import { GuestAuthRequest } from '../middleware/guest.auth'

export const login = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) throw ApiError.badRequest('Email and password are required')
  const result = await guestService.login(email, password)
  res.json({ success: true, ...result })
})

export const qrLogin = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { token } = req.body
  if (!token) throw ApiError.badRequest('QR token is required')
  const result = await guestService.qrLogin(token)
  res.json({ success: true, ...result })
})

export const requestOtp = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { email } = req.body
  if (!email) throw ApiError.badRequest('Email is required')
  const result = await guestService.requestOtp(email)
  res.json(result)
})

export const verifyOtp = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { email, code } = req.body
  if (!email || !code) throw ApiError.badRequest('Email and code are required')
  const result = await guestService.verifyOtp(email, code)
  res.json({ success: true, ...result })
})

export const verifyActivationToken = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { token } = req.query
  if (!token) throw ApiError.badRequest('Token is required')
  const result = await guestService.verifyActivationToken(token as string)
  res.json({ success: true, ...result })
})

export const activate = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  const { token, password } = req.body
  if (!token || !password) throw ApiError.badRequest('Token and password are required')
  const result = await guestService.activate(token, password)
  res.json({ success: true, ...result })
})

export const getBooking = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  if (!req.guest) throw ApiError.unauthorized()
  const booking = await guestService.getActiveBooking(req.guest)
  res.json({ success: true, booking })
})

export const createRoomServiceOrder = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  if (!req.guest) throw ApiError.unauthorized()
  const { items, notes, totalAmount } = req.body
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Items are required')
  }
  const result = await guestService.createRoomServiceOrder(req.guest, { items, notes, totalAmount })
  res.status(201).json(result)
})

export const createServiceRequest = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  if (!req.guest) throw ApiError.unauthorized()
  const { type, ...payload } = req.body
  if (!type) throw ApiError.badRequest('Request type is required')
  const result = await guestService.createServiceRequest(req.guest, { type, ...payload })
  res.status(201).json(result)
})

export const createExtensionRequest = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  if (!req.guest) throw ApiError.unauthorized()
  const { bookingId, extraNights, reason } = req.body
  if (!bookingId || !extraNights) throw ApiError.badRequest('bookingId and extraNights are required')
  const result = await guestService.createExtensionRequest(req.guest, { bookingId, extraNights, reason })
  res.status(201).json(result)
})

export const getOrders = asyncHandler(async (req: GuestAuthRequest, res: Response) => {
  if (!req.guest) throw ApiError.unauthorized()
  const result = await guestService.getOrders(req.guest)
  res.json(result)
})
