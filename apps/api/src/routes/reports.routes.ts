import { Router } from 'express'
import { getRevenueReport, getOccupancyReport, getDashboardSummary, getFinancialReport, getCalendarReport } from '../controllers/reports.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

router.get('/revenue', getRevenueReport)
router.get('/occupancy', getOccupancyReport)
router.get('/summary', getDashboardSummary)
router.get('/financial', getFinancialReport)
router.get('/calendar', getCalendarReport)

export default router
