// Production seed — wipes ALL operational + demo data and seeds ONLY:
//   1) Hotel record + system roles
//   2) One real admin user (credentials from env vars — do NOT hardcode)
//   3) Rooms (from data/rooms_info.json)
//
// No demo guests, bookings, payments, store items, suppliers, expenses, or addons.
// Run this ONCE against the live database when you're ready to go live.
//
// Required env vars (set these before running — do not commit real values):
//   ADMIN_EMAIL     e.g. owner@buffalo-hotel.co.tz
//   ADMIN_PASSWORD  a strong password — the app will hash it, but the plain
//                   value should never be committed or reused from the demo seed
//   ADMIN_NAME      e.g. "Hotel Administrator" (optional, has a default)

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

type RoomType = 'standard' | 'deluxe' | 'twin' | 'triple'

async function wipeAllData() {
  console.log('🧹 Wiping all existing data...')
  await prisma.roomServiceOrder.deleteMany()
  await prisma.serviceRequest.deleteMany()
  await prisma.extensionRequest.deleteMany()
  await prisma.guestAccount.deleteMany()
  await prisma.invoiceBooking.deleteMany()
  await prisma.receipt.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.roomChargeItem.deleteMany()
  await prisma.roomCharge.deleteMany()
  await prisma.bookingAddon.deleteMany()
  await prisma.bookingGuest.deleteMany()
  await prisma.review.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.guest.deleteMany()
  await prisma.company.deleteMany()
  await prisma.housekeepingLog.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.storeTransaction.deleteMany()
  await prisma.storeItem.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.addonService.deleteMany()
  await prisma.room.deleteMany()
  // Wipe users + roles + hotel too, so we start completely clean and
  // recreate them fresh below (avoids leftover demo accounts).
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.hotel.deleteMany()
  console.log('✅ Database wiped.')
}

