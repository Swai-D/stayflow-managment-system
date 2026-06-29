import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import {
  getStaff, createStaff, updateStaff, deactivateStaff,
  clockIn, clockOut, getShifts,
  requestLeave, reviewLeave, getLeaves,
  generatePayroll, getPayroll, approvePayroll, markPaid,
  getPayrollSummary
} from '../controllers/staff.controller'

const router = Router()
router.use(authenticate)

// ─── Staff accounts (Admin full, Receptionist view) ─
router.get('/', authorize('admin', 'receptionist'), getStaff)
router.post('/', authorize('admin'), createStaff)
router.patch('/:id', authorize('admin'), updateStaff)
router.delete('/:id', authorize('admin'), deactivateStaff)

// ─── Shifts (All staff — self + admin) ────────────
router.post('/shifts/clock-in', clockIn)
router.post('/shifts/clock-out', clockOut)
router.get('/shifts', getShifts)

// ─── Leave (All staff request, admin approves) ────
router.get('/leave', getLeaves)
router.post('/leave', requestLeave)
router.patch('/leave/:id', authorize('admin'), reviewLeave)

// ─── Payroll (Admin only) ─────────────────────────
router.get('/payroll', authorize('admin'), getPayroll)
router.post('/payroll/generate', authorize('admin'), generatePayroll)
router.patch('/payroll/:id/approve', authorize('admin'), approvePayroll)
router.patch('/payroll/:id/mark-paid', authorize('admin'), markPaid)
router.get('/payroll/summary', authorize('admin'), getPayrollSummary)

export default router
