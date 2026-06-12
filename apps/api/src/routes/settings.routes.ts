import { Router } from 'express'
import { 
  getHotelSettings, updateHotelSettings, getUsers, 
  createUser, updateUser, deleteUser, getAuditLogs 
} from '../controllers/settings.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const userSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'receptionist', 'housekeeping']),
  phone: z.string().optional()
})

router.get('/hotel', getHotelSettings)
router.patch('/hotel', authorize('admin'), updateHotelSettings)

router.get('/users', authorize('admin'), getUsers)
router.post('/users', authorize('admin'), validate(userSchema), createUser)
router.patch('/users/:id', authorize('admin'), updateUser)
router.delete('/users/:id', authorize('admin'), deleteUser)

router.get('/audit-log', authorize('admin'), getAuditLogs)

export default router
