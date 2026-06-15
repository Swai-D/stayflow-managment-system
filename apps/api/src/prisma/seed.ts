import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding StayFlow database...')

  // 1. Create default hotel
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'default' },
    update: {},
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

  // 4. Create rooms
  const rooms = [
    {
      hotelId: hotel.id,
      roomNumber: '111',
      name: 'New Cottage Room',
      floor: 1,
      type: 'deluxe' as const,
      status: 'available' as const,
      pricePerNight: 80000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV (DSTV)', 'Breakfast', 'Balcony', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: '108',
      name: 'Mountain View Room',
      floor: 1,
      type: 'superior' as const,
      status: 'available' as const,
      pricePerNight: 75000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV', 'Buffet Breakfast', 'Balcony', 'Mtazamo wa Milima', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: '109',
      name: 'Mountain View Room',
      floor: 1,
      type: 'superior' as const,
      status: 'available' as const,
      pricePerNight: 75000,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV', 'Buffet Breakfast', 'Balcony', 'Mtazamo wa Milima', 'Bafu binafsi'],
    },
    {
      hotelId: hotel.id,
      roomNumber: 'CONF',
      name: 'Main Conference Room',
      floor: 1,
      type: 'conference' as const,
      status: 'available' as const,
      pricePerNight: 70000,
      pricePerHour: 10000,
      capacity: 25,
      amenities: ['WiFi', 'AC', 'TV', 'Parking', 'Ulinzi', 'Mgahawa'],
    },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: room.roomNumber } },
      update: {},
      create: room,
    })
    console.log(`✅ Room ${room.roomNumber} created: ${room.name}`)
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
  console.log('\n📋 Login credentials:')
  console.log('   Admin:       admin@buffalo-hotel.co.tz / Admin@2026!')
  console.log('   Receptionist: reception@buffalo-hotel.co.tz / Recep@2026!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
