import { Router } from 'express'
import {
  createInvoice, getInvoices, getInvoice, updateInvoice,
  deleteInvoice, recordInvoicePayment, generateCompanyInvoice, getInvoicePdf
} from '../controllers/invoices.controller'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const createInvoiceSchema = z.object({
  type: z.enum(['individual', 'company']),
  bookingId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  amount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive(),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  notes: z.string().optional()
}).refine(data => {
  if (data.type === 'individual') return !!data.bookingId
  if (data.type === 'company') return !!data.companyId
  return false
}, { message: 'bookingId au companyId inahitajika kulingana na type' })

const companyInvoiceSchema = z.object({
  companyId: z.string().uuid(),
  bookingIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional()
})

const recordPaymentSchema = z.object({
  amount: z.number().positive()
})

router.get('/', requirePermission('invoices:view'), getInvoices)
router.post('/', requirePermission('invoices:manage'), validate(createInvoiceSchema), createInvoice)
router.get('/:id', requirePermission('invoices:view'), getInvoice)
router.patch('/:id', requirePermission('invoices:manage'), updateInvoice)
router.delete('/:id', requirePermission('invoices:manage'), deleteInvoice)
router.post('/:id/payment', requirePermission('payments:record'), validate(recordPaymentSchema), recordInvoicePayment)
router.post('/company/generate', requirePermission('invoices:manage'), validate(companyInvoiceSchema), generateCompanyInvoice)
router.get('/:id/pdf', requirePermission('invoices:view'), getInvoicePdf)

export default router
