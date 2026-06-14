import { Router } from 'express'
import { getRevenueReport, getOccupancyReport, getDashboardSummary, getFinancialReport } from '../controllers/reports.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

router.get('/revenue', getRevenueReport)
router.get('/occupancy', getOccupancyReport)
router.get('/summary', getDashboardSummary)
router.get('/financial', getFinancialReport)

export default router
