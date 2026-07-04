import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import {
  getSellableItems, getActiveBookings, postCharge, getFolio,
  voidCharge, getInvoice, sendInvoiceEmail, getInvoicePdf, checkout
} from '../controllers/pos.controller'

const router = Router()
router.use(authenticate)

// POS items & Active bookings
router.get('/items',           requirePermission('pos:view'), getSellableItems)
router.get('/active-bookings', requirePermission('pos:view'), getActiveBookings)

// Post charge
router.post('/charge',         requirePermission('pos:charge'), postCharge)

// Folio, Invoice, Checkout
router.get('/folio/:bookingId',   requirePermission('pos:view'), getFolio)
router.get('/invoice/:bookingId', requirePermission('pos:view'), getInvoice)
router.post('/invoice/:bookingId/email', requirePermission('pos:view'), sendInvoiceEmail)
router.get('/invoice/:bookingId/pdf',    requirePermission('pos:view'), getInvoicePdf)
router.post('/checkout/:bookingId',      requirePermission('pos:checkout'), checkout)

// Void charge
router.delete('/charge/:chargeId', requirePermission('pos:void'), voidCharge)

export default router