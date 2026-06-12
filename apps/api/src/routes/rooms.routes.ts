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
