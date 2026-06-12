import { PrismaClient, HousekeepingStatus } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class HousekeepingService {
  async getStatus(hotelId: string) {
    return prisma.room.findMany({
      where: { hotelId, isActive: true },
      select: {
        id: true,
        roomNumber: true,
        status: true,
        housekeepingLogs: {
          take: 1,
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: { roomNumber: 'asc' }
    })
  }

  async updateStatus(roomId: string, hotelId: string, status: HousekeepingStatus, updatedById: string, notes?: string) {
    const room = await prisma.room.findFirst({ where: { id: roomId, hotelId } })
    if (!room) throw ApiError.notFound('Chumba hakikupatikana')

    return prisma.$transaction(async (tx) => {
      // Mapping HousekeepingStatus to RoomStatus
      const roomStatusMap: Record<HousekeepingStatus, any> = {
        clean: 'available',
        dirty: 'dirty',
        cleaning: 'cleaning',
        inspected: 'available' // Or occupied if someone is in there? 
      }

      const newRoomStatus = roomStatusMap[status]

      if (newRoomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { status: newRoomStatus }
        })
      }

      return tx.housekeepingLog.create({
        data: {
          roomId,
          updatedById,
          status,
          notes
        }
      })
    })
  }
}

export const housekeepingService = new HousekeepingService()
