import { PrismaClient, UserRole } from '@prisma/client'
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
        role: true,
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
    role: UserRole
    phone?: string
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw ApiError.conflict('Email tayari inatumiwa')

    const passwordHash = await bcrypt.hash(data.password, 12)

    return prisma.user.create({
      data: {
        hotelId,
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role,
        phone: data.phone,
        isActive: true
      }
    })
  }

  async updateUser(userId: string, hotelId: string, data: any) {
    const user = await prisma.user.findFirst({ where: { id: userId, hotelId } })
    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')

    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 12)
      delete data.password
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  async deleteUser(userId: string, hotelId: string, requestUserId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, hotelId } })
    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')

    // RULE 1: Huwezi kujifuta mwenyewe
    if (userId === requestUserId) {
      throw ApiError.badRequest('Huwezi kuizima akaunti yako mwenyewe ukiwa ndani ya mfumo')
    }

    // RULE 2: Huwezi kufuta Admin (Only Super Admin/Developer via DB can do this)
    if (user.role === 'admin') {
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
