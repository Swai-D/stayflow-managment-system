import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePermission } from '../middleware/requirePermission'
import {
  getOrders,
  getRequests,
  updateOrderStatus,
  updateRequestStatus,
  getStats
} from '../controllers/guestPortal.controller'

const router = Router()
router.use(authenticate)

router.get('/orders', requirePermission('guest_portal:orders'), getOrders)
router.get('/requests', requirePermission('guest_portal:requests'), getRequests)
router.get('/stats', requirePermission('guest_portal:orders', 'guest_portal:requests'), getStats)
router.patch('/orders/:id/status', requirePermission('guest_portal:orders'), updateOrderStatus)
router.patch('/requests/:id/status', requirePermission('guest_portal:requests'), updateRequestStatus)

export default router
