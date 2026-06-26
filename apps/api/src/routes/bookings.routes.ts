import { Router } from 'express'
import {
  getBookings, getBooking, createBooking, updateBooking,
  cancelBooking, checkIn, checkOut, checkAvailability, getBookingStats,
  confirmPayment, getTodayCheckouts, extendStay
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
  // Guest — either existing id, legacy guest data, or modern guest list
  guestId:    z.string().uuid().optional(),
  guestData:  z.object({
    fullName:    z.string().min(2),
    phone:       z.string().min(9),
    email:       z.string().email(),
    idType:      z.string().optional(),
    idNumber:    z.string().optional(),
    nationality: z.string().optional(),
  }).optional(),
  guests: z.array(z.object({
    fullName:    z.string().min(2),
    phone:       z.string().optional(),
    email:       z.string().email().optional().or(z.literal('')),
    idType:      z.string().optional(),
    idNumber:    z.string().optional(),
    nationality: z.string().optional(),
    ageCategory: z.enum(['adult', 'child']),
  })).optional(),
  addonIds: z.array(z.object({
    addonId:  z.string().uuid(),
    quantity: z.number().min(1),
  })).optional(),
  // Company booking support
  bookingType: z.enum(['individual', 'company']).default('individual'),
  companyId:   z.string().uuid().optional(),
  companyData: z.object({
    name:          z.string().min(2),
    email:         z.string().email().optional().or(z.literal('')),
    phone:         z.string().optional(),
    address:       z.string().optional(),
    tinNumber:     z.string().optional(),
    contactPerson: z.string().optional(),
    notes:         z.string().optional(),
  }).optional(),
}).refine(data => data.guestId || data.guestData || (data.guests && data.guests.length > 0), {
  message: 'Lazima uweke angalau mgeni mmoja'
}).refine(data => {
  if (data.bookingType === 'company') {
    return !!data.companyId || !!data.companyData
  }
  return true
}, {
  message: 'Kampuni inahitajika kwa ajili ya company booking',
  path: ['companyId']
})

const cancelSchema = z.object({
  reason: z.string().optional()
})

const extendSchema = z.object({
  extraNights: z.number().min(1),
  reason: z.string().optional()
})

router.get('/',            getBookings)
router.get('/stats',       getBookingStats)
router.get('/checkouts/today', getTodayCheckouts)
router.get('/availability',checkAvailability)
router.get('/:id',         getBooking)
router.post('/',           validate(createBookingSchema), createBooking)
router.patch('/:id',       updateBooking)
router.delete('/:id',      authorize('admin', 'receptionist'), validate(cancelSchema), cancelBooking)
router.post('/:id/check-in',  checkIn)
router.post('/:id/check-out', checkOut)
router.post('/:id/extend',    validate(extendSchema), extendStay)
router.post('/:id/confirm-payment', confirmPayment)

export default router
