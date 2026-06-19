import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getBusinessAdvice, refreshBusinessAdvice } from '../controllers/advisor.controller'

const router = Router()
router.use(authenticate)

router.get('/business-advice', getBusinessAdvice)
router.post('/business-advice/refresh', refreshBusinessAdvice)

export default router
