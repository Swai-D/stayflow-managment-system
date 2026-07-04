import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const API = 'http://localhost:5000/api/v1'
let token: string
let hotelId: string
let adminUser: any

async function login() {
  const res = await request(API)
    .post('/auth/login')
    .send({ email: 'admin@buffalo-hotel.co.tz', password: 'Admin@2026!' })
    .expect(200)
  return res.body.data
}

describe('StayFlow Final Integration Tests', () => {
  beforeAll(async () => {
    const auth = await login()
    token = auth.accessToken
    hotelId = auth.user.hotelId
    adminUser = auth.user
  })

  describe('Auth', () => {
    it('should login admin', async () => {
      expect(token).toBeTruthy()
      expect(adminUser.email).toBe('admin@buffalo-hotel.co.tz')
      expect(adminUser.role?.name).toBeTruthy()
    })

    it('should reject invalid login', async () => {
      await request(API)
        .post('/auth/login')
        .send({ email: 'bad@example.com', password: 'wrong' })
        .expect(401)
    })
  })

  describe('Dashboard / Overview', () => {
    it('should get dashboard stats', async () => {
      const res = await request(API)
        .get('/reports/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data).toBeDefined()
    })

    it('should get today checkouts', async () => {
      const res = await request(API)
        .get('/bookings/checkouts/today')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data?.dueToday)).toBe(true)
    })
  })

  describe('Rooms', () => {
    it('should list rooms', async () => {
      const res = await request(API)
        .get('/rooms')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.rooms.length).toBeGreaterThan(0)
    })

    it('should get room availability', async () => {
      const from = new Date()
      from.setMonth(from.getMonth() + 3)
      const to = new Date(from)
      to.setDate(to.getDate() + 1)
      const res = await request(API)
        .get(`/bookings/availability?checkIn=${from.toISOString()}&checkOut=${to.toISOString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Bookings lifecycle', () => {
    let bookingId: string
    let roomId: string
    let guestId: string

    beforeAll(async () => {
      const rooms = await request(API)
        .get('/rooms')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      roomId = rooms.body.data.rooms[0].id

      const guests = await request(API)
        .get('/guests')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      guestId = guests.body.data[0]?.id
    })

    it('should create a booking', async () => {
      // Use future dates to avoid overlapping with seeded bookings
      const checkIn = new Date()
      checkIn.setMonth(checkIn.getMonth() + 2)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2)
      const res = await request(API)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId,
          guestId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          bookingType: 'individual',
          adults: 1,
          children: 0,
          totalAmount: 200000,
          balanceDue: 200000,
          paidAmount: 0,
          source: 'staff_entry'
        })
        .expect(201)
      bookingId = res.body.data.id
      expect(bookingId).toBeTruthy()
      expect(res.body.data.bookingRef).toBeTruthy()
    })

    it('should get the booking', async () => {
      const res = await request(API)
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.id).toBe(bookingId)
    })

    it('should record a payment for the booking', async () => {
      const res = await request(API)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId,
          amount: 100000,
          method: 'cash',
          notes: 'Deposit'
        })
        .expect(201)
      expect(res.body.data.id).toBeTruthy()
    })

    it('should get payments for the booking', async () => {
      const res = await request(API)
        .get(`/payments/booking/${bookingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('should check in the booking', async () => {
      const res = await request(API)
        .post(`/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.status).toBe('checked_in')
    })

    it('should extend stay', async () => {
      const res = await request(API)
        .post(`/bookings/${bookingId}/extend`)
        .set('Authorization', `Bearer ${token}`)
        .send({ extraNights: 1, reason: 'Guest request' })
        .expect(200)
      expect(res.body.data).toBeDefined()
    })

    it('should get folio', async () => {
      const res = await request(API)
        .get(`/pos/folio/${bookingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data).toBeDefined()
    })

    it('should add room charge via POS', async () => {
      const items = await request(API)
        .get('/store/items?sellable=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      const sellable = items.body.data.find((i: any) => i.isSellable && i.currentStock > 0)
      if (sellable) {
        const res = await request(API)
          .post('/pos/charge')
          .set('Authorization', `Bearer ${token}`)
          .send({
            bookingId,
            items: [{ itemId: sellable.id, quantity: 1 }]
          })
          .expect(201)
        expect(res.body.data).toBeDefined()
      }
    })

    it('should checkout the booking', async () => {
      const res = await request(API)
        .post(`/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sendInvoice: false })
        .expect(200)
      expect(res.body.data.booking.status).toBe('checked_out')
    })

    it('should create invoice for checked out booking', async () => {
      const res = await request(API)
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'individual',
          bookingId,
          amount: 200000,
          totalAmount: 200000,
          notes: 'Final invoice'
        })
        .expect(201)
      expect(res.body.data.id).toBeTruthy()
    })
  })

  describe('Guests', () => {
    it('should list guests', async () => {
      const res = await request(API)
        .get('/guests')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('should create a guest', async () => {
      const res = await request(API)
        .post('/guests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Test Guest',
          phone: '+255700000001',
          email: 'testguest@example.com',
          nationality: 'TZ'
        })
        .expect(201)
      expect(res.body.data.id).toBeTruthy()
    })
  })

  describe('Invoices', () => {
    it('should list invoices', async () => {
      const res = await request(API)
        .get('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('Store', () => {
    it('should list store items', async () => {
      const res = await request(API)
        .get('/store/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('should list suppliers', async () => {
      const res = await request(API)
        .get('/store/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('should list purchase orders', async () => {
      const res = await request(API)
        .get('/store/purchase-orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Staff', () => {
    it('should list staff', async () => {
      const res = await request(API)
        .get('/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Companies', () => {
    it('should list companies', async () => {
      const res = await request(API)
        .get('/companies')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Expenses', () => {
    it('should list expenses', async () => {
      const res = await request(API)
        .get('/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Search', () => {
    it('should search across entities', async () => {
      const res = await request(API)
        .get('/search?q=Buffalo&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('AI Settings', () => {
    it('should get AI settings', async () => {
      const res = await request(API)
        .get('/ai/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.data).toBeDefined()
    })
  })

  describe('Developer / API Keys', () => {
    it('should list API keys', async () => {
      const res = await request(API)
        .get('/developer/api-keys')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('Company invoice workflow', () => {
    let companyId: string
    let companyBookingId: string

    it('should create a company', async () => {
      const res = await request(API)
        .post('/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Company ${Date.now()}`,
          email: 'testcompany@example.com',
          phone: '+255700000099',
          tinNumber: '123-456-789',
          contactPerson: 'Test Contact'
        })
        .expect(201)
      companyId = res.body.data.id
      expect(companyId).toBeTruthy()
    })

    it('should create a company booking', async () => {
      // Use a date far in the future and pick an actually available room
      const checkIn = new Date()
      checkIn.setMonth(checkIn.getMonth() + 6)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2)

      const available = await request(API)
        .get(`/bookings/availability?checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(available.body.data.length).toBeGreaterThan(0)
      const roomId = available.body.data[0].id

      const res = await request(API)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roomId,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          bookingType: 'company',
          companyId,
          source: 'staff_entry',
          guests: [
            {
              fullName: 'Company Guest',
              email: `cguest${Date.now()}@example.com`,
              phone: '+255700000002',
              ageCategory: 'adult'
            }
          ]
        })
        .expect(201)
      companyBookingId = res.body.data.id
      expect(companyBookingId).toBeTruthy()
    })

    it('should generate a company invoice', async () => {
      const res = await request(API)
        .post('/invoices/company/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ companyId, bookingIds: [companyBookingId], notes: 'Company invoice test' })
        .expect(201)
      expect(res.body.data.type).toBe('company')
      expect(res.body.data.company.id).toBe(companyId)
      expect(res.body.data.invoiceBookings.length).toBe(1)
    })
  })

  describe('Developer / Webhooks', () => {
    it('should create and list a webhook', async () => {
      const url = `https://example.com/webhook-${Date.now()}`
      await request(API)
        .post('/developer/webhooks')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Webhook', url, events: ['booking.created'], secret: 'test-secret' })
        .expect(201)

      const res = await request(API)
        .get('/developer/webhooks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.some((w: any) => w.url === url)).toBe(true)
    })
  })

  describe('Role-based permission checks', () => {
    let limitedToken: string

    beforeAll(async () => {
      const roleRes = await request(API)
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Limited Role ${Date.now()}`,
          description: 'Test limited role',
          permissions: ['bookings:view']
        })
        .expect(201)
      const roleId = roleRes.body.data.id

      const suffix = Date.now()
      const staffRes = await request(API)
        .post('/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Limited User',
          email: `limited${suffix}@example.com`,
          password: 'Limited@2026!',
          roleId,
          position: 'Tester',
          department: 'QA',
          startDate: '2026-01-01',
          basicSalary: 100000
        })
        .expect(201)

      const loginRes = await request(API)
        .post('/auth/login')
        .send({ email: staffRes.body.data.email, password: 'Limited@2026!' })
        .expect(200)
      limitedToken = loginRes.body.data.accessToken
    })

    it('allows access to permitted resource', async () => {
      const res = await request(API)
        .get('/bookings')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('denies access to forbidden resource', async () => {
      await request(API)
        .get('/invoices')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403)
    })
  })

  describe('Guest Portal', () => {
    let guestToken: string
    let guestAccountId: string

    beforeAll(async () => {
      // Find or create a guest account linked to an active booking
      const booking = await prisma.booking.findFirst({
        where: { status: 'checked_in' },
        include: { guest: true }
      })
      if (!booking) throw new Error('No checked_in booking found for guest portal test')

      const passwordHash = await bcrypt.hash('Guest@2026!', 10)
      const account = await prisma.guestAccount.upsert({
        where: { email: booking.guest.email || 'guest@test.com' },
        update: { passwordHash, status: 'ACTIVE' },
        create: {
          email: booking.guest.email || 'guest@test.com',
          firstName: booking.guest.fullName.split(' ')[0],
          lastName: booking.guest.fullName.split(' ').slice(1).join(' ') || 'Guest',
          phone: booking.guest.phone,
          passwordHash,
          status: 'ACTIVE',
          linkedBookingId: booking.id
        }
      })
      guestAccountId = account.id

      const loginRes = await request('http://localhost:5000/api/guest')
        .post('/login')
        .send({ email: account.email, password: 'Guest@2026!' })
        .expect(200)
      guestToken = loginRes.body.token
    })

    it('should login guest', () => {
      expect(guestToken).toBeTruthy()
    })

    it('should get guest booking', async () => {
      const res = await request('http://localhost:5000/api/guest')
        .get('/booking')
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(200)
      expect(res.body.booking).toBeDefined()
      expect(res.body.booking.roomNumber).toBeTruthy()
    })

    it('should create room service order', async () => {
      const res = await request('http://localhost:5000/api/guest')
        .post('/room-service')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          items: [{ name: 'Test Item', quantity: 1, unitPrice: 15000 }],
          notes: 'Integration test order',
          totalAmount: 15000
        })
        .expect(201)
      expect(res.body.orderId).toBeTruthy()
    })

    it('should create service request', async () => {
      const res = await request('http://localhost:5000/api/guest')
        .post('/request')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ type: 'housekeeping', notes: 'Need towels' })
        .expect(201)
      expect(res.body.requestId).toBeTruthy()
    })

    it('should get guest orders', async () => {
      const res = await request('http://localhost:5000/api/guest')
        .get('/orders')
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(200)
      expect(Array.isArray(res.body.orders)).toBe(true)
    })
  })

  describe('Notifications / Public', () => {
    it('should get public hotel info', async () => {
      const res = await request(API)
        .get('/public/hotels/default')
        .expect(200)
      expect(res.body.data).toBeDefined()
    })
  })
})
