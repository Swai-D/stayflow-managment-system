import { Response, NextFunction } from 'express'
import { AuthRequest } from './authenticate'
import { ApiError } from '../utils/ApiError'
import { AppPermission, hasPermission } from '../config/roles'

/**
 * Permission-based route guard.
 *
 * Usage:
 *   router.get('/', requirePermission('bookings:view'), getBookings)
 *   router.post('/', requirePermission('bookings:manage', 'bookings:checkin'), createBooking)
 *
 * The user only needs ONE of the listed permissions to proceed.
 */
export const requirePermission = (...permissions: AppPermission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized()

    const userPermissions = req.user.role.permissions as string[]
    const allowed = permissions.some(p =>
      hasPermission(req.user!.role.name, p) || hasPermission(userPermissions, p)
    )
    if (!allowed) throw ApiError.forbidden('Huna ruhusa kwa kitendo hiki')

    next()
  }
}
