import { Router } from 'express'
import { getHousekeepingStatus, updateHousekeepingStatus } from '../controllers/housekeeping.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const updateHkSchema = z.object({
  status: z.enum(['clean', 'dirty', 'cleaning', 'inspected']),
  notes: z.string().optional(),
})

router.get('/', getHousekeepingStatus)
router.patch('/:roomId', validate(updateHkSchema), updateHousekeepingStatus)

export default router
