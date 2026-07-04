import { Router } from 'express'
import {
  createCompany, getCompanies, getCompany,
  updateCompany, deleteCompany
} from '../controllers/companies.controller'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
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

router.get('/', requirePermission('companies:view'), getCompanies)
router.post('/', requirePermission('companies:manage'), validate(companySchema), createCompany)
router.get('/:id', requirePermission('companies:view'), getCompany)
router.patch('/:id', requirePermission('companies:manage'), validate(companySchema.partial()), updateCompany)
router.delete('/:id', requirePermission('companies:manage'), deleteCompany)

export default router
