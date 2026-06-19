import { Router } from 'express'
import { getPublicHotel, getPublicRooms, checkPublicAvailability, createPublicBooking } from '../controllers/public.controller'

const router = Router()

router.get('/hotels/:slug', getPublicHotel)
router.get('/hotels/:slug/rooms', getPublicRooms)
router.get('/hotels/:slug/availability', checkPublicAvailability)
router.post('/hotels/:slug/book', createPublicBooking)

export default router
