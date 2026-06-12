# ⚠️ DESIGN REFERENCE — READ BEFORE WRITING ANY UI CODE
> Design: YowStay Hotel Management Dashboard
> Link  : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Designer: https://dribbble.com/yowdesain
>
> Key rules:
> - WHITE backgrounds only — no colored cards, no gradients, NO purple
> - Blue (#2563EB) is the ONLY accent color
> - Room grid: colored bg per status (light blue=occupied, light amber=dirty, white=available)
> - Room cards: room number big, guest name small, date range, action icons
> - Modal: white, 16px radius, subtle shadow — clean like YowStay Room Details modal
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STAYFLOW — PHASE 1, TASK 3: ROOMS CRUD + ROOM GRID UI
> Tegemea: Task 1 + Task 2 zimekamilika
> Matokeo: Rooms API inafanya kazi + Room grid page (YowStay style) + Room detail modal

---

## OVERVIEW

```
1. Backend  : GET/POST/PATCH /rooms, PATCH /rooms/:id/status
2. Frontend : Room grid page (floor view), Room detail modal, Stats cards
3. Tests    : Unit tests za rooms service
```

---

## TASK 3A — Backend Rooms Service

### apps/api/src/services/rooms.service.ts
```typescript
import { PrismaClient, RoomStatus, RoomType } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class RoomsService {

  // ─── Get all rooms ───────────────────────────────────
  async getRooms(hotelId: string, filters?: {
    status?: RoomStatus
    floor?: number
    type?: RoomType
  }) {
    return prisma.room.findMany({
      where: {
        hotelId,
        isActive: true,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.floor && { floor: filters.floor }),
        ...(filters?.type && { type: filters.type }),
      },
      include: {
        // Include current active booking (checked_in only)
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
        // Include latest housekeeping log
        housekeepingLogs: {
          take: 1,
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }]
    })
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
        capacity: data.capacity || 2,
        description: data.description,
        amenities: data.amenities || [],
        status: 'available'
      }
    })
  }

  // ─── Update room ─────────────────────────────────────
  async updateRoom(id: string, hotelId: string, data: Partial<{
    name: string
    floor: number
    type: RoomType
    pricePerNight: number
    pricePerHour: number
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
      const hkStatus = {
        available: 'clean',
        dirty: 'dirty',
        cleaning: 'cleaning',
        occupied: 'inspected',
        maintenance: 'dirty',
        blocked: 'dirty'
      }[status] as any

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
    const occupied = rooms.filter(r => r.status === 'occupied').length
    const available = rooms.filter(r => r.status === 'available').length
    const dirty = rooms.filter(r => r.status === 'dirty').length
    const maintenance = rooms.filter(r => r.status === 'maintenance').length

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
```

### apps/api/src/controllers/rooms.controller.ts
```typescript
import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { roomsService } from '../services/rooms.service'
import { AuthRequest } from '../middleware/authenticate'

// GET /rooms
export const getRooms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, floor, type } = req.query
  const rooms = await roomsService.getRooms(req.user!.hotelId, {
    status: status as any,
    floor: floor ? Number(floor) : undefined,
    type: type as any
  })
  res.json(new ApiResponse(rooms))
})

// GET /rooms/stats
export const getRoomStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await roomsService.getRoomStats(req.user!.hotelId)
  res.json(new ApiResponse(stats))
})

// GET /rooms/floors
export const getFloors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const floors = await roomsService.getFloors(req.user!.hotelId)
  res.json(new ApiResponse(floors))
})

// GET /rooms/:id
export const getRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const room = await roomsService.getRoom(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(room))
})

// POST /rooms — admin only
export const createRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const room = await roomsService.createRoom(req.user!.hotelId, req.body)
  res.status(201).json(new ApiResponse(room, 'Chumba limeundwa'))
})

// PATCH /rooms/:id — admin only
export const updateRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const room = await roomsService.updateRoom(req.params.id, req.user!.hotelId, req.body)
  res.json(new ApiResponse(room, 'Chumba limesasishwa'))
})

// PATCH /rooms/:id/status
export const updateRoomStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, notes } = req.body
  const room = await roomsService.updateRoomStatus(
    req.params.id,
    req.user!.hotelId,
    status,
    req.user!.id,
    notes
  )
  res.json(new ApiResponse(room, 'Hali ya chumba imesasishwa'))
})
```

### apps/api/src/routes/rooms.routes.ts
```typescript
import { Router } from 'express'
import {
  getRooms, getRoom, createRoom, updateRoom,
  updateRoomStatus, getRoomStats, getFloors
} from '../controllers/rooms.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

// All routes require authentication
router.use(authenticate)

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  name: z.string().min(1),
  floor: z.number().optional(),
  type: z.enum(['standard','deluxe','family','suite','presidential','superior','conference']),
  pricePerNight: z.number().positive(),
  pricePerHour: z.number().positive().optional(),
  capacity: z.number().positive().optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['available','occupied','dirty','cleaning','maintenance','blocked']),
  notes: z.string().optional(),
})

router.get('/', getRooms)
router.get('/stats', getRoomStats)
router.get('/floors', getFloors)
router.get('/:id', getRoom)
router.post('/', authorize('admin'), validate(createRoomSchema), createRoom)
router.patch('/:id', authorize('admin'), updateRoom)
router.patch('/:id/status', validate(updateStatusSchema), updateRoomStatus)

export default router
```

---

## TASK 3B — Rooms Service Tests

### apps/api/src/services/rooms.service.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoomsService } from './rooms.service'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    room: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    housekeepingLog: { create: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      room: { update: vi.fn().mockResolvedValue({ id: '1', status: 'dirty' }) },
      housekeepingLog: { create: vi.fn() }
    }))
  })),
  RoomStatus: {},
  RoomType: {}
}))

