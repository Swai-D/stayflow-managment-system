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
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'
import { PrismaClient, PaymentMethod } from '@prisma/client'

const prisma = new PrismaClient()

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const getBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, source, search, dateFrom, dateTo, page, limit } = req.query
  const hotelId = await getSystemHotelId()
  const result = await bookingsService.getBookings(hotelId, {
    status: status as any,
    source: source as any,
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
  })

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
      message: 'Booking imeundwa. OTP imetumwa kwa SMS.'
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
    include: { guest: true, hotel: true }
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

  // 2. Generate invoice PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = Buffer.from(await pdfService.generateInvoice(id))
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

  // 3. Send invoice email via Brevo
  let emailSent = false
  if (booking.guest.email) {
    try {
      const emailResult = await brevoService.sendInvoiceEmail(
        booking.guest.email,
        booking.guest.fullName,
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
  res.json(new ApiResponse(booking, 'Booking imesasishwa'))
})

export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.cancelBooking(
    req.params.id, hotelId,
    reason || 'Imefutwa na mfumo', req.user!.id
  )
  res.json(new ApiResponse(booking, 'Booking imefutwa'))
})

export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.checkIn(req.params.id, hotelId)
  res.json(new ApiResponse(booking, 'Check-in imefanyika'))
})

export const checkOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const booking = await bookingsService.checkOut(req.params.id, hotelId)
  res.json(new ApiResponse(booking, 'Check-out imefanyika'))
})
