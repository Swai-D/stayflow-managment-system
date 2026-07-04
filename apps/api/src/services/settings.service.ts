import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class SettingsService {
  async getHotelSettings(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    })
    if (!hotel) throw ApiError.notFound('Hotel not found')
    return hotel
  }

  async updateHotelSettings(hotelId: string, data: any) {
    return prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  async getUsers(hotelId: string) {
    return prisma.user.findMany({
      where: { hotelId },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        phone: true,
        isActive: true,
        lastLoginAt: true,
        avatarUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async createUser(hotelId: string, data: {
    fullName: string
    email: string
    password: string
    roleId: string
    phone?: string
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw ApiError.conflict('Email tayari inatumiwa')

    const role = await prisma.role.findFirst({
      where: { id: data.roleId, hotelId }
    })
    if (!role) throw ApiError.badRequest('Jukumu lililochaguliwa halipo')

    const passwordHash = await bcrypt.hash(data.password, 12)

    return prisma.user.create({
      data: {
        hotelId,
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        roleId: data.roleId,
        phone: data.phone,
        isActive: true
      },
      include: {
        role: {
          select: { id: true, name: true, permissions: true }
        }
      }
    })
  }

  async updateUser(userId: string, hotelId: string, data: any) {
    const user = await prisma.user.findFirst({
      where: { id: userId, hotelId },
      include: { role: true }
    })
    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')

    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 12)
      delete data.password
    }

    if (data.roleId) {
      const role = await prisma.role.findFirst({
        where: { id: data.roleId, hotelId }
      })
      if (!role) throw ApiError.badRequest('Jukumu lililochaguliwa halipo')
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        role: {
          select: { id: true, name: true, permissions: true }
        }
      }
    })
  }

  async deleteUser(userId: string, hotelId: string, requestUserId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, hotelId },
      include: { role: true }
    })
    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')

    // RULE 1: Huwezi kujifuta mwenyewe
    if (userId === requestUserId) {
      throw ApiError.badRequest('Huwezi kuizima akaunti yako mwenyewe ukiwa ndani ya mfumo')
    }

    // RULE 2: Huwezi kufuta Admin (Only Super Admin/Developer via DB can do this)
    const userPermissions = (user.role.permissions as string[]) ?? []
    if (user.role.name === 'admin' || userPermissions.includes('all')) {
      throw ApiError.forbidden('Akaunti ya Admin haiwezi kufutwa na Admin mwingine. Wasiliana na Developer.')
    }

    // Soft delete
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })
  }

  async getAuditLogs(hotelId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: { user: { hotelId } },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }
}

export const settingsService = new SettingsService()