const service = new RoomsService()

describe('RoomsService', () => {

  describe('getRooms', () => {
    it('should return rooms for a hotel', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findMany.mockResolvedValue([
        { id: '1', roomNumber: '111', status: 'available', bookings: [], housekeepingLogs: [] }
      ])
      const rooms = await service.getRooms('hotel-1')
      expect(Array.isArray(rooms)).toBe(true)
    })
  })

  describe('createRoom', () => {
    it('should throw conflict if room number exists', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue({ id: '1', roomNumber: '111' })

      await expect(service.createRoom('hotel-1', {
        roomNumber: '111',
        name: 'Test Room',
        type: 'standard' as any,
        pricePerNight: 50000
      })).rejects.toThrow('tayari lipo')
    })

    it('should create room if number is unique', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findUnique.mockResolvedValue(null)
      mock.room.create.mockResolvedValue({
        id: '2', roomNumber: '112', name: 'New Room', status: 'available'
      })

      const room = await service.createRoom('hotel-1', {
        roomNumber: '112',
        name: 'New Room',
        type: 'standard' as any,
        pricePerNight: 60000
      })
      expect(room.roomNumber).toBe('112')
    })
  })

  describe('getRoomStats', () => {
    it('should calculate occupancy rate correctly', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mock = new PrismaClient() as any
      mock.room.findMany.mockResolvedValue([
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
```

---

## TASK 3C — Frontend Types

### apps/web/types/room.ts
```typescript
export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance' | 'blocked'
export type RoomType = 'standard' | 'deluxe' | 'family' | 'suite' | 'presidential' | 'superior' | 'conference'

export interface Room {
  id: string
  roomNumber: string
  name: string
  floor: number
  type: RoomType
  status: RoomStatus
  pricePerNight: number
  pricePerHour?: number
  capacity: number
  description?: string
  amenities: string[]
  images: string[]
  bookings: RoomBooking[]
  housekeepingLogs: HousekeepingLog[]
}

export interface RoomBooking {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  guest: {
    id: string
    fullName: string
    phone: string
    nationality?: string
  }
}

export interface HousekeepingLog {
  id: string
  status: string
  notes?: string
  checklist: { task: string; done: boolean }[]
  updatedAt: string
  updatedBy?: { id: string; fullName: string }
}

export interface RoomStats {
  total: number
  occupied: number
  available: number
  dirty: number
  maintenance: number
  occupancyRate: number
}

// ─── UI Helpers ──────────────────────────────────────

export const ROOM_STATUS_CONFIG: Record<RoomStatus, {
  label: string
  labelSw: string
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  available:   { label: 'Available',    labelSw: 'Inapatikana',    bgClass: 'bg-white',       textClass: 'text-gray-700',   borderClass: 'border-gray-200' },
  occupied:    { label: 'Occupied',     labelSw: 'Imejazwa',       bgClass: 'bg-blue-50',     textClass: 'text-blue-700',   borderClass: 'border-blue-200' },
  dirty:       { label: 'Dirty',        labelSw: 'Chafu',          bgClass: 'bg-amber-50',    textClass: 'text-amber-700',  borderClass: 'border-amber-200' },
  cleaning:    { label: 'Cleaning',     labelSw: 'Inasafishwa',    bgClass: 'bg-indigo-50',   textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
  maintenance: { label: 'Maintenance',  labelSw: 'Matengenezo',    bgClass: 'bg-red-50',      textClass: 'text-red-700',    borderClass: 'border-red-200' },
  blocked:     { label: 'Blocked',      labelSw: 'Imezuiwa',       bgClass: 'bg-gray-100',    textClass: 'text-gray-500',   borderClass: 'border-gray-300' },
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  standard:     'Standard',
  deluxe:       'Deluxe',
  family:       'Family',
  suite:        'Suite',
  presidential: 'Presidential',
  superior:     'Superior',
  conference:   'Conference',
}
```

---

## TASK 3D — Rooms Hook

### apps/web/hooks/useRooms.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Room, RoomStats, RoomStatus } from '@/types/room'

export function useRooms(filters?: { status?: RoomStatus; floor?: number }) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.floor) params.append('floor', String(filters.floor))

  return useQuery<Room[]>({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      const res = await api.get(`/rooms?${params}`)
      return res.data.data
    },
    staleTime: 30_000, // 30 seconds
  })
}

export function useRoom(id: string) {
  return useQuery<Room>({
    queryKey: ['rooms', id],
    queryFn: async () => {
      const res = await api.get(`/rooms/${id}`)
      return res.data.data
    },
    enabled: !!id
  })
}

export function useRoomStats() {
  return useQuery<RoomStats>({
    queryKey: ['rooms', 'stats'],
    queryFn: async () => {
      const res = await api.get('/rooms/stats')
      return res.data.data
    },
    refetchInterval: 60_000, // Refresh every minute
  })
}

export function useFloors() {
  return useQuery<number[]>({
    queryKey: ['rooms', 'floors'],
    queryFn: async () => {
      const res = await api.get('/rooms/floors')
      return res.data.data
    }
  })
}

export function useUpdateRoomStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, notes }: {
      id: string; status: RoomStatus; notes?: string
    }) => {
      const res = await api.patch(`/rooms/${id}/status`, { status, notes })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    }
  })
}
```

---

## TASK 3E — Room Grid Page (YowStay Style)

### apps/web/app/(dashboard)/rooms/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { useRooms, useRoomStats, useFloors } from '@/hooks/useRooms'
import RoomGrid from '@/components/rooms/RoomGrid'
import RoomDetailModal from '@/components/rooms/RoomDetailModal'
import { Room } from '@/types/room'

export default function RoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const { data: rooms = [], isLoading } = useRooms({ floor: selectedFloor })
  const { data: stats } = useRoomStats()
  const { data: floors = [] } = useFloors()

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Room Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hali ya vyumba vyote kwa wakati huu
          </p>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total rooms" value={stats.total} />
          <StatsCard label="Available" value={stats.available} color="text-green-600" />
          <StatsCard label="Occupied" value={stats.occupied} color="text-blue-600" />
          <StatsCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} color="text-primary" />
        </div>
      )}

      {/* Room grid card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Room Status</h2>

          {/* Floor selector */}
          <select
            value={selectedFloor ?? ''}
            onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : undefined)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
          >
            <option value="">All floors</option>
            {floors.map(floor => (
              <option key={floor} value={floor}>Floor {floor}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <RoomGrid rooms={rooms} onRoomClick={setSelectedRoom} />
          )}
        </div>

        {/* Legend */}
        <div className="px-6 pb-4 flex items-center gap-5 flex-wrap">
          {[
            { color: 'bg-gray-200', label: 'Do not disturb' },
            { color: 'bg-amber-100', label: 'Need cleaning' },
            { color: 'bg-blue-100', label: 'Booked' },
            { color: 'bg-white border border-gray-200', label: 'Available room' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room detail modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  )
}

// ─── Stats Card ───────────────────────────────────────
function StatsCard({
  label, value, color = 'text-gray-900'
}: {
  label: string; value: string | number; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
```

### apps/web/components/rooms/RoomGrid.tsx
```typescript
import { Room } from '@/types/room'
import RoomCard from './RoomCard'

interface Props {
  rooms: Room[]
  onRoomClick: (room: Room) => void
}

export default function RoomGrid({ rooms, onRoomClick }: Props) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Hakuna vyumba vinavyopatikana</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-6 gap-2 md:grid-cols-4 sm:grid-cols-3">
      {rooms.map(room => (
        <RoomCard
          key={room.id}
          room={room}
          onClick={() => onRoomClick(room)}
        />
      ))}
    </div>
  )
}
```

### apps/web/components/rooms/RoomCard.tsx
```typescript
import { Room, ROOM_STATUS_CONFIG } from '@/types/room'
import { cn } from '@/lib/utils'
import { User, Wrench, Sparkles } from 'lucide-react'

interface Props {
  room: Room
  onClick: () => void
}

export default function RoomCard({ room, onClick }: Props) {
  const config = ROOM_STATUS_CONFIG[room.status]
  const currentBooking = room.bookings?.[0]
  const guestName = currentBooking?.guest?.fullName

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border p-2.5 text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer",
        config.bgClass,
        config.borderClass
      )}
    >
      {/* Room number */}
      <div className="flex items-start justify-between mb-1.5">
        <span className={cn("text-base font-semibold", config.textClass)}>
          {room.roomNumber}
        </span>
        {/* Status icon */}
        <span className="text-gray-400">
          {room.status === 'occupied' && <User size={12} />}
          {room.status === 'maintenance' && <Wrench size={12} />}
          {(room.status === 'dirty' || room.status === 'cleaning') && <Sparkles size={12} />}
        </span>
      </div>

      {/* Guest info (if occupied/booked) */}
      {currentBooking && (
        <div>
          {guestName && (
            <p className="text-[10px] font-medium text-gray-700 truncate leading-tight">
              {guestName}
            </p>
          )}
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {formatDate(currentBooking.checkIn)} – {formatDate(currentBooking.checkOut)}
          </p>
        </div>
      )}

      {/* Status label for non-occupied */}
      {!currentBooking && room.status !== 'available' && (
        <p className={cn("text-[10px] font-medium leading-tight", config.textClass)}>
          {config.labelSw}
        </p>
      )}
    </button>
  )
}
```

### apps/web/components/rooms/RoomDetailModal.tsx
```typescript
'use client'

import { Room, ROOM_STATUS_CONFIG, ROOM_TYPE_LABELS } from '@/types/room'
import { useUpdateRoomStatus } from '@/hooks/useRooms'
import { X, User, Calendar, Clock, Wifi, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  room: Room
  onClose: () => void
}

// Default housekeeping checklist
const DEFAULT_CHECKLIST = [
  'Tupa takataka na kubadilisha mfuko',
  'Fua au piga utupu sakafu',
  'Weka tishu, sabuni na vifaa vya bafu',
  'Futa na safisha nyuso zote (meza, taa, rafu)',
  'Safisha choo, sinki na bafu/shower',
  'Badilisha taulo zilizotumika',
]

export default function RoomDetailModal({ room, onClose }: Props) {
  const config = ROOM_STATUS_CONFIG[room.status]
  const { mutate: updateStatus, isPending } = useUpdateRoomStatus()
  const currentBooking = room.bookings?.[0]

  const handleStatusChange = (status: typeof room.status) => {
    updateStatus({ id: room.id, status }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-[560px] max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">
                Room {room.roomNumber}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                config.bgClass, config.textClass
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {room.name} · Floor {room.floor} ·{' '}
              {ROOM_TYPE_LABELS[room.type]} ·{' '}
              Watu {room.capacity}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Current guest */}
          {currentBooking && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Mgeni wa Sasa</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {currentBooking.guest.fullName}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(currentBooking.checkIn).toLocaleDateString('en-GB')}
                  {' → '}
                  {new Date(currentBooking.checkOut).toLocaleDateString('en-GB')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Ref: {currentBooking.bookingRef}
                </span>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between py-3 border-y border-gray-100">
            <span className="text-sm text-gray-500">Bei kwa usiku</span>
            <span className="text-sm font-semibold text-gray-900">
              TZS {room.pricePerNight.toLocaleString()}
            </span>
          </div>

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={14} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Vifaa vya Chumba</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map(a => (
                  <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Housekeeping checklist */}
          {(room.status === 'dirty' || room.status === 'cleaning') && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Kazi za Usafi</p>
              <div className="space-y-2">
                {DEFAULT_CHECKLIST.map((task, i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5 group-hover:border-primary transition-colors" />
                    <span className="text-sm text-gray-600">{task}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status actions */}
          <div className="space-y-2 pt-2">
            {room.status === 'dirty' && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                onClick={() => handleStatusChange('cleaning')}
                disabled={isPending}
              >
                Anza Kusafisha
              </Button>
            )}
            {room.status === 'cleaning' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={() => handleStatusChange('available')}
                disabled={isPending}
              >
                <Check size={15} className="mr-1.5" />
                Imekamilika — Chumba Safi
              </Button>
            )}
            {room.status === 'available' && (
              <Button
                variant="outline"
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => handleStatusChange('maintenance')}
                disabled={isPending}
              >
                Weka Matengenezo
              </Button>
            )}
            {room.status === 'maintenance' && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white"
                onClick={() => handleStatusChange('available')}
                disabled={isPending}
              >
                Matengenezo Yamekamilika
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
```

---

## TASK 3F — Setup React Query Provider

### apps/web/app/layout.tsx — Ongeza QueryClientProvider:
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 }
    }
  }))

  return (
    <html lang="sw">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

---

## CHECKPOINT — Verify Task 3

```bash
# Tests
cd apps/api && npm run test
# Expected: Tests 7+ pass (4 auth + 3 rooms)

# API manual tests (PowerShell)
# 1. Login first, get token
$token = (Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@g4homez.com","password":"Admin@2026!"}').data.accessToken

# 2. Get rooms
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/rooms" -Headers @{Authorization="Bearer $token"}

# 3. Get stats
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/rooms/stats" -Headers @{Authorization="Bearer $token"}
```

**UI Tests:**
- [ ] http://localhost:3000/rooms → Room grid inaonyesha
- [ ] Vyumba 4 vya seed vinaonyesha (111, 108, 109, CONF)
- [ ] Stats cards zinaonyesha (Total, Available, Occupied, Rate)
- [ ] Floor selector inafanya kazi
- [ ] Click room card → modal inafunguka
- [ ] Modal inaonyesha: jina la chumba, bei, amenities
- [ ] Status change buttons zinafanya kazi
- [ ] Room card colors zinaendana na status (blue=occupied, amber=dirty, white=available)
- [ ] **Design check**: Hakuna purple, hakuna gradient — white + blue tu

---

## KUMBUKA KWA GEMINI/AI AGENT

1. **Grid columns**: `grid-cols-6` desktop, `grid-cols-4` tablet, `grid-cols-3` mobile
2. **Room card colors**: Lazima zitoke `ROOM_STATUS_CONFIG` — usiweke hardcoded colors
3. **Modal backdrop**: `bg-black/20` — subtle, si heavy overlay
4. **Status changes**: Lazima zitumie `prisma.$transaction` — room + housekeeping log pamoja
5. **Design check ya mwisho**: Angalia YowStay reference — modal iwe safi kama screenshot
6. **NO purple anywhere** — hata kwenye hover states

---

*StayFlow Phase 1 Task 3 — Rooms CRUD + Room Grid UI*
*Next: Task 4 — Availability Service + Booking CRUD*
