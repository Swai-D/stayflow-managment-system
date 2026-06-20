import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { housekeepingService } from '../services/housekeeping.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const getHousekeepingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const status = await housekeepingService.getStatus(hotelId)
  res.json(new ApiResponse(status))
})

export const updateHousekeepingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, notes } = req.body
  const hotelId = await getSystemHotelId()
  const log = await housekeepingService.updateStatus(
    req.params.roomId,
    hotelId,
    status,
    req.user!.id,
    notes
  )
  res.json(new ApiResponse(log, 'Hali ya usafi imesasishwa'))
})
