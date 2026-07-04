import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import {
  getStaff, createStaff, updateStaff, deactivateStaff,
  clockIn, clockOut, getShifts,
  requestLeave, reviewLeave, getLeaves,
  generatePayroll, getPayroll, approvePayroll, markPaid,
  getPayrollSummary
} from '../controllers/staff.controller'

const router = Router()
router.use(authenticate)

// ─── Staff accounts ─
router.get('/', requirePermission('staff:view'), getStaff)
router.post('/', requirePermission('staff:manage'), createStaff)
router.patch('/:id', requirePermission('staff:manage'), updateStaff)
router.delete('/:id', requirePermission('staff:manage'), deactivateStaff)

// ─── Shifts (All authenticated staff) ────────────
router.post('/shifts/clock-in', clockIn)
router.post('/shifts/clock-out', clockOut)
router.get('/shifts', getShifts)

// ─── Leave ────
router.get('/leave', getLeaves)
router.post('/leave', requestLeave)
router.patch('/leave/:id', requirePermission('staff:manage'), reviewLeave)

// ─── Payroll ─────────────────────────
router.get('/payroll', requirePermission('payroll:view'), getPayroll)
router.post('/payroll/generate', requirePermission('payroll:manage'), generatePayroll)
router.patch('/payroll/:id/approve', requirePermission('payroll:manage'), approvePayroll)
router.patch('/payroll/:id/mark-paid', requirePermission('payroll:manage'), markPaid)
router.get('/payroll/summary', requirePermission('payroll:view'), getPayrollSummary)

export default router
