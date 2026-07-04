import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { guestPortalService } from '../services/guestPortal.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { status, search } = req.query
  const data = await guestPortalService.getOrders(hotelId, {
    status: status as string,
    search: search as string
  })
  res.json(new ApiResponse(data))
})

export const getRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { type, status, search } = req.query
  const data = await guestPortalService.getRequests(hotelId, {
    type: type as string,
    status: status as string,
    search: search as string
  })
  res.json(new ApiResponse(data))
})

export const updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { status } = req.body
  const order = await guestPortalService.updateOrderStatus(req.params.id, hotelId, status)
  res.json(new ApiResponse(order, 'Hali ya order imesasishwa'))
})

export const updateRequestStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { status } = req.body
  const request = await guestPortalService.updateRequestStatus(req.params.id, hotelId, status)
  res.json(new ApiResponse(request, 'Hali ya request imesasishwa'))
})

export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const stats = await guestPortalService.getStats(hotelId)
  res.json(new ApiResponse(stats))
})
