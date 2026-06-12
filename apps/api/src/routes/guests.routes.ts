import { Router } from 'express'
import { getGuests, getGuest, createGuest, updateGuest } from '../controllers/guests.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
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

router.get('/', getGuests)
router.get('/:id', getGuest)
router.post('/', validate(guestSchema), createGuest)
router.patch('/:id', validate(guestSchema.partial()), updateGuest)

export default router
