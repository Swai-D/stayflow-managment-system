import { Router } from 'express'
import { login, refresh, logout, getMe } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { loginSchema } from '../middleware/validate'

const router = Router()

router.post('/login', validate(loginSchema), login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)

export default router
