import { Router } from 'express'
import {
  createCompany, getCompanies, getCompany,
  updateCompany, deleteCompany
} from '../controllers/companies.controller'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const companySchema = z.object({
  name: z.string().min(2, 'Jina la kampuni linahitajika'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  tinNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/', getCompanies)
router.post('/', authorize('admin', 'receptionist'), validate(companySchema), createCompany)
router.get('/:id', getCompany)
router.patch('/:id', authorize('admin', 'receptionist'), validate(companySchema.partial()), updateCompany)
router.delete('/:id', authorize('admin'), deleteCompany)

export default router
