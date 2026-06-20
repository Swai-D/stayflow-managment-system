import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import {
  getSellableItems, getActiveBookings, postCharge, getFolio,
  voidCharge, getInvoice, sendInvoiceEmail, getInvoicePdf, checkout
} from '../controllers/pos.controller'

const router = Router()
router.use(authenticate)

// POS items & Active bookings: admin, receptionist, waiter
router.get('/items',           authorize('admin', 'receptionist', 'waiter'), getSellableItems)
router.get('/active-bookings', authorize('admin', 'receptionist', 'waiter'), getActiveBookings)

// Post charge: admin, receptionist, waiter
router.post('/charge',         authorize('admin', 'receptionist', 'waiter'), postCharge)

// Folio, Invoice, Checkout: admin, receptionist only
router.get('/folio/:bookingId',   authorize('admin', 'receptionist'), getFolio)
router.get('/invoice/:bookingId', authorize('admin', 'receptionist'), getInvoice)
router.post('/invoice/:bookingId/email', authorize('admin', 'receptionist'), sendInvoiceEmail)
router.get('/invoice/:bookingId/pdf', authorize('admin', 'receptionist'), getInvoicePdf)
router.post('/checkout/:bookingId',authorize('admin', 'receptionist'), checkout)

// Void charge: admin only
router.delete('/charge/:chargeId', authorize('admin'), voidCharge)

export default router