import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import { getBusinessAdvice, refreshBusinessAdvice } from '../controllers/advisor.controller'

const router = Router()
router.use(authenticate)

router.get('/business-advice', requirePermission('reports:view'), getBusinessAdvice)
router.post('/business-advice/refresh', requirePermission('reports:view'), refreshBusinessAdvice)

export default router
