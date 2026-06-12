import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; hotelId: string; email: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) throw ApiError.unauthorized()

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      id: string; role: string; hotelId: string; email: string
    }
    req.user = decoded
    next()
  } catch {
    throw ApiError.unauthorized('Token imekwisha au si sahihi')
  }
}
