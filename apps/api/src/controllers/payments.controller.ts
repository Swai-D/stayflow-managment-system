import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { paymentsService } from '../services/payments.service'
import { snippeService } from '../services/snippe.service'
import { pdfService } from '../services/pdf.service'
import { AuthRequest } from '../middleware/authenticate'

const prisma = new PrismaClient()

export const recordPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await paymentsService.recordPayment({
    ...req.body,
    receivedById: req.user!.id
  })

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
