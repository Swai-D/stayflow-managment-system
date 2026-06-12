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
