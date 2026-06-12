import { Router } from 'express'
import { getRevenueReport, getOccupancyReport, getDashboardSummary } from '../controllers/reports.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

router.get('/revenue', getRevenueReport)
router.get('/occupancy', getOccupancyReport)
router.get('/summary', getDashboardSummary)

export default router
