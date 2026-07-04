import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { bookingsService } from '../services/bookings.service'
import { availabilityService } from '../services/availability.service'
import { paymentsService } from '../services/payments.service'
import { pdfService } from '../services/pdf.service'
import { nextSmsService } from '../services/nextsms.service'
import { brevoService } from '../services/brevo.service'
import { posService } from '../services/pos.service'
import { guestService } from '../services/guest.service'
import { invoicesService } from '../services/invoices.service'
import { webhookService } from '../services/webhook.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'
import { PrismaClient, PaymentMethod } from '@prisma/client'
import { startOfDay, endOfDay } from 'date-fns'

const prisma = new PrismaClient()

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const getBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, source, bookingType, search, dateFrom, dateTo, page, limit } = req.query
  const hotelId = await getSystemHotelId()
  const result = await bookingsService.getBookings(hotelId, {
    status: status as any,
    source: source as any,
    bookingType: bookingType as 'individual' | 'company' | undefined,
    search: search as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  })
  res.json(new ApiResponse(result.bookings, 'OK', result.meta))
})

export const getBookingStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const stats = await bookingsService.getTodayStats(hotelId)
  res.json(new ApiResponse(stats))
})

export const getTodayCheckouts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const today = startOfDay(new Date())
  const tomorrow = endOfDay(today)
  const yesterday = startOfDay(new Date(Date.now() - 86400000))

  const [
    dueToday,
    overdue,
    checkedOutToday,
    pendingInvoices
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        hotelId,
        status: 'checked_in',
        checkOut: { gte: today, lte: tomorrow }
      },
      include: {
        guest: { select: { id: true, fullName: true, phone: true, email: true } },
        room: { select: { id: true, roomNumber: true, type: true } },
        company: { select: { id: true, name: true } },
        payments: true
      },
      orderBy: { checkOut: 'asc' }
    }),
    prisma.booking.findMany({
      where: {
        hotelId,
        status: { in: ['checked_in', 'late_checkout'] },
        checkOut: { lt: today }
      },
      include: {
        guest: { select: { id: true, fullName: true, phone: true, email: true } },
        room: { select: { id: true, roomNumber: true, type: true } },
        company: { select: { id: true, name: true } },
        payments: true
      },
      orderBy: { checkOut: 'asc' }
    }),
    prisma.booking.findMany({
      where: {
        hotelId,
        status: 'checked_out',
        actualCheckOut: { gte: today, lte: tomorrow }
      },
      include: {
        guest: { select: { id: true, fullName: true, phone: true, email: true } },
        room: { select: { id: true, roomNumber: true, type: true } },
        company: { select: { id: true, name: true } },
        payments: true
      },
      orderBy: { actualCheckOut: 'desc' }
    }),
    prisma.invoice.count({
      where: {
        hotelId,
        status: { in: ['sent', 'draft'] },
        invoiceBookings: {
          some: {
            booking: {
              status: { in: ['checked_out', 'late_checkout'] },
              actualCheckOut: { gte: yesterday }
            }
          }
        }
      }
    })
  ])

  const summary = {
    dueTodayCount: dueToday.length,
    overdueCount: overdue.length,
    checkedOutTodayCount: checkedOutToday.length,
    pendingInvoiceCount: pendingInvoices
  }

  res.json(new ApiResponse({
    summary,
    dueToday,
    overdue,
    checkedOutToday
  }))
})

export const checkAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { checkIn, checkOut } = req.query
  if (!checkIn || !checkOut) throw new Error('checkIn na checkOut zinahitajika')

  const hotelId = await getSystemHotelId()
  const rooms = await availabilityService.getAvailableRooms(
    hotelId,
    new Date(checkIn as string),
    new Date(checkOut as string)
  )
  res.json(new ApiResponse(rooms))
})

export const getBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.getBooking(req.params.id, hotelId)
  res.json(new ApiResponse(booking))
})

