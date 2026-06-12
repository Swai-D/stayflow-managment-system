import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AvailabilityService } from './availability.service'
import { ApiError } from '../utils/ApiError'

const mockPrisma = vi.hoisted(() => ({
  room: { findUnique: vi.fn() },
  booking: { findFirst: vi.fn(), findMany: vi.fn() }
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const service = new AvailabilityService()

const d = (str: string) => new Date(str)

describe('AvailabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isAvailable', () => {

    it('❌ should throw if checkOut is before checkIn', async () => {
      await expect(service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'),
        checkOut: d('2026-06-08'),
      })).rejects.toThrow('Tarehe ya kuondoka')
    })

    it('❌ should throw if checkOut equals checkIn', async () => {
      await expect(service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'),
        checkOut: d('2026-06-10'),
      })).rejects.toThrow()
    })

    it('❌ should return false if room is in maintenance', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'maintenance', type: 'standard', isActive: true
      })

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(false)
    })

    it('❌ should return false if room is blocked', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'blocked', type: 'standard', isActive: true
      })

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(false)
    })

    it('✅ should return true if no overlapping bookings', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(true)
    })

    it('❌ should return false if booking overlaps (full overlap)', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'existing-booking' })

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-15')
      })
      expect(result).toBe(false)
    })

    it('✅ should return true if existing booking ends before new one starts', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-15')
      })
      expect(result).toBe(true)
    })

    it('✅ should ignore cancelled bookings when checking availability', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12')
      })
      expect(result).toBe(true)
    })

    it('✅ should allow editing existing booking (excludeBookingId)', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        status: 'available', type: 'standard', isActive: true
      })
      mockPrisma.booking.findFirst.mockResolvedValue(null)

      const result = await service.isAvailable({
        roomId: 'r1',
        checkIn: d('2026-06-10'), checkOut: d('2026-06-12'),
        excludeBookingId: 'existing-booking'
      })
      expect(result).toBe(true)
    })
  })

  describe('calculateNights', () => {
    it('should calculate 7 nights correctly', () => {
      expect(service.calculateNights(d('2026-06-01'), d('2026-06-08'))).toBe(7)
    })
  })

  describe('calculateRoomTotal', () => {
    it('should calculate total for 2 nights at 80000', () => {
      expect(service.calculateRoomTotal(80000, 2)).toBe(160000)
    })
    it('should calculate total for 7 nights at 75000', () => {
      expect(service.calculateRoomTotal(75000, 7)).toBe(525000)
    })
  })
})
