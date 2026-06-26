import { Response, NextFunction } from 'express'
import { ApiRequest } from './apiKeyAuth'
import { developerService } from '../services/developer.service'

export function apiLogger() {
  return (req: ApiRequest, res: Response, next: NextFunction) => {
    const start = Date.now()

    const logRequest = () => {
      const durationMs = Date.now() - start
      // Only log if request has apiKey (i.e. came through public API)
      if (req.apiKey) {
        developerService.createApiLog({
          hotelId: req.hotelId,
          apiKeyId: req.apiKey.id,
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          durationMs,
        }).catch(err => {
          console.error('[ApiLogger] Failed to log request:', err)
        })
      }
    }

    res.on('finish', logRequest)
    next()
  }
}
