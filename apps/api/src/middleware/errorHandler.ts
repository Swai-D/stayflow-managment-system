import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[ERROR] ${err.message}`, err.stack)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    })
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const code = (err as any).code
    if (code === '23P01') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DOUBLE_BOOKING',
          message: 'Chumba hiki hakipatikani kwa tarehe uliouchagua. Tafadhali chagua tarehe nyingine.'
        }
      })
    }
    if (code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Rekodi hii tayari ipo katika mfumo.' }
      })
    }
    if (code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rekodi uliyoomba haikupatikana.' }
      })
    }
    return res.status(409).json({
      success: false,
      error: { code: 'DB_ERROR', message: 'Database operation failed' }
    })
  }

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Hitilafu ya mfumo — jaribu tena' }
  })
}
