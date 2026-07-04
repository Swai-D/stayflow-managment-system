import { Router } from 'express'
import { authenticateGuest } from '../middleware/guest.auth'
import {
  login,
  qrLogin,
  requestOtp,
  verifyOtp,
  verifyActivationToken,
  activate,
  getBooking,
  createRoomServiceOrder,
  createServiceRequest,
  createExtensionRequest,
  getOrders
} from '../controllers/guest.controller'

const router = Router()

// Public auth routes
router.post('/login', login)
router.post('/qr-login', qrLogin)
router.post('/otp', requestOtp)
router.post('/otp/verify', verifyOtp)
router.get('/activate/verify', verifyActivationToken)
router.post('/activate', activate)

// Protected dashboard routes
router.use(authenticateGuest)

router.get('/booking', getBooking)
router.post('/room-service', createRoomServiceOrder)
router.post('/request', createServiceRequest)
router.post('/extend', createExtensionRequest)
router.get('/orders', getOrders)

export default router
