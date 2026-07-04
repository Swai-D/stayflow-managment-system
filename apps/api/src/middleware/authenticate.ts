import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export interface AuthRequest extends Request {
  user?: {
    id: string
    roleId: string
    role: {
      id: string
      name: string
      permissions: string[]
    }
    hotelId: string
    email: string
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return next(ApiError.unauthorized())

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      id: string; role: string; hotelId: string; email: string
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          select: { id: true, name: true, permissions: true }
        }
      }
    })

    if (!user || !user.isActive) {
      return next(ApiError.unauthorized('Token imekwisha au si sahihi'))
    }

    req.user = {
      id: user.id,
      roleId: user.roleId,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: (user.role.permissions as string[]) ?? []
      },
      hotelId: user.hotelId,
      email: user.email
    }

    next()
  } catch {
    return next(ApiError.unauthorized('Token imekwisha au si sahihi'))
  }
}
