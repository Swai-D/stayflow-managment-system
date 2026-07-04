import { Router } from 'express'
import { createExpense, getExpenses, getExpenseStats } from '../controllers/expenses.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { requirePermission } from '../middleware/requirePermission'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['salary', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']),
  description: z.string().min(3),
  date: z.string().optional()
})

router.get('/', requirePermission('reports:view'), getExpenses)
router.get('/stats', requirePermission('reports:view'), getExpenseStats)
router.post('/', requirePermission('reports:view'), validate(expenseSchema), createExpense)

export default router
