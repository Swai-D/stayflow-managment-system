import { Router } from 'express'
import {
  getBookings, getBooking, createBooking, updateBooking,
  cancelBooking, checkIn, checkOut, checkAvailability, getBookingStats
} from '../controllers/bookings.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const createBookingSchema = z.object({
  roomId:     z.string().uuid(),
  checkIn:    z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  checkOut:   z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  startTime:  z.string().optional(),
  endTime:    z.string().optional(),
  adults:     z.number().min(1).default(1),
  children:   z.number().min(0).default(0),
  source:     z.enum(['online_self', 'staff_entry', 'walk_in']).default('staff_entry'),
  specialRequests: z.string().optional(),
  // Guest — either existing id or new guest data
  guestId:    z.string().uuid().optional(),
  guestData:  z.object({
    fullName:    z.string().min(2),
    phone:       z.string().min(9),
    email:       z.string().email().optional(),
    idType:      z.string().optional(),
    idNumber:    z.string().optional(),
    nationality: z.string().optional(),
  }).optional(),
  addonIds: z.array(z.object({
    addonId:  z.string().uuid(),
    quantity: z.number().min(1),
  })).optional(),
}).refine(data => data.guestId || data.guestData, {
  message: 'Lazima uweke guestId au guestData'
})

const cancelSchema = z.object({
  reason: z.string().optional()
})

router.get('/',            getBookings)
router.get('/stats',       getBookingStats)
router.get('/availability',checkAvailability)
router.get('/:id',         getBooking)
router.post('/',           validate(createBookingSchema), createBooking)
router.patch('/:id',       updateBooking)
router.delete('/:id',      authorize('admin', 'receptionist'), validate(cancelSchema), cancelBooking)
router.post('/:id/check-in',  checkIn)
router.post('/:id/check-out', checkOut)

export default router
