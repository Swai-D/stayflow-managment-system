import { Router } from 'express'
import {
  getRooms, getRoom, createRoom, updateRoom,
  updateRoomStatus, getRoomStats, getFloors,
  generateRoomQRCode
} from '../controllers/rooms.controller'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
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

router.get('/', requirePermission('rooms:view'), getRooms)
router.get('/stats', requirePermission('rooms:view'), getRoomStats)
router.get('/floors', requirePermission('rooms:view'), getFloors)
router.get('/:id', requirePermission('rooms:view'), getRoom)
router.post('/', requirePermission('rooms:manage'), validate(createRoomSchema), createRoom)
router.patch('/:id', requirePermission('rooms:manage'), updateRoom)
router.patch('/:id/status', requirePermission('rooms:manage', 'housekeeping:manage'), validate(updateStatusSchema), updateRoomStatus)
router.post('/:id/qr-code', requirePermission('rooms:manage'), generateRoomQRCode)

export default router
