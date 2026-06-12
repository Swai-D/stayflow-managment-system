import { Router } from 'express'
import { recordPayment, initiateSnippePayment, handleSnippeWebhook } from '../controllers/payments.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

const recordPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['mpesa', 'tigo_pesa', 'airtel_money', 'halo_pesa', 'cash', 'bank_transfer', 'visa', 'mastercard']),
  notes: z.string().optional(),
  mpesaRef: z.string().optional(),
  bankRef: z.string().optional(),
})

router.post('/', authenticate, validate(recordPaymentSchema), recordPayment)
router.post('/snippe/initiate', authenticate, initiateSnippePayment)
router.post('/snippe/webhook', handleSnippeWebhook)

export default router
