import { Router } from 'express'
import { 
  getHotelSettings, updateHotelSettings, getUsers, 
  createUser, updateUser, deleteUser, getAuditLogs 
} from '../controllers/settings.controller'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().uuid(),
  phone: z.string().optional()
})

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.string().uuid().optional(),
  phone: z.string().optional()
})

router.get('/hotel', requirePermission('settings:view'), getHotelSettings)
router.patch('/hotel', requirePermission('settings:manage'), updateHotelSettings)

router.get('/users', requirePermission('settings:manage'), getUsers)
router.post('/users', requirePermission('settings:manage'), validate(createUserSchema), createUser)
router.patch('/users/:id', requirePermission('settings:manage'), validate(updateUserSchema), updateUser)
router.delete('/users/:id', requirePermission('settings:manage'), deleteUser)

router.get('/audit-log', requirePermission('settings:manage'), getAuditLogs)

export default router
