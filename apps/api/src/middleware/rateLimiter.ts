import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number }
}

const store: RateLimitStore = {}

export function rateLimiter(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs || 60 * 1000 // 1 minute
  const max = options.max || 100 // 100 requests per minute

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || 'unknown') + ':' + (req.path || '/')
    const now = Date.now()

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 1, resetAt: now + windowMs }
    } else {
      store[key].count++
    }

    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count))
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetAt).toISOString())

    if (store[key].count > max) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' }
      })
      return
    }

    next()
  }
}