async function seedHotelRolesAndAdmin() {
  const hotel = await prisma.hotel.create({
    data: {
      id: 'default-hotel-id',
      name: 'Buffalo Hotel',
      slug: 'default',
      address: 'Moshi, Tanzania',
      phone: '+255765068295',
      email: 'booking@buffalo-hotel.co.tz',
      wifiName: 'BuffaloHotel_WiFi',
      wifiPassword: 'welcome2026',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      defaultLanguage: 'sw',
      isActive: true,
      paymentNumbers: [
        { name: 'Vodacom M-Pesa', number: '0745 123 456', network: 'Vodacom' },
        { name: 'Airtel Money', number: '0689 123 456', network: 'Airtel' },
        { name: 'Mixx by Yas (Tigo Pesa)', number: '0655 123 456', network: 'Tigo' },
      ] as any,
    },
  })
  console.log('✅ Hotel:', hotel.name)
  console.log('   ⚠️  Review address/phone/wifi/payment numbers above — edit this file or update via the app settings if any are placeholders.')

  const roleDefinitions = [
    {
      name: 'admin',
      description: 'Full system access. Can manage users, settings, payroll and all operations.',
      permissions: [
        'bookings:view', 'bookings:manage', 'bookings:checkin', 'bookings:checkout', 'bookings:extend',
        'guests:view', 'guests:manage',
        'rooms:view', 'rooms:manage',
        'housekeeping:view', 'housekeeping:manage',
        'pos:view', 'pos:charge', 'pos:checkout', 'pos:void',
        'payments:record', 'payments:view',
        'invoices:view', 'invoices:manage',
        'companies:view', 'companies:manage',
        'store:view', 'store:manage',
        'staff:view', 'staff:manage',
        'payroll:view', 'payroll:manage',
        'reports:view',
        'settings:view', 'settings:manage',
        'guest_portal:orders', 'guest_portal:requests',
        'developer:manage',
      ],
    },
    {
      name: 'receptionist',
      description: 'Front desk operations: bookings, check-in/out, payments, POS, invoices and reports.',
      permissions: [
        'bookings:view', 'bookings:manage', 'bookings:checkin', 'bookings:checkout', 'bookings:extend',
        'guests:view', 'guests:manage',
        'rooms:view',
        'housekeeping:view',
        'pos:view', 'pos:charge', 'pos:checkout',
        'payments:record', 'payments:view',
        'invoices:view', 'invoices:manage',
        'companies:view', 'companies:manage',
        'store:view',
        'reports:view',
        'guest_portal:orders', 'guest_portal:requests',
      ],
    },
    {
      name: 'housekeeping',
      description: 'Room status updates, consumption logging and guest service requests.',
      permissions: ['rooms:view', 'housekeeping:view', 'housekeeping:manage', 'store:view', 'guest_portal:requests'],
    },
    {
      name: 'waiter',
      description: 'POS operations and guest portal food orders.',
      permissions: ['pos:view', 'pos:charge', 'guest_portal:orders'],
    },
  ]

  const roleMap: Record<string, string> = {}
  for (const r of roleDefinitions) {
    const role = await prisma.role.create({
      data: {
        hotelId: hotel.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions as any,
        isSystem: true,
      },
    })
    roleMap[r.name] = role.id
  }
  console.log(`✅ ${roleDefinitions.length} system roles created (admin, receptionist, housekeeping, waiter)`)

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Hotel Administrator'

  if (!adminEmail || !adminPassword) {
    throw new Error(
      '❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required to seed the production admin user. ' +
      'Set them before running this script (e.g. via `railway run` or the Railway dashboard variables tab) — never hardcode real credentials in the repo.'
    )
  }
  if (adminPassword.length < 10) {
    throw new Error('❌ ADMIN_PASSWORD is too short — use a strong password (12+ chars, mixed case, numbers, symbols).')
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.create({
    data: {
      hotelId: hotel.id,
      fullName: adminName,
      email: adminEmail,
      passwordHash,
      roleId: roleMap['admin'],
      isActive: true,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  return hotel
}

async function seedRooms(hotelId: string) {
  const roomsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'rooms_info.json'), 'utf8')
  )
  const rows: any[] = roomsData.sheets['HOTEL STOCK'].rows

  function normalizeRoomType(type: string): RoomType {
    const t = type.trim().toLowerCase()
    if (t === 'deluxe') return 'deluxe'
    if (t === 'twin') return 'twin'
    if (t === 'tripple' || t === 'triple') return 'triple'
    return 'standard'
  }

  function floorFromRoomNumber(num: number): number {
    if (num >= 100 && num < 200) return 1
    if (num >= 200 && num < 300) return 2
    if (num >= 300 && num < 400) return 3
    if (num >= 400 && num < 500) return 4
    if (num >= 500 && num < 600) return 5
    return 0
  }

  const created: any[] = []
  for (const row of rows) {
    const roomNumber = String(row['ROOM NUMBER'])
    const type = normalizeRoomType(row['ROOM TYPE'])
    const beds = row['NO OF BEDS'] ?? 1
    const capacity = type === 'triple' ? 3 : type === 'twin' ? 2 : 1

    const room = await prisma.room.create({
      data: {
        hotelId,
        roomNumber,
        name: `${row['ROOM TYPE']} Room ${roomNumber}`,
        floor: floorFromRoomNumber(row['ROOM NUMBER']),
        type: type as any,
        status: 'available',
        pricePerNight: row['PRICE'],
        specialRate: row['STO/SPECIAL RATE'],
        fullBoardRate: row['FULL BOARD'],
        nonResidentRate: String(row['NON RESIDENT']).trim(),
        beds,
        capacity,
        amenities: ['WiFi', 'AC', 'TV'],
      },
    })
    created.push(room)
  }
  console.log(`✅ ${created.length} rooms created from data/rooms_info.json`)
  return created
}

async function main() {
  console.log('🌱 Seeding StayFlow for PRODUCTION (admin + rooms only)...\n')
  await wipeAllData()
  const hotel = await seedHotelRolesAndAdmin()
  await seedRooms(hotel.id)
  console.log('\n🎉 Production seed complete. Log in with the ADMIN_EMAIL / ADMIN_PASSWORD you provided.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
