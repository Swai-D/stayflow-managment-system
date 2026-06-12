import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { guestsService } from '../services/guests.service'
import { AuthRequest } from '../middleware/authenticate'

export const getGuests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search } = req.query
  const guests = await guestsService.getGuests(req.user!.hotelId, search as string)
  res.json(new ApiResponse(guests))
})

export const getGuest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const guest = await guestsService.getGuest(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(guest))
})

export const createGuest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const guest = await guestsService.createGuest(req.body)
  res.status(201).json(new ApiResponse(guest, 'Mgeni amesajiliwa'))
})

export const updateGuest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const guest = await guestsService.updateGuest(req.params.id, req.body)
  res.json(new ApiResponse(guest, 'Taarifa za mgeni zimesasishwa'))
})
