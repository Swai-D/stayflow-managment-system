import { Router } from 'express'
import { createExpense, getExpenses, getExpenseStats } from '../controllers/expenses.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { z } from 'zod'

const router = Router()
router.use(authenticate)

const expenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['salary', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']),
  description: z.string().min(3),
  date: z.string().optional()
})

router.get('/', getExpenses)
router.get('/stats', getExpenseStats)
router.post('/', validate(expenseSchema), createExpense)

export default router
