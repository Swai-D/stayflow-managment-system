import { Response, NextFunction } from 'express'
import { AuthRequest } from './authenticate'
import { ApiError } from '../utils/ApiError'

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized()
    if (!roles.includes(req.user.role.name)) throw ApiError.forbidden()
    next()
  }
}
