import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { developerService, API_SCOPES, WEBHOOK_EVENTS } from '../services/developer.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

// ─── API Keys ────────────────────────────────────────────────────────────────
export const listApiKeys = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const keys = await developerService.listApiKeys(hotelId)
  res.json(new ApiResponse(keys))
})

export const createApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { name, scopes, expiresInDays } = req.body

  if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
    throw ApiError.badRequest('Name na scopes zinahitajika')
  }

  const invalid = scopes.filter((s: string) => !API_SCOPES.includes(s as any))
  if (invalid.length > 0) {
    throw ApiError.badRequest(`Scopes zisizo sahihi: ${invalid.join(', ')}`)
  }

  const result = await developerService.createApiKey(hotelId, req.user!.id, { name, scopes, expiresInDays })
  res.status(201).json(new ApiResponse({
    ...result.apiKey,
    key: result.rawKey,
  }, 'API key imeundwa. Hifadhi key hii kwa usalama — haitaonyeshwa tena.'))
})

export const revokeApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const key = await developerService.revokeApiKey(req.params.id, hotelId)
  res.json(new ApiResponse(key, 'API key imezimwa'))
})

export const deleteApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  await developerService.deleteApiKey(req.params.id, hotelId)
  res.json(new ApiResponse(null, 'API key imefutwa'))
})

// ─── Webhooks ────────────────────────────────────────────────────────────────
export const listWebhooks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const webhooks = await developerService.listWebhooks(hotelId)
  res.json(new ApiResponse(webhooks))
})

export const createWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { name, url, events, secret } = req.body

  if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
    throw ApiError.badRequest('Name, URL na events zinahitajika')
  }

  try {
    new URL(url)
  } catch {
    throw ApiError.badRequest('URL si sahihi')
  }

  const invalid = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as any) && e !== '*')
  if (invalid.length > 0) {
    throw ApiError.badRequest(`Events zisizo sahihi: ${invalid.join(', ')}`)
  }

  const webhook = await developerService.createWebhook(hotelId, req.user!.id, { name, url, events, secret })
  res.status(201).json(new ApiResponse(webhook, 'Webhook imeundwa'))
})

export const updateWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { name, url, events, secret, isActive } = req.body
  const data: any = {}
  if (name !== undefined) data.name = name
  if (url !== undefined) data.url = url
  if (events !== undefined) {
    const invalid = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as any) && e !== '*')
    if (invalid.length > 0) throw ApiError.badRequest(`Events zisizo sahihi: ${invalid.join(', ')}`)
    data.events = events
  }
  if (secret !== undefined) data.secret = secret
  if (isActive !== undefined) data.isActive = isActive

  const webhook = await developerService.updateWebhook(req.params.id, hotelId, data)
  res.json(new ApiResponse(webhook, 'Webhook imesasishwa'))
})

export const deleteWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  await developerService.deleteWebhook(req.params.id, hotelId)
  res.json(new ApiResponse(null, 'Webhook imefutwa'))
})

export const listWebhookDeliveries = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const deliveries = await developerService.listWebhookDeliveries(req.params.id, hotelId)
  res.json(new ApiResponse(deliveries))
})

// ─── API Logs ─────────────────────────────────────────────────────────────────
export const listApiLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50
  const result = await developerService.listApiLogs(hotelId, { page, limit })
  res.json(new ApiResponse(result.logs, 'OK', result.meta))
})

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const getScopesAndEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json(new ApiResponse({
    scopes: API_SCOPES,
    events: WEBHOOK_EVENTS,
  }))
})
