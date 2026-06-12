import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler'

// Routes
import authRoutes from './routes/auth.routes'
import publicRoutes from './routes/public.routes'
import bookingRoutes from './routes/bookings.routes'
import roomRoutes from './routes/rooms.routes'
import guestRoutes from './routes/guests.routes'
import housekeepingRoutes from './routes/housekeeping.routes'
import paymentRoutes from './routes/payments.routes'
import expenseRoutes from './routes/expenses.routes'
import reportRoutes from './routes/reports.routes'
import settingsRoutes from './routes/settings.routes'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))

// Special raw body for Snippe webhooks (must be before express.json)
app.use('/api/v1/payments/snippe/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'StayFlow API', time: new Date().toISOString() })
})

// API Routes
app.use('/api/v1/public', publicRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/bookings', bookingRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/guests', guestRoutes)
app.use('/api/v1/housekeeping', housekeepingRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/expenses', expenseRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/settings', settingsRoutes)

// Error handler (must be last)
app.use(errorHandler)

export default app
