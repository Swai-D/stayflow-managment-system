import { Router } from 'express'
import { recordPayment, initiateSnippePayment, handleSnippeWebhook, getPayments, getPaymentStats } from '../controllers/payments.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { paymentsService } from '../services/payments.service'
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

router.get('/', authenticate, getPayments)
router.get('/stats', authenticate, getPaymentStats)
router.post('/', authenticate, validate(recordPaymentSchema), recordPayment)
router.get('/booking/:bookingId', authenticate, asyncHandler(async (req, res) => {
  const payments = await paymentsService.getPayments(req.params.bookingId)
  res.json(new ApiResponse(payments))
}))
router.post('/snippe/initiate', authenticate, initiateSnippePayment)
router.post('/snippe/webhook', handleSnippeWebhook)

export default router
