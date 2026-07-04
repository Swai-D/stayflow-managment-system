import { Router } from 'express'
import { getRevenueReport, getOccupancyReport, getDashboardSummary, getFinancialReport, getCalendarReport } from '../controllers/reports.controller'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'

const router = Router()
router.use(authenticate)

router.get('/revenue', requirePermission('reports:view'), getRevenueReport)
router.get('/occupancy', requirePermission('reports:view'), getOccupancyReport)
router.get('/summary', requirePermission('reports:view'), getDashboardSummary)
router.get('/financial', requirePermission('reports:view'), getFinancialReport)
router.get('/calendar', requirePermission('reports:view'), getCalendarReport)

export default router
