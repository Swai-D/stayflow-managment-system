import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export interface GuestAuthRequest extends Request {
  guest?: {
    id: string
    email: string
    firstName: string
    lastName: string
    linkedBookingId?: string
  }
}

export const authenticateGuest = async (
  req: GuestAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return next(ApiError.unauthorized('Token inahitajika'))

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_GUEST_SECRET || 'guest_secret_change_this'
    ) as {
      guestId: string
      email: string
      bookingId?: string
    }

    const account = await prisma.guestAccount.findUnique({
      where: { id: decoded.guestId }
    })

    if (!account || account.status !== 'ACTIVE') {
      return next(ApiError.unauthorized('Akaunti haijathibitishwa'))
    }

    req.guest = {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      linkedBookingId: account.linkedBookingId || decoded.bookingId
    }

    next()
  } catch {
    return next(ApiError.unauthorized('Token imekwisha au si sahihi'))
  }
}
