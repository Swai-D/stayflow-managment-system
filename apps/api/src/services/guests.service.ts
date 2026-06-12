import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class GuestsService {
  async getGuests(hotelId: string, search?: string) {
    return prisma.guest.findMany({
      where: {
        OR: search ? [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] : undefined,
        bookings: {
          some: { hotelId }
        }
      },
      orderBy: { fullName: 'asc' }
    })
  }

  async getGuest(id: string, hotelId: string) {
    const guest = await prisma.guest.findFirst({
      where: { 
        id,
        bookings: { some: { hotelId } }
      },
      include: {
        bookings: {
          where: { hotelId },
          include: { room: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    if (!guest) throw ApiError.notFound('Mgeni hakupatikana')
    return guest
  }

  async createGuest(data: {
    fullName: string
    phone: string
    email?: string
    idType?: any
    idNumber?: string
    nationality?: string
    notes?: string
  }) {
    return prisma.guest.create({ data })
  }

  async updateGuest(id: string, data: Partial<{
    fullName: string
    phone: string
    email: string
    idType: any
    idNumber: string
    nationality: string
    notes: string
  }>) {
    return prisma.guest.update({
      where: { id },
      data
    })
  }
}

export const guestsService = new GuestsService()
