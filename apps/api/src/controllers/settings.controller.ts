import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { settingsService } from '../services/settings.service'
import { AuthRequest } from '../middleware/authenticate'

export const getHotelSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await settingsService.getHotelSettings(req.user!.hotelId)
  res.json(new ApiResponse(settings))
})

export const updateHotelSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await settingsService.updateHotelSettings(req.user!.hotelId, req.body)
  res.json(new ApiResponse(settings, 'Mipangilio ya hotel imesasishwa'))
})

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await settingsService.getUsers(req.user!.hotelId)
  res.json(new ApiResponse(users))
})

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await settingsService.createUser(req.user!.hotelId, req.body)
  res.status(201).json(new ApiResponse(user, 'Mtumiaji mpya amesajiliwa'))
})

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await settingsService.updateUser(req.params.id, req.user!.hotelId, req.body)
  res.json(new ApiResponse(user, 'Taarifa za mtumiaji zimesasishwa'))
})

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  await settingsService.deleteUser(req.params.id, req.user!.hotelId, req.user!.id)
  res.json(new ApiResponse(null, 'Mtumiaji amezimwa'))
})

export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const logs = await settingsService.getAuditLogs(req.user!.hotelId)
  res.json(new ApiResponse(logs))
})
