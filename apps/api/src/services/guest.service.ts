import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { format } from 'date-fns'
import { ApiError } from '../utils/ApiError'
import { brevoService } from './brevo.service'
import { nextSmsService } from './nextsms.service'
import { getSystemHotelId } from '../utils/systemHotel'

const prisma = new PrismaClient()

export interface GuestTokenPayload {
  id: string
  email: string
  firstName: string
  lastName: string
  linkedBookingId?: string
}

export class GuestService {
  private get guestSecret() {
    return process.env.JWT_GUEST_SECRET || 'guest_secret_change_this'
  }

  private get guestExpiresIn() {
    return process.env.JWT_GUEST_EXPIRES_IN || '7d'
  }

  private get activationExpiryHours() {
    return Number(process.env.ACTIVATION_TOKEN_EXPIRES_HOURS || 48)
  }

  private get guestPortalUrl() {
    return process.env.GUEST_PORTAL_URL || 'http://localhost:5501'
  }

  private generateJwt(payload: { guestId: string; email: string; bookingId?: string }) {
    return jwt.sign(payload, this.guestSecret, { expiresIn: this.guestExpiresIn } as jwt.SignOptions)
  }

  private generateActivationToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private sanitizeGuest(guest: any): GuestTokenPayload {
    return {
      id: guest.id,
      email: guest.email,
      firstName: guest.firstName,
      lastName: guest.lastName,
      linkedBookingId: guest.linkedBookingId || undefined
    }
  }

