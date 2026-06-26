import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { paymentsService } from '../services/payments.service'
import { snippeService } from '../services/snippe.service'
import { pdfService } from '../services/pdf.service'
import { webhookService } from '../services/webhook.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

const prisma = new PrismaClient()

export const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { status, search, page = 1, limit = 20, dateFrom, dateTo, period } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  let dateFilter: any = {}
  if (period) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (period) {
      case 'today':
        dateFilter = { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) }
        break
      case 'week':
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
        dateFilter = { gte: startOfWeek }
        break
      case 'month':
        dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
        break
      case 'year':
        dateFilter = { gte: new Date(now.getFullYear(), 0, 1) }
        break
    }
  } else if (dateFrom || dateTo) {
    dateFilter = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) })
    }
  }

  const where: any = {
    booking: { hotelId },
    ...(status && { status }),
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    ...(search && {
      OR: [
        { booking: { bookingRef: { contains: search as string, mode: 'insensitive' } } },
        { booking: { guest: { fullName: { contains: search as string, mode: 'insensitive' } } } },
        { booking: { company: { name: { contains: search as string, mode: 'insensitive' } } } }
      ]
    })
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            bookingRef: true,
            bookingType: true,
            guest: { select: { fullName: true } },
            company: { select: { name: true } }
          }
        },
        receivedBy: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.payment.count({ where })
  ])

  res.json(new ApiResponse(payments, 'OK', {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit))
  }))
})

export const getPaymentStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { dateFrom, dateTo, period } = req.query

  let dateFilter: { from?: Date; to?: Date } = {}
  if (period) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (period) {
      case 'today':
        dateFilter = { from: startOfDay, to: new Date(startOfDay.getTime() + 86400000) }
        break
      case 'week':
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
        dateFilter = { from: startOfWeek }
        break
      case 'month':
        dateFilter = { from: new Date(now.getFullYear(), now.getMonth(), 1) }
        break
      case 'year':
        dateFilter = { from: new Date(now.getFullYear(), 0, 1) }
        break
    }
  } else {
    dateFilter = {
      ...(dateFrom && { from: new Date(dateFrom as string) }),
      ...(dateTo && { to: new Date(dateTo as string) })
    }
  }

  const stats = await paymentsService.getPaymentStats(hotelId, dateFilter.from, dateFilter.to)
  res.json(new ApiResponse(stats))
})

export const recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await paymentsService.recordPayment({
    ...req.body,
    receivedById: req.user!.id
  })

  // Dispatch payment webhook
  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } })
  if (booking) {
    webhookService.dispatch(booking.hotelId, 'payment.received', { payment, booking }).catch(console.error)
  }

  // Auto-generate receipt
  try {
    await pdfService.generateReceipt(payment.id)
  } catch (err) {
    console.error('Failed to generate receipt:', err)
  }

  res.status(201).json(new ApiResponse(payment, 'Malipo yamerekodiwa'))
})

export const initiateSnippePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { bookingId, amount, phone, network, type } = req.body
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true }
  })
  if (!booking) throw ApiError.notFound('Booking haikupatikana')

  const fullName = booking.guest.fullName
  const names = fullName.trim().split(/\s+/)
  const firstName = names[0]
  const lastName = names.length > 1 ? names.slice(1).join(' ') : 'Guest'

  if (type === 'card') {
    const payment = await snippeService.initiateCard({
      amount,
      phoneNumber: phone || booking.guest.phone,
      redirectUrl: `${process.env.APP_URL}/receipt/${booking.id}`,
      cancelUrl: `${process.env.APP_URL}/reservations/${booking.id}`,
      customer: {
        firstName,
        lastName,
        email: booking.guest.email || 'guest@example.com',
        address: 'Tanzania',
        city: 'Dar es Salaam',
        state: 'Dar es Salaam',
        postcode: '00000',
        country: 'TZ'
      },
      metadata: { bookingId: booking.id, bookingRef: booking.bookingRef }
    })
    res.json(new ApiResponse({ paymentUrl: payment.paymentUrl }, 'Card payment initiated'))
  } else {
    const payment = await snippeService.initiateMobileMoney({
      amount,
      phone: phone || booking.guest.phone,
      customer: {
        firstName,
        lastName,
        email: booking.guest.email || 'guest@example.com'
      },
      metadata: { bookingId: booking.id, bookingRef: booking.bookingRef, network }
    })
    res.json(new ApiResponse(payment, 'Mobile payment initiated'))
  }
})

export const handleSnippeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-webhook-signature'] as string
  const timestamp = req.headers['x-webhook-timestamp'] as string
  
  // Note: req.body is a Buffer due to express.raw in app.ts
  const event = snippeService.verifyWebhook({
    rawBody: req.body,
    signature,
    timestamp
  })

  if (!event) {
    res.status(401).json({ message: 'Invalid signature' })
    return
  }

  // Handle different event types
  const { type, data } = event as any
  
  if (type === 'payment.completed') {
    // Process successful payment
    // data.reference matches bookingRef in metadata or snippeRef
    const bookingRef = data.metadata?.bookingRef
    const amount = data.amount.value

    const booking = await prisma.booking.findUnique({
      where: { bookingRef }
    })

    if (booking) {
      await paymentsService.recordPayment({
        bookingId: booking.id,
        amount: amount,
        method: data.payment_type === 'card' ? 'visa' : 'mpesa', // map accordingly
        notes: `Snippe Ref: ${data.reference}`,
        status: 'completed'
      })
    }
  }

  res.json({ received: true })
})