export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body
  const hotelId = await getSystemHotelId()

  const booking = await bookingsService.createBooking({
    ...body,
    hotelId,
    createdById: req.user!.id,
    checkIn: new Date(body.checkIn),
    checkOut: new Date(body.checkOut),
    bookingType: body.bookingType || 'individual'
  })

  // Dispatch webhook asynchronously
  webhookService.dispatch(hotelId, 'booking.created', booking).catch(console.error)

  // Auto-create guest portal account and send activation email/SMS
  if (booking.guest?.email) {
    const [firstName, ...rest] = booking.guest.fullName.split(' ')
    const lastName = rest.join(' ') || 'Guest'
    guestService.createOrUpdateGuestAccount({
      email: booking.guest.email,
      firstName,
      lastName,
      phone: booking.guest.phone || undefined,
      bookingId: booking.id
    }).catch(err => console.error('[Dashboard Booking] Guest account creation failed:', err.message))
  }

  // Optional: send confirmation SMS with OTP (used by dashboard quick-book flow)
  if (body.sendConfirmationSms && booking.guest?.phone) {
    const otp = generateOtp()
    const otpExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await prisma.guest.update({
      where: { id: booking.guestId },
      data: { dashboardOtp: otp, otpExpiresAt }
    })

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true }
    })

    try {
      await nextSmsService.sendBookingConfirmationWithOtp(
        booking.guest.phone,
        booking.guest.fullName,
        booking.bookingRef,
        otp,
        hotel?.name || 'Buffalo Hotel'
      )
    } catch (err: any) {
      console.error('[Booking Controller] SMS sending failed:', err.message)
    }

    res.status(201).json(new ApiResponse({
      booking,
      otp,
      otpExpiresAt: otpExpiresAt.toISOString(),
      message: 'Booking imeundwa. Activation link imetumwa kwa email na OTP kwa SMS.'
    }))
    return
  }

  res.status(201).json(new ApiResponse(booking, 'Booking imeundwa'))
})

export const confirmPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { method = 'cash', notes } = req.body
  const hotelId = await getSystemHotelId()

  const booking = await prisma.booking.findFirst({
    where: { id, hotelId },
    include: { guest: true, company: true, hotel: true }
  })
  if (!booking) throw ApiError.notFound('Booking haikupatikana')

  if (Number(booking.balanceDue) <= 0) {
    throw ApiError.badRequest('Booking hii tayari imelipwa')
  }

  const amount = Number(booking.balanceDue)

  // 1. Record full payment
  const payment = await paymentsService.recordPayment({
    bookingId: id,
    amount,
    method: method as PaymentMethod,
    receivedById: req.user!.id,
    notes: notes || 'Payment confirmed by staff',
    status: 'completed'
  })

  // 2. Create invoice record (if not exists)
  let invoice = null
  try {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        type: booking.bookingType === 'company' ? 'company' : 'individual',
        status: { not: 'cancelled' },
        invoiceBookings: { some: { bookingId: id } }
      }
    })
    if (!existingInvoice) {
      const createdInvoice = await invoicesService.createInvoice(hotelId, {
        type: booking.bookingType === 'company' ? 'company' : 'individual',
        bookingId: id,
        companyId: booking.companyId || undefined,
        amount: Number(booking.totalAmount),
        totalAmount: Number(booking.totalAmount),
        notes: `Invoice generated on payment confirmation for ${booking.bookingRef}`
      })
      invoice = await invoicesService.updateInvoice(createdInvoice.id, hotelId, { status: 'paid', paidAmount: amount, paidAt: new Date() })
    } else {
      invoice = await invoicesService.recordPayment(existingInvoice.id, hotelId, amount)
    }
    if (invoice) {
      webhookService.dispatch(hotelId, 'invoice.paid', invoice).catch(console.error)
    }
  } catch (err: any) {
    console.error('[Confirm Payment] Invoice record creation failed:', err.message)
  }

  // 3. Generate invoice PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = Buffer.from(await pdfService.generateInvoice(id, 'invoice'))
  } catch (err: any) {
    console.error('[Confirm Payment] Invoice generation failed:', err.message)
    res.status(200).json(new ApiResponse({
      booking: payment,
      payment,
      emailSent: false,
      message: 'Malipo yamerekodiwa lakini invoice haijaweza kutengenezwa.'
    }))
    return
  }

  // 4. Send invoice email via Brevo
  let emailSent = false
  const recipientEmail = booking.company?.email || booking.guest.email
  const recipientName = booking.company?.name || booking.guest.fullName
  if (recipientEmail) {
    try {
      const emailResult = await brevoService.sendInvoiceEmail(
        recipientEmail,
        recipientName,
        booking.bookingRef,
        pdfBuffer
      )
      emailSent = emailResult.success
    } catch (err: any) {
      console.error('[Confirm Payment] Email sending failed:', err.message)
    }
  }

  // 4. Return updated booking with payments
  const updatedBooking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, fullName: true, phone: true, email: true, nationality: true, idType: true, idNumber: true } },
      room: { select: { id: true, roomNumber: true, name: true, type: true } },
      payments: true
    }
  })

  res.status(200).json(new ApiResponse({
    booking: updatedBooking,
    payment,
    emailSent,
    message: emailSent
      ? 'Malipo yamethibitishwa na invoice imetumwa kwa email.'
      : 'Malipo yamethibitishwa. Email ya mgeni haikuweza kutumwa.'
  }))
})

