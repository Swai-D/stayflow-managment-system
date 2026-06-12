import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { housekeepingService } from '../services/housekeeping.service'
import { AuthRequest } from '../middleware/authenticate'

export const getHousekeepingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = await housekeepingService.getStatus(req.user!.hotelId)
  res.json(new ApiResponse(status))
})

export const updateHousekeepingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, notes } = req.body
  const log = await housekeepingService.updateStatus(
    req.params.roomId,
    req.user!.hotelId,
    status,
    req.user!.id,
    notes
  )
  res.json(new ApiResponse(log, 'Hali ya usafi imesasishwa'))
})