  // ─── Auto-create guest account after booking ───────────────────────────────
  async createOrUpdateGuestAccount(data: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    bookingId: string
  }) {
    let account = await prisma.guestAccount.findUnique({
      where: { email: data.email }
    })

    const token = this.generateActivationToken()
    const expiresAt = new Date(
      Date.now() + this.activationExpiryHours * 60 * 60 * 1000
    )

    if (account) {
      account = await prisma.guestAccount.update({
        where: { id: account.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          linkedBookingId: data.bookingId,
          activationToken: token,
          tokenExpiresAt: expiresAt,
          status: 'PENDING_ACTIVATION'
        }
      })
    } else {
      account = await prisma.guestAccount.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          linkedBookingId: data.bookingId,
          activationToken: token,
          tokenExpiresAt: expiresAt,
          status: 'PENDING_ACTIVATION'
        }
      })
    }

    // Fire-and-forget notifications
    this.sendActivationEmail(account, token).catch(console.error)
    this.sendActivationSms(account, token).catch(console.error)

    return account
  }

  private async sendActivationEmail(account: any, token: string) {
    const hotelId = await getSystemHotelId()
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, address: true, phone: true, email: true }
    })

    const activationLink = `${this.guestPortalUrl}/activate.html?token=${token}`
    const poweredBy = process.env.POWERED_BY || 'Powered by Odessa Lab'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <div style="background: #E67E22; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0;">${hotel?.name || 'Buffalo Hotel'}</h1>
          <p style="margin: 4px 0 0; opacity: 0.9;">Comfort in every stay</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #E67E22;">Booking Confirmation</h2>
          <p>Hello <strong>${account.firstName} ${account.lastName}</strong>,</p>
          <p>Thank you for your booking at <strong>${hotel?.name || 'Buffalo Hotel'}</strong>! We're excited to host you.</p>

          <p>Your guest account has been created. Activate it to view your booking and request services during your stay:</p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${activationLink}" style="background: #E67E22; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Activate Your Account</a>
          </div>

          <p style="font-size: 12px; color: #6B7280;">Or copy this link: ${activationLink}</p>

          <p><strong>Booking Policy</strong><br/>
          All bookings will be confirmed by receiving a deposit before guests check in; the remaining balance should be cleared on arrival or before check-out.</p>

          <p>Best regards,<br/><strong>${hotel?.name || 'Buffalo Hotel'} Team</strong></p>
        </div>
        <div style="padding: 20px; background: #F9FAFB; text-align: center; font-size: 12px; color: #6B7280;">
          ${hotel?.name || 'Buffalo Hotel'}<br/>
          ${hotel?.address || 'Moshi, Tanzania'}<br/>
          Mobile/WhatsApp: ${hotel?.phone || '+255765068295'}<br/>
          Email: ${hotel?.email || 'booking@buffalo-hotel.co.tz'}<br/>
          <em>${poweredBy}</em>
        </div>
      </div>
    `

    return brevoService.sendEmail({
      to: account.email,
      toName: `${account.firstName} ${account.lastName}`,
      subject: `Booking Confirmation - ${hotel?.name || 'Buffalo Hotel'}`,
      htmlContent: html
    })
  }

  private async sendActivationSms(account: any, token: string) {
    if (!account.phone) return
    const link = `${this.guestPortalUrl}/activate.html?token=${token}`
    const message = `Welcome to Buffalo Hotel! Access your guest dashboard to manage your stay: ${link}`
    return nextSmsService.sendSms(account.phone, message)
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const account = await prisma.guestAccount.findUnique({ where: { email } })
    if (!account || account.status !== 'ACTIVE') {
      throw ApiError.unauthorized('Invalid email or password.')
    }

    const valid = await bcrypt.compare(password, account.passwordHash || '')
    if (!valid) throw ApiError.unauthorized('Invalid email or password.')

    const token = this.generateJwt({
      guestId: account.id,
      email: account.email,
      bookingId: account.linkedBookingId || undefined
    })

    return { token, guest: this.sanitizeGuest(account) }
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────
  async requestOtp(email: string) {
    const account = await prisma.guestAccount.findUnique({ where: { email } })
    if (!account) throw ApiError.notFound('Email not registered.')

    const otp = this.generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.guestAccount.update({
      where: { id: account.id },
      data: { otp, otpExpiresAt: expiresAt }
    })

    if (account.phone) {
      await nextSmsService.sendSms(
        account.phone,
        `Your Buffalo Hotel guest portal code is: ${otp}. Valid for 10 minutes.`
      )
    }

    return { success: true, message: 'OTP sent via SMS' }
  }

  async verifyOtp(email: string, code: string) {
    const account = await prisma.guestAccount.findUnique({ where: { email } })
    if (!account) throw ApiError.unauthorized('Invalid email or code.')

    if (
      account.otp !== code ||
      !account.otpExpiresAt ||
      account.otpExpiresAt < new Date()
    ) {
      throw ApiError.unauthorized('Invalid or expired code.')
    }

    await prisma.guestAccount.update({
      where: { id: account.id },
      data: { otp: null, otpExpiresAt: null }
    })

    const token = this.generateJwt({
      guestId: account.id,
      email: account.email,
      bookingId: account.linkedBookingId || undefined
    })

    return { token, guest: this.sanitizeGuest(account) }
  }

  // ─── Activation ───────────────────────────────────────────────────────────
  async verifyActivationToken(token: string) {
    const account = await prisma.guestAccount.findUnique({
      where: { activationToken: token }
    })

    if (
      !account ||
      account.status !== 'PENDING_ACTIVATION' ||
      !account.tokenExpiresAt ||
      account.tokenExpiresAt < new Date()
    ) {
      throw ApiError.unauthorized('Token expired or already used.')
    }

    return { firstName: account.firstName }
  }

  async activate(token: string, password: string) {
    const account = await prisma.guestAccount.findUnique({
      where: { activationToken: token }
    })

    if (
      !account ||
      account.status !== 'PENDING_ACTIVATION' ||
      !account.tokenExpiresAt ||
      account.tokenExpiresAt < new Date()
    ) {
      throw ApiError.unauthorized('Token expired or already used.')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const updated = await prisma.guestAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        activationToken: null,
        tokenExpiresAt: null
      }
    })

    const jwtToken = this.generateJwt({
      guestId: updated.id,
      email: updated.email,
      bookingId: updated.linkedBookingId || undefined
    })

    return { token: jwtToken, guest: this.sanitizeGuest(updated) }
  }

  // ─── Active Booking ───────────────────────────────────────────────────────
  async getActiveBooking(guest: GuestTokenPayload) {
    let booking = null

    if (guest.linkedBookingId) {
      booking = await prisma.booking.findFirst({
        where: {
          id: guest.linkedBookingId,
          status: { in: ['confirmed', 'checked_in'] }
        },
        include: { room: true, guest: true }
      })
    }

    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: {
          guest: { email: guest.email },
          status: { in: ['confirmed', 'checked_in'] }
        },
        orderBy: { checkIn: 'desc' },
        include: { room: true, guest: true }
      })
    }

    if (!booking) {
      throw ApiError.notFound('No active booking found.')
    }

    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )

    return {
      bookingId: booking.bookingRef,
      roomNumber: booking.room.roomNumber,
      roomType: booking.room.type,
      checkIn: format(new Date(booking.checkIn), 'yyyy-MM-dd'),
      checkOut: format(new Date(booking.checkOut), 'yyyy-MM-dd'),
      guests: `${booking.adults} Adult${booking.adults !== 1 ? 's' : ''}${
        booking.children ? `, ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : ''
      }`,
      ratePerNight: Number(booking.roomTotal) / nights,
      currency: 'TZS',
      totalAmount: Number(booking.totalAmount),
      nights
    }
  }

  // ─── Room Service ─────────────────────────────────────────────────────────
  private async generateOrderId() {
    const year = new Date().getFullYear()
    const count = await prisma.roomServiceOrder.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }
    })
    return `BUF-ORD-${year}-${String(count + 1).padStart(4, '0')}`
  }

  async createRoomServiceOrder(
    guest: GuestTokenPayload,
    data: {
      items: Array<{ itemId: number; name: string; quantity: number; unitPrice: number }>
      notes?: string
      totalAmount: number
    }
  ) {
    const booking = await this.resolveActiveBooking(guest)

    const order = await prisma.roomServiceOrder.create({
      data: {
        orderId: await this.generateOrderId(),
        guestAccountId: guest.id,
        bookingId: booking.id,
        items: data.items as any,
        totalAmount: data.totalAmount,
        notes: data.notes,
        status: 'PENDING'
      }
    })

    return {
      success: true,
      orderId: order.orderId,
      estimatedDelivery: '20-30 minutes',
      message: 'Order received! Estimated delivery: 20-30 minutes'
    }
  }

  // ─── Service Requests ─────────────────────────────────────────────────────
  private async generateRequestId() {
    const year = new Date().getFullYear()
    const count = await prisma.serviceRequest.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } }
    })
    return `REQ-${year}-${String(count + 1).padStart(4, '0')}`
  }

  async createServiceRequest(
    guest: GuestTokenPayload,
    data: {
      type: 'laundry' | 'taxi' | 'tour' | 'housekeeping' | 'other'
      [key: string]: any
    }
  ) {
    const booking = await this.resolveActiveBooking(guest)

    const request = await prisma.serviceRequest.create({
      data: {
        requestId: await this.generateRequestId(),
        guestAccountId: guest.id,
        bookingId: booking.id,
        type: data.type,
        payload: data as any,
        status: 'PENDING'
      }
    })

    return {
      success: true,
      requestId: request.requestId,
      message: 'Request received. Our team will respond shortly.'
    }
  }

  // ─── Extend Stay ──────────────────────────────────────────────────────────
  async createExtensionRequest(
    guest: GuestTokenPayload,
    data: { bookingId: string; extraNights: number; reason?: string }
  ) {
    const booking = await this.resolveActiveBooking(guest)

    const requestedNewCheckout = new Date(booking.checkOut)
    requestedNewCheckout.setDate(requestedNewCheckout.getDate() + data.extraNights)

    await prisma.extensionRequest.create({
      data: {
        bookingId: booking.id,
        extraNights: data.extraNights,
        requestedNewCheckout,
        reason: data.reason,
        status: 'PENDING'
      }
    })

    return {
      success: true,
      message: 'Extension request received. We will confirm within 30 minutes via SMS.',
      requestedNewCheckout: format(requestedNewCheckout, 'yyyy-MM-dd')
    }
  }

  // ─── Activity Feed ────────────────────────────────────────────────────────
  async getOrders(guest: GuestTokenPayload) {
    const booking = await this.resolveActiveBooking(guest)

    const [roomOrders, requests] = await Promise.all([
      prisma.roomServiceOrder.findMany({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.serviceRequest.findMany({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const mappedOrders = roomOrders.map((o: any) => ({
      type: 'room_service',
      title: this.formatRoomServiceTitle(o.items),
      time: this.formatTime(o.createdAt),
      amount: Number(o.totalAmount),
      status: this.mapOrderStatus(o.status)
    }))

    const mappedRequests = requests.map((r: any) => ({
      type: 'request',
      title: `${this.capitalize(r.type)} Request`,
      time: this.formatTime(r.createdAt),
      amount: null,
      status: this.mapRequestStatus(r.status)
    }))

    return {
      success: true,
      orders: [...mappedOrders, ...mappedRequests]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10)
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private async resolveActiveBooking(guest: GuestTokenPayload) {
    let booking = null

    if (guest.linkedBookingId) {
      booking = await prisma.booking.findFirst({
        where: {
          id: guest.linkedBookingId,
          status: { in: ['confirmed', 'checked_in'] }
        }
      })
    }

    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: {
          guest: { email: guest.email },
          status: { in: ['confirmed', 'checked_in'] }
        },
        orderBy: { checkIn: 'desc' }
      })
    }

    if (!booking) throw ApiError.notFound('No active booking found.')
    return booking
  }

  private formatRoomServiceTitle(items: any) {
    if (!Array.isArray(items) || items.length === 0) return 'Room Service Order'
    if (items.length === 1) return `${items[0].name} × ${items[0].quantity}`
    return `${items[0].name} × ${items[0].quantity} + ${items.length - 1} more`
  }

  private formatTime(date: Date) {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const label = isToday ? 'Today' : format(d, 'MMM d')
    return `${label}, ${format(d, 'h:mm a')}`
  }

  private mapOrderStatus(status: string) {
    switch (status) {
      case 'PENDING': return 'pending'
      case 'PREPARING': return 'processing'
      case 'DELIVERED': return 'confirmed'
      case 'CANCELLED': return 'cancelled'
      default: return 'pending'
    }
  }

  private mapRequestStatus(status: string) {
    switch (status) {
      case 'PENDING': return 'pending'
      case 'IN_PROGRESS': return 'processing'
      case 'COMPLETED': return 'confirmed'
      case 'CANCELLED': return 'cancelled'
      default: return 'pending'
    }
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
}

export const guestService = new GuestService()
