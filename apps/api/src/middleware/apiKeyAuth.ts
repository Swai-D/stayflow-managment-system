import { Request, Response, NextFunction } from 'express'
import { developerService } from '../services/developer.service'
import { ApiError } from '../utils/ApiError'

export interface ApiRequest extends Request {
  apiKey?: any
  hotelId?: string
}

export function apiKeyAuth(requiredScopes: string[] = []) {
  return async (req: ApiRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization || ''
      const key = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-api-key'] as string

      if (!key) {
        throw ApiError.unauthorized('API key inahitajika')
      }

      const apiKey = await developerService.validateApiKey(key)
      if (!apiKey) {
        throw ApiError.unauthorized('API key si sahihi au ime-expire')
      }

      const scopes = (apiKey.scopes as string[]) || []
      if (!scopes.includes('admin')) {
        for (const scope of requiredScopes) {
          if (!scopes.includes(scope)) {
            throw ApiError.forbidden(`Scope ya ${scope} inahitajika`)
          }
        }
      }

      await developerService.touchApiKey(apiKey.id)

      req.apiKey = apiKey
      req.hotelId = apiKey.hotelId
      next()
    } catch (err) {
      next(err)
    }
  }
}
