import { Router } from 'express'
import { createWebsiteBooking, initiatePayment, getAvailability, getPaymentNumbers } from '../controllers/website.controller'

const router = Router()

router.post('/bookings/website', createWebsiteBooking)
router.post('/payments/initiate', initiatePayment)
router.get('/rooms/availability', getAvailability)
router.get('/payment-numbers', getPaymentNumbers)

export default router
