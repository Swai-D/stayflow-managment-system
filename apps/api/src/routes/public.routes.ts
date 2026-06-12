import { Router } from 'express'
import { getPublicHotel, getPublicRooms, createPublicBooking } from '../controllers/public.controller'

const router = Router()

router.get('/hotels/:slug', getPublicHotel)
router.get('/hotels/:slug/rooms', getPublicRooms)
router.post('/hotels/:slug/book', createPublicBooking)

export default router
