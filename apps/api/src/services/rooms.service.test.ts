import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    room: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    housekeepingLog: { create: vi.fn() },
  }
  mock.$transaction = vi.fn((fn: any) => fn(mock))
  return { mockPrisma: mock }
})

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  RoomStatus: {},
  RoomType: {}
}))

import { RoomsService } from './rooms.service'

const service = new RoomsService()

describe('RoomsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRooms', () => {
    it('should return rooms for a hotel', async () => {
      mockPrisma.room.findMany.mockResolvedValue([
        { id: '1', roomNumber: '111', status: 'available', bookings: [], housekeepingLogs: [] }
      ])
      const rooms = await service.getRooms('hotel-1')
      expect(Array.isArray(rooms)).toBe(true)
      expect(rooms).toHaveLength(1)
      expect(mockPrisma.room.findMany).toHaveBeenCalled()
    })
  })

  describe('createRoom', () => {
    it('should throw conflict if room number exists', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({ id: '1', roomNumber: '111' })

      await expect(service.createRoom('hotel-1', {
        roomNumber: '111',
        name: 'Test Room',
        type: 'standard' as any,
        pricePerNight: 50000
      })).rejects.toThrow('tayari lipo')
    })

    it('should create room if number is unique', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null)
      mockPrisma.room.create.mockResolvedValue({
        id: '2', roomNumber: '112', name: 'New Room', status: 'available'
      })

      const room = await service.createRoom('hotel-1', {
        roomNumber: '112',
        name: 'New Room',
        type: 'standard' as any,
        pricePerNight: 60000
      })
      expect(room.roomNumber).toBe('112')
      expect(mockPrisma.room.create).toHaveBeenCalled()
    })
  })

  describe('getRoomStats', () => {
    it('should calculate occupancy rate correctly', async () => {
      mockPrisma.room.findMany.mockResolvedValue([
        { status: 'occupied' },
        { status: 'occupied' },
        { status: 'available' },
        { status: 'dirty' },
      ])

      const stats = await service.getRoomStats('hotel-1')
      expect(stats.total).toBe(4)
      expect(stats.occupied).toBe(2)
      expect(stats.occupancyRate).toBe(50)
    })
  })
})