export const updateBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.updateBooking(
    req.params.id, hotelId, req.body
  )
  webhookService.dispatch(hotelId, 'booking.updated', booking).catch(console.error)
  res.json(new ApiResponse(booking, 'Booking imesasishwa'))
})

export const extendStay = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { extraNights, reason } = req.body
  const booking = await bookingsService.extendStay(
    req.params.id,
    hotelId,
    Number(extraNights),
    reason
  )
  webhookService.dispatch(hotelId, 'booking.updated', booking).catch(console.error)
  res.json(new ApiResponse(booking, `Siku ${extraNights} zimeongezwa kwa booking`))
})

export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.cancelBooking(
    req.params.id, hotelId,
    reason || 'Imefutwa na mfumo', req.user!.id
  )
  webhookService.dispatch(hotelId, 'booking.cancelled', booking).catch(console.error)
  res.json(new ApiResponse(booking, 'Booking imefutwa'))
})

export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.checkIn(req.params.id, hotelId)
  webhookService.dispatch(hotelId, 'booking.checked_in', booking).catch(console.error)
  res.json(new ApiResponse(booking, 'Check-in imefanyika'))
})

export const checkOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const sendInvoice = req.body.sendInvoice !== false
  const bookingId = req.params.id

  const booking = await bookingsService.checkOut(bookingId, hotelId)

  // Create invoice record if not exists
  let invoice = null
  try {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        type: booking.bookingType === 'company' ? 'company' : 'individual',
        status: { not: 'cancelled' },
        invoiceBookings: { some: { bookingId } }
      }
    })
    if (!existingInvoice) {
      const createdInvoice = await invoicesService.createInvoice(hotelId, {
        type: booking.bookingType === 'company' ? 'company' : 'individual',
        bookingId,
        companyId: booking.companyId || undefined,
        amount: Number(booking.totalAmount),
        totalAmount: Number(booking.totalAmount),
        notes: `Invoice generated on check-out for ${booking.bookingRef}`
      })
      const balanceDue = Number(booking.balanceDue)
      invoice = await invoicesService.updateInvoice(createdInvoice.id, hotelId, {
        status: balanceDue <= 0 ? 'paid' : 'sent',
        paidAmount: balanceDue <= 0 ? Number(booking.totalAmount) : Number(booking.paidAmount),
        paidAt: balanceDue <= 0 ? new Date() : undefined
      })
    } else {
      invoice = existingInvoice
    }
  } catch (err: any) {
    console.error('[Checkout] Invoice record creation failed:', err.message)
  }

  let invoiceSent = false
  let invoiceEmail: string | null = null

  if (sendInvoice) {
    try {
      const result = await posService.sendInvoiceEmail(bookingId, hotelId, 'invoice')
      invoiceSent = true
      invoiceEmail = result.email || null
    } catch (err: any) {
      console.error('[Checkout] Auto invoice send failed:', err.message)
    }
  }

  webhookService.dispatch(hotelId, 'booking.checked_out', { booking, invoice }).catch(console.error)

  res.json(new ApiResponse({
    booking,
    invoice,
    invoiceSent,
    invoiceEmail
  }, invoiceSent ? 'Check-out imefanyika na invoice imetumwa' : 'Check-out imefanyika'))
})
