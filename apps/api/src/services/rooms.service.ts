import { PrismaClient, RoomStatus, RoomType, HousekeepingStatus, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class RoomsService {

  // ─── Get all rooms ───────────────────────────────────
  async getRooms(hotelId: string, filters?: {
    status?: RoomStatus
    floor?: number
    type?: RoomType
    search?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const skip = (page - 1) * limit

    const where = {
      hotelId,
      isActive: true,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.floor && { floor: filters.floor }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.search && {
        OR: [
          { roomNumber: { contains: filters.search, mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ]
      }),
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          bookings: {
            where: {
              status: { in: ['checked_in', 'confirmed'] },
              checkIn: { lte: new Date() },
              checkOut: { gte: new Date() }
            },
            include: {
              guest: {
                select: { id: true, fullName: true, phone: true, nationality: true }
              }
            },
            take: 1,
            orderBy: { checkIn: 'desc' }
          },
          housekeepingLogs: {
            take: 1,
            orderBy: { updatedAt: 'desc' }
          }
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        skip,
        take: limit
      }),
      prisma.room.count({ where })
    ])

    return {
      rooms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // ─── Get single room ─────────────────────────────────
  async getRoom(id: string, hotelId: string) {
    const room = await prisma.room.findFirst({
      where: { id, hotelId, isActive: true },
      include: {
        bookings: {
          where: { status: { in: ['pending', 'confirmed', 'checked_in'] } },
          include: {
            guest: { select: { id: true, fullName: true, phone: true, email: true } }
          },
          orderBy: { checkIn: 'asc' },
          take: 5
        },
        housekeepingLogs: {
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            updatedBy: { select: { id: true, fullName: true } }
          }
        }
      }
    })

    if (!room) throw ApiError.notFound('Chumba hakikupatikana')
    return room
  }

  // ─── Create room ─────────────────────────────────────
  async createRoom(hotelId: string, data: {
    roomNumber: string
    name: string
    floor?: number
    type: RoomType
    pricePerNight: number
    pricePerHour?: number
    specialRate?: number
    fullBoardRate?: number
    nonResidentRate?: string
    beds?: number
    capacity?: number
    description?: string
    amenities?: string[]
  }) {
    // Check room number uniqueness per hotel
    const existing = await prisma.room.findUnique({
      where: { hotelId_roomNumber: { hotelId, roomNumber: data.roomNumber } }
    })
    if (existing) throw ApiError.conflict(`Chumba namba ${data.roomNumber} tayari lipo`)

    return prisma.room.create({
      data: {
        hotelId,
        roomNumber: data.roomNumber,
        name: data.name,
        floor: data.floor || 1,
        type: data.type,
        pricePerNight: data.pricePerNight,
        pricePerHour: data.pricePerHour,
        specialRate: data.specialRate,
        fullBoardRate: data.fullBoardRate,
        nonResidentRate: data.nonResidentRate,
        beds: data.beds ?? data.capacity ?? 1,
        capacity: data.capacity ?? data.beds ?? 2,
        description: data.description,
        amenities: data.amenities || [],
        status: 'available'
      }
    })
  }

  // ─── Update room ─────────────────────────────────────
  async updateRoom(id: string, hotelId: string, data: Partial<{
    roomNumber: string
    name: string
    floor: number
    type: RoomType
    pricePerNight: number
    pricePerHour: number
    specialRate: number
    fullBoardRate: number
    nonResidentRate: string
    beds: number
    capacity: number
    description: string
    amenities: string[]
    isActive: boolean
  }>) {
    const room = await prisma.room.findFirst({ where: { id, hotelId } })
    if (!room) throw ApiError.notFound('Chumba hakikupatikana')

    return prisma.room.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    })
  }

  // ─── Update room status ───────────────────────────────
  async updateRoomStatus(
    id: string,
    hotelId: string,
    status: RoomStatus,
    updatedById: string,
    notes?: string
  ) {
    const room = await prisma.room.findFirst({ where: { id, hotelId } })
    if (!room) throw ApiError.notFound('Chumba hakikupatikana')

    // Use transaction — update room + create housekeeping log
    return prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id },
        data: { status, updatedAt: new Date() }
      })

      // Log housekeeping status change
      const hkStatusMap: Record<RoomStatus, HousekeepingStatus> = {
        available: 'clean',
        dirty: 'dirty',
        cleaning: 'cleaning',
        occupied: 'inspected',
        maintenance: 'dirty',
        blocked: 'dirty'
      }
      const hkStatus = hkStatusMap[status]

      await tx.housekeepingLog.create({
        data: {
          roomId: id,
          updatedById,
          status: hkStatus || 'dirty',
          notes: notes || `Status imebadilishwa kuwa ${status}`
        }
      })

      return updated
    })
  }

  // ─── Get room stats ───────────────────────────────────
  async getRoomStats(hotelId: string) {
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      select: { status: true }
    })

    const total = rooms.length
    const occupied = rooms.filter((r: { status: RoomStatus }) => r.status === 'occupied').length
    const available = rooms.filter((r: { status: RoomStatus }) => r.status === 'available').length
    const dirty = rooms.filter((r: { status: RoomStatus }) => r.status === 'dirty').length
    const maintenance = rooms.filter((r: { status: RoomStatus }) => r.status === 'maintenance').length

    return {
      total,
      occupied,
      available,
      dirty,
      maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0
    }
  }

  // ─── Get floors list ──────────────────────────────────
  async getFloors(hotelId: string): Promise<number[]> {
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      select: { floor: true },
      distinct: ['floor'],
      orderBy: { floor: 'asc' }
    })
    return rooms.map(r => r.floor)
  }
}

export const roomsService = new RoomsService()
