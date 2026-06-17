import { Router } from 'express'
import { createWebsiteBooking, initiatePayment, getAvailability } from '../controllers/website.controller'

const router = Router()

router.post('/bookings/website', createWebsiteBooking)
router.post('/payments/initiate', initiatePayment)
router.get('/rooms/availability', getAvailability)

export default router
