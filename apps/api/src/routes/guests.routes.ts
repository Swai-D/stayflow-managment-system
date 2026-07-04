import { Router } from 'express'
import { getGuests, getGuest, createGuest, updateGuest, getRegisteredGuests, getGuestStats } from '../controllers/guests.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { requirePermission } from '../middleware/requirePermission'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const guestSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().optional(),
  idType: z.enum(['national_id', 'passport', 'drivers_license', 'voter_id']).optional(),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/', requirePermission('guests:view'), getGuests)
router.get('/stats', requirePermission('guests:view'), getGuestStats)
router.get('/registered', requirePermission('guests:view'), getRegisteredGuests)
router.get('/:id', requirePermission('guests:view'), getGuest)
router.post('/', requirePermission('guests:manage'), validate(guestSchema), createGuest)
router.patch('/:id', requirePermission('guests:manage'), validate(guestSchema.partial()), updateGuest)

export default router
