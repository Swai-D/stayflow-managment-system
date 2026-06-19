import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding StayFlow database...')

  // 1. Create default hotel
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'default' },
    update: {
      name: 'Buffalo Hotel',
      email: 'booking@buffalo-hotel.co.tz',
    },
    create: {
      id: 'default-hotel-id',
      name: 'Buffalo Hotel',
      slug: 'default',
      address: 'Morogoro, Tanzania',
      phone: '+255 XXX XXX XXX',
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
    }
  })
  console.log('✅ Hotel created:', hotel.name)

  // 2. Create admin user
  const adminPassword = await bcrypt.hash('Admin@2026!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buffalo-hotel.co.tz' },
    update: {},
    create: {
      hotelId: hotel.id,
      fullName: 'Administrator',
      email: 'admin@buffalo-hotel.co.tz',
      passwordHash: adminPassword,
      role: 'admin',
      isActive: true,
    }
  })
  console.log('✅ Admin created:', admin.email)

  // 3. Create receptionist
  const recepPassword = await bcrypt.hash('Recep@2026!', 12)
  await prisma.user.upsert({
    where: { email: 'reception@buffalo-hotel.co.tz' },
    update: {},
    create: {
      hotelId: hotel.id,
      fullName: 'Receptionist',
      email: 'reception@buffalo-hotel.co.tz',
      passwordHash: recepPassword,
      role: 'receptionist',
      isActive: true,
    }
  })
  console.log('✅ Receptionist created')

  // 4. Clean existing room/booking data
  console.log('🧹 Cleaning existing data...')
  await prisma.review.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.receipt.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.bookingAddon.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.housekeepingLog.deleteMany()
  await prisma.room.deleteMany()
  console.log('✅ Data cleaned.')

  // 5. Seed real rooms from BUFFALO HOTEL.xlsx (exported to rooms_info.json)
  const roomsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'instructions', 'rooms_info.json'), 'utf8')
  )
  const rows: any[] = roomsData.sheets['HOTEL STOCK'].rows

  function normalizeRoomType(type: string): string {
    const t = type.trim().toLowerCase()
    if (t === 'standard') return 'standard'
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

  for (const row of rows) {
    const roomNumber = String(row['ROOM NUMBER'])
    const type = normalizeRoomType(row['ROOM TYPE'])
    const beds = row['NO OF BEDS'] ?? 1
    const capacity = type === 'triple' ? 3 : type === 'twin' ? 2 : 1

    await prisma.room.create({
      data: {
        hotelId: hotel.id,
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
      }
    })
    console.log(`✅ Room ${roomNumber} created: ${row['ROOM TYPE']}`)
  }

  // 5. Create addon services
  const addons = [
    { name: 'Chakula cha Asubuhi (Ziada)', nameEn: 'Extra Breakfast', price: 15000, category: 'food' as const },
    { name: 'Chakula cha Mchana', nameEn: 'Lunch', price: 20000, category: 'food' as const },
    { name: 'Chakula cha Jioni', nameEn: 'Dinner', price: 25000, category: 'food' as const },
    { name: 'Kinywaji (Bar)', nameEn: 'Beverage (Bar)', price: 5000, category: 'beverage' as const },
    { name: 'Usafiri wa Uwanja wa Ndege', nameEn: 'Airport Transfer', price: 50000, category: 'transport' as const },
    { name: 'Dobi (Laundry)', nameEn: 'Laundry Service', price: 10000, category: 'laundry' as const },
  ]

  for (const addon of addons) {
    await prisma.addonService.create({ data: addon }).catch(() => {})
    console.log(`✅ Addon: ${addon.name}`)
  }

  console.log('\n🎉 Seeding completed!')
  console.log('   Store suppliers and items were intentionally skipped — add real data from the dashboard.')
  console.log('\n📋 Login credentials:')
  console.log('   Admin:       admin@buffalo-hotel.co.tz / Admin@2026!')
  console.log('   Receptionist: reception@buffalo-hotel.co.tz / Recep@2026!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
