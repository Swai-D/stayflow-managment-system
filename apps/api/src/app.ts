import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler'

// Routes
import authRoutes from './routes/auth.routes'
import publicRoutes from './routes/public.routes'
import websiteRoutes from './routes/website.routes'
import bookingRoutes from './routes/bookings.routes'
import roomRoutes from './routes/rooms.routes'
import guestRoutes from './routes/guests.routes'
import housekeepingRoutes from './routes/housekeeping.routes'
import storeRoutes from './routes/store.routes'
import posRoutes from './routes/pos.routes'
import paymentRoutes from './routes/payments.routes'
import invoiceRoutes from './routes/invoices.routes'
import companyRoutes from './routes/companies.routes'
import expenseRoutes from './routes/expenses.routes'
import reportRoutes from './routes/reports.routes'
import searchRoutes from './routes/search.routes'
import advisorRoutes from './routes/advisor.routes'
import settingsRoutes from './routes/settings.routes'
import guestPortalRoutes from './routes/guest.routes'
import developerRoutes from './routes/developer.routes'
import publicApiRoutes from './routes/public-api.routes'

const app = express()

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cors({
  origin: [
    process.env.APP_URL || 'http://localhost:3000',
    'https://buffalo-hotel-website-production.up.railway.app',
    'https://buffalo-hotel-managment-system.up.railway.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://localhost:63747',       // Website (Local)
    'http://127.0.0.1:63747',       // Website (Local IP)
    'http://192.168.1.156:63747',   // Website (Network)
    'http://192.168.1.156:3000',    // Next.js (Network)
    'http://localhost:5173',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://guest.buffalohotel.co.tz',
    'https://guest-portal-production.up.railway.app',
  ],
  credentials: true
}))
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
app.use('/api', websiteRoutes)
app.use('/api/v1/public', publicRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/bookings', bookingRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/guests', guestRoutes)
app.use('/api/v1/housekeeping', housekeepingRoutes)
app.use('/api/v1/store', storeRoutes)
app.use('/api/v1/pos', posRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/invoices', invoiceRoutes)
app.use('/api/v1/companies', companyRoutes)
app.use('/api/v1/expenses', expenseRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/search', searchRoutes)
app.use('/api/v1/advisor', advisorRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/developer', developerRoutes)
app.use('/api/v1/ext', publicApiRoutes)
app.use('/api/guest', guestPortalRoutes)

// Error handler (must be last)
app.use(errorHandler)

export default app
