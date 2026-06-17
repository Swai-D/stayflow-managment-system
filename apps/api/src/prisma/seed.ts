import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  // 5. Create new rooms
  const standardRooms = ['12', '16', '17', '101', '102', '103', '104', '105', '107', '109', '201', '204', '206', '207', '208', '209', '305', '306', '307', '308']
  const twinRooms = ['106', '108', '202', '203', '301', '302']
  const deluxeRooms = ['15', '205']
  const tripleRooms = ['303', '304']

  const getFloor = (num: string) => {
    if (num.startsWith('2')) return 2
    if (num.startsWith('3')) return 3
    return 1
  }

  const newRooms: any[] = []

  for (const num of standardRooms) {
    newRooms.push({
      hotelId: hotel.id,
      roomNumber: num,
      name: 'Standard Room',
      floor: getFloor(num),
      type: 'standard' as const,
      status: 'available' as const,
      pricePerNight: 30,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'TV', 'Hot Shower'],
    })
  }

  for (const num of twinRooms) {
    newRooms.push({
      hotelId: hotel.id,
      roomNumber: num,
      name: 'Twin Room',
      floor: getFloor(num),
      type: 'twin' as const,
      status: 'available' as const,
      pricePerNight: 40,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'TV', 'Hot Shower', 'Desk'],
    })
  }

  for (const num of deluxeRooms) {
    newRooms.push({
      hotelId: hotel.id,
      roomNumber: num,
      name: 'Deluxe Room',
      floor: getFloor(num),
      type: 'deluxe' as const,
      status: 'available' as const,
      pricePerNight: 80,
      capacity: 2,
      amenities: ['WiFi', 'AC', 'Smart TV', 'Hot Shower', 'Balcony', 'Breakfast Included'],
    })
  }

  for (const num of tripleRooms) {
    newRooms.push({
      hotelId: hotel.id,
      roomNumber: num,
      name: 'Triple Room',
      floor: getFloor(num),
      type: 'triple' as const,
      status: 'available' as const,
      pricePerNight: 70,
      capacity: 3,
      amenities: ['WiFi', 'AC', 'TV', 'Hot Shower', 'Spacious Seating', 'Family Amenities'],
    })
  }

  for (const room of newRooms) {
    await prisma.room.create({
      data: room
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

  // ── Suppliers ────────────────────────────────────────────
  console.log('📦 Seeding suppliers...')
  const supplierMgs = await prisma.supplier.create({
    data: {
      hotelId: hotel.id,
      name: 'Morogoro General Supplies',
      phone: '+255712000001',
      email: 'supplies@mgs.co.tz',
      paymentTerms: '30 days net',
    }
  })
  const supplierTbl = await prisma.supplier.create({
    data: {
      hotelId: hotel.id,
      name: 'Tanzania Breweries Ltd',
      phone: '+255712000002',
      paymentTerms: '14 days net',
    }
  })
  const supplierKt = await prisma.supplier.create({
    data: {
      hotelId: hotel.id,
      name: 'Karibu Textiles',
      phone: '+255712000003',
      paymentTerms: 'Cash on delivery',
    }
  })
  console.log('✅ Suppliers created')

  // ── F&B Items ─────────────────────────────────────────────
  console.log('🍽️ Seeding F&B items...')
  const fbItems = [
    // Beverages — sellable (appear in POS)
    {
      name: 'Serengeti Beer (500ml)', subCategory: 'Bar Stock', unit: 'BOTTLE' as const,
      currentStock: 48, minimumStock: 24, maximumStock: 120,
      unitCost: 1800, sellingPrice: 3500, isSellable: true,
      supplierId: supplierTbl.id, location: 'Bar'
    },
    {
      name: 'Kilimanjaro Beer (500ml)', subCategory: 'Bar Stock', unit: 'BOTTLE' as const,
      currentStock: 36, minimumStock: 24, maximumStock: 120,
      unitCost: 1800, sellingPrice: 3500, isSellable: true,
      supplierId: supplierTbl.id, location: 'Bar'
    },
    {
      name: 'Coca Cola (300ml)', subCategory: 'Beverages', unit: 'BOTTLE' as const,
      currentStock: 60, minimumStock: 30, maximumStock: 150,
      unitCost: 600, sellingPrice: 1500, isSellable: true,
      supplierId: supplierMgs.id, location: 'Bar'
    },
    {
      name: 'Mineral Water (500ml)', subCategory: 'Beverages', unit: 'BOTTLE' as const,
      currentStock: 80, minimumStock: 40, maximumStock: 200,
      unitCost: 400, sellingPrice: 1000, isSellable: true,
      supplierId: supplierMgs.id, location: 'Bar'
    },
    {
      name: 'Fresh Juice (Orange)', subCategory: 'Beverages', unit: 'PCS' as const,
      currentStock: 20, minimumStock: 10, maximumStock: 50,
      unitCost: 1500, sellingPrice: 4000, isSellable: true,
      supplierId: supplierMgs.id, location: 'Kitchen'
    },
    // Food
    {
      name: 'Breakfast Plate (Full)', subCategory: 'Food', unit: 'PCS' as const,
      currentStock: 999, minimumStock: 0, maximumStock: 999,
      unitCost: 3000, sellingPrice: 8000, isSellable: true,
      supplierId: supplierMgs.id, location: 'Kitchen'
    },
    {
      name: 'Chips (Portion)', subCategory: 'Food', unit: 'PCS' as const,
      currentStock: 999, minimumStock: 0, maximumStock: 999,
      unitCost: 1000, sellingPrice: 3000, isSellable: true,
      supplierId: supplierMgs.id, location: 'Kitchen'
    },
    {
      name: 'Rice (25kg bag)', subCategory: 'Dry Foods', unit: 'KG' as const,
      currentStock: 75, minimumStock: 25, maximumStock: 200,
      unitCost: 2200, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Kitchen Store'
    },
    {
      name: 'Cooking Oil (20L)', subCategory: 'Dry Foods', unit: 'LTR' as const,
      currentStock: 40, minimumStock: 20, maximumStock: 100,
      unitCost: 4500, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Kitchen Store'
    },
  ]

  for (const item of fbItems) {
    await prisma.storeItem.create({
      data: { ...item, hotelId: hotel.id, category: 'FB' }
    })
    console.log(`✅ F&B Item: ${item.name}`)
  }

  // ── Hotel Inventory Items ─────────────────────────────────
  console.log('🏨 Seeding Hotel inventory items...')
  const hotelItems = [
    {
      name: 'Bath Towel (Large)', subCategory: 'Linen & Towels', unit: 'PCS' as const,
      currentStock: 20, minimumStock: 16, maximumStock: 40,
      unitCost: 8000, sellingPrice: null, isSellable: false,
      supplierId: supplierKt.id, location: 'Housekeeping Store'
    },
    {
      name: 'Bed Sheet (King)', subCategory: 'Linen & Towels', unit: 'PCS' as const,
      currentStock: 12, minimumStock: 8, maximumStock: 24,
      unitCost: 15000, sellingPrice: null, isSellable: false,
      supplierId: supplierKt.id, location: 'Housekeeping Store'
    },
    {
      name: 'Pillow Case', subCategory: 'Linen & Towels', unit: 'PCS' as const,
      currentStock: 24, minimumStock: 16, maximumStock: 48,
      unitCost: 4000, sellingPrice: null, isSellable: false,
      supplierId: supplierKt.id, location: 'Housekeeping Store'
    },
    {
      name: 'Shower Gel (50ml)', subCategory: 'Bathroom Amenities', unit: 'PCS' as const,
      currentStock: 8, minimumStock: 20, maximumStock: 80,
      unitCost: 1200, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Housekeeping Store'
    },
    {
      name: 'Toilet Soap (bar)', subCategory: 'Bathroom Amenities', unit: 'PCS' as const,
      currentStock: 15, minimumStock: 20, maximumStock: 80,
      unitCost: 800, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Housekeeping Store'
    },
    {
      name: 'Toilet Paper (roll)', subCategory: 'Bathroom Amenities', unit: 'ROLL' as const,
      currentStock: 30, minimumStock: 24, maximumStock: 100,
      unitCost: 500, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Housekeeping Store'
    },
    {
      name: 'Floor Cleaner (5L)', subCategory: 'Cleaning Supplies', unit: 'LTR' as const,
      currentStock: 10, minimumStock: 10, maximumStock: 40,
      unitCost: 3500, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Housekeeping Store'
    },
    {
      name: 'Garbage Bags (roll)', subCategory: 'Cleaning Supplies', unit: 'ROLL' as const,
      currentStock: 5, minimumStock: 6, maximumStock: 24,
      unitCost: 2000, sellingPrice: null, isSellable: false,
      supplierId: supplierMgs.id, location: 'Housekeeping Store'
    },
  ]

  for (const item of hotelItems) {
    await prisma.storeItem.create({
      data: { ...item, hotelId: hotel.id, category: 'HOTEL' }
    })
    console.log(`✅ Hotel Item: ${item.name}`)
  }

  console.log('\n🎉 Seeding completed!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin:       admin@buffalo-hotel.co.tz / Admin@2026!')
  console.log('   Receptionist: reception@buffalo-hotel.co.tz / Recep@2026!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
