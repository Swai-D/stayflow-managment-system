import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { roomsService } from '../services/rooms.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

// GET /rooms
export const getRooms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, floor, type, search, page, limit } = req.query
  const hotelId = await getSystemHotelId()
  const data = await roomsService.getRooms(hotelId, {
    status: status as any,
    floor: floor ? Number(floor) : undefined,
    type: type as any,
    search: search as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  })
  res.json(new ApiResponse(data))
})

// GET /rooms/stats
export const getRoomStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const stats = await roomsService.getRoomStats(hotelId)
  res.json(new ApiResponse(stats))
})

// GET /rooms/floors
export const getFloors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const floors = await roomsService.getFloors(hotelId)
  res.json(new ApiResponse(floors))
})

// GET /rooms/:id
export const getRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const room = await roomsService.getRoom(req.params.id, hotelId)
  res.json(new ApiResponse(room))
})

// POST /rooms — admin only
export const createRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const room = await roomsService.createRoom(hotelId, req.body)
  res.status(201).json(new ApiResponse(room, 'Chumba limeundwa'))
})

// PATCH /rooms/:id — admin only
export const updateRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const room = await roomsService.updateRoom(req.params.id, hotelId, req.body)
  res.json(new ApiResponse(room, 'Chumba limesasishwa'))
})

// PATCH /rooms/:id/status
export const updateRoomStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, notes } = req.body
  const hotelId = await getSystemHotelId()
  const room = await roomsService.updateRoomStatus(
    req.params.id,
    hotelId,
    status,
    req.user!.id,
    notes
  )
  res.json(new ApiResponse(room, 'Hali ya chumba imesasishwa'))
})
