import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { aiService, type AiProvider } from '../services/ai.service'

export const getAiStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const settings = await aiService.getSettings(hotelId)
  res.json(new ApiResponse({
    enabled: settings.enabled,
    provider: settings.provider
  }))
})
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'


export const getAiSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const settings = await aiService.getSettings(hotelId)
  res.json(new ApiResponse(settings))
})

export const updateAiSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const settings = await aiService.updateSettings(hotelId, req.body)
  res.json(new ApiResponse(settings, 'Mipangilio ya AI imesasishwa'))
})

export const chat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { messages, provider } = req.body
  const reply = await aiService.chat(hotelId, { messages, provider })
  res.json(new ApiResponse({ reply }))
})

export const validateKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { provider, apiKey } = req.body
  const result = await aiService.validateKey(provider as AiProvider, apiKey)
  res.json(new ApiResponse(result))
})
