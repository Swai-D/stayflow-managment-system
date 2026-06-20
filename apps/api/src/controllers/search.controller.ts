import { Response } from 'express'
import { searchService } from '../services/search.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const globalSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q, limit } = req.query
  const hotelId = await getSystemHotelId()
  const results = await searchService.search(
    hotelId,
    q as string,
    limit ? Number(limit) : undefined
  )
  res.json(new ApiResponse(results))
})
