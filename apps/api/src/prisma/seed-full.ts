import {
  PrismaClient,
  Prisma,
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  BookingSource,
  BookingType,
  ChargeStatus,
  InvoiceStatus,
  InvoiceType,
  HousekeepingStatus,
  ExpenseCategory,
  NotificationType,
  NotificationChannel,
  POStatus,
  TransactionType,
  StoreCategory,
  StockUnit,
  RoomStatus,
  RoomType,
  AddonCategory,
  IdType,
  ServiceRequestType,
  ServiceRequestStatus,
  ExtensionRequestStatus,
  RoomServiceOrderStatus,
  GuestAccountStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'
import { generateBookingRef, generateInvoiceNumber, generateReceiptNumber } from '../utils/generateRef'

const prisma = new PrismaClient()

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addHours(date: Date, hours: number) {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

function startOfDay(d: Date) {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  return result
}

function calculateNights(checkIn: Date, checkOut: Date) {
  const ms = startOfDay(checkOut).getTime() - startOfDay(checkIn).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 2) {
  const val = Math.random() * (max - min) + min
  return Number(val.toFixed(decimals))
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickSome<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function dateKey(d: Date) {
  return startOfDay(d).toISOString().split('T')[0]
}

function chance(percent: number) {
  return Math.random() < percent
}

// In-memory store stock ledger so we can seed transactions and keep currentStock consistent
const stockState = new Map<string, number>()
const stockCost = new Map<string, Prisma.Decimal>()
const storeItemMap = new Map<string, any>()

async function adjustStock(
  itemId: string,
  delta: number,
  type: TransactionType,
  reference: string,
  notes: string,
  performedById: string
) {
  const current = stockState.get(itemId) ?? 0
  const absDelta = Math.abs(delta)
  let next = current
  if (type === 'STOCK_IN' || (type === 'ADJUSTMENT' && delta > 0)) {
    next = current + absDelta
  } else if (type === 'STOCK_OUT' || type === 'WASTAGE') {
    next = current - absDelta
  } else if (type === 'ADJUSTMENT') {
    next = current + delta
  }

  if ((type === 'STOCK_OUT' || type === 'WASTAGE') && next < 0) {
    console.warn(`   ⚠️ Insufficient stock for ${itemId}; skipping ${type}`)
    return null
  }

  await prisma.storeItem.update({ where: { id: itemId }, data: { currentStock: next } })
  const tx = await prisma.storeTransaction.create({
    data: {
      itemId,
      type,
      quantity: absDelta,
      unitCost: stockCost.get(itemId) ?? 0,
      balanceBefore: current,
      balanceAfter: next,
      reference,
      notes,
      performedById,
    },
  })
  stockState.set(itemId, next)
  return tx
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding FULL StayFlow dataset...')

  const hotel = await seedHotelAndUsers()
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@buffalo-hotel.co.tz' } })
  const receptionist = await prisma.user.findFirstOrThrow({ where: { email: 'reception@buffalo-hotel.co.tz' } })
  const housekeepingUser = await prisma.user.findFirstOrThrow({ where: { email: 'housekeeping@buffalo-hotel.co.tz' } })
  const waiter = await prisma.user.findFirstOrThrow({ where: { email: 'waiter@buffalo-hotel.co.tz' } })

  await cleanAllData()

  const rooms = await seedRooms(hotel.id)
  const addons = await seedAddonServices()
  const suppliers = await seedSuppliers(hotel.id)
  const storeItems = await seedStoreItems(hotel.id, suppliers)

  // Keep an in-memory ledger of stock levels
  for (const item of storeItems) {
    stockState.set(item.id, item.currentStock)
    stockCost.set(item.id, item.unitCost)
  }

  await seedPurchaseOrders(hotel.id, admin.id, storeItems, suppliers)
  await seedStoreTransactions(admin.id)
  await seedExpenses(hotel.id, admin.id)

  const guests = await seedGuests()
  const companies = await seedCompanies(hotel.id)

  await seedBookingsAndRelated({
    hotelId: hotel.id,
    adminId: admin.id,
    receptionistId: receptionist.id,
    housekeepingUserId: housekeepingUser.id,
    waiterId: waiter.id,
    rooms,
    addons,
    storeItems,
    guests,
    companies,
  })

  await seedExtraRequests(hotel.id)
  await seedHousekeepingLogs(housekeepingUser.id, rooms)

  console.log('\n🎉 Full seeding completed!')
  console.log('   Login: admin@buffalo-hotel.co.tz / Admin@2026!')
}

// ─── Seeders ─────────────────────────────────────────────────────────────────

async function seedHotelAndUsers() {
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'default' },
    update: {
      name: 'Buffalo Hotel',
      email: 'booking@buffalo-hotel.co.tz',
      address: 'Moshi, Tanzania',
      phone: '+255765068295',
      wifiName: 'BuffaloHotel_WiFi',
      wifiPassword: 'welcome2026',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      defaultLanguage: 'sw',
      paymentNumbers: [
        { name: 'Vodacom M-Pesa', number: '0745 123 456', network: 'Vodacom' },
        { name: 'Airtel Money', number: '0689 123 456', network: 'Airtel' },
        { name: 'Mixx by Yas (Tigo Pesa)', number: '0655 123 456', network: 'Tigo' },
      ] as any,
    },
    create: {
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

  // Create system roles for the hotel
  const roleDefinitions = [
    {
      name: 'admin',
      description: 'Full system access. Can manage users, settings, payroll and all operations.',
      permissions: [
        'bookings:view','bookings:manage','bookings:checkin','bookings:checkout','bookings:extend',
        'guests:view','guests:manage',
        'rooms:view','rooms:manage',
        'housekeeping:view','housekeeping:manage',
        'pos:view','pos:charge','pos:checkout','pos:void',
        'payments:record','payments:view',
        'invoices:view','invoices:manage',
        'companies:view','companies:manage',
        'store:view','store:manage',
        'staff:view','staff:manage',
        'payroll:view','payroll:manage',
        'reports:view',
        'settings:view','settings:manage',
        'guest_portal:orders','guest_portal:requests',
        'developer:manage'
      ]
    },
    {
      name: 'receptionist',
      description: 'Front desk operations: bookings, check-in/out, payments, POS, invoices and reports.',
      permissions: [
        'bookings:view','bookings:manage','bookings:checkin','bookings:checkout','bookings:extend',
        'guests:view','guests:manage',
        'rooms:view',
        'housekeeping:view',
        'pos:view','pos:charge','pos:checkout',
        'payments:record','payments:view',
        'invoices:view','invoices:manage',
        'companies:view','companies:manage',
        'store:view',
        'reports:view',
        'guest_portal:orders','guest_portal:requests'
      ]
    },
    {
      name: 'housekeeping',
      description: 'Room status updates, consumption logging and guest service requests.',
      permissions: [
        'rooms:view',
        'housekeeping:view','housekeeping:manage',
        'store:view',
        'guest_portal:requests'
      ]
    },
    {
      name: 'waiter',
      description: 'POS operations and guest portal food orders.',
      permissions: [
        'pos:view','pos:charge',
        'guest_portal:orders'
      ]
    }
  ]

  const roleMap: Record<string, string> = {}
  for (const r of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: r.name } },
      update: {},
      create: {
        hotelId: hotel.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions as any,
        isSystem: true
      }
    })
    roleMap[r.name] = role.id
  }
  console.log(`✅ ${roleDefinitions.length} system roles created`)

  const users = [
    { fullName: 'Administrator', email: 'admin@buffalo-hotel.co.tz', role: 'admin', password: 'Admin@2026!' },
    { fullName: 'Receptionist', email: 'reception@buffalo-hotel.co.tz', role: 'receptionist', password: 'Recep@2026!' },
    { fullName: 'Housekeeping Supervisor', email: 'housekeeping@buffalo-hotel.co.tz', role: 'housekeeping', password: 'House@2026!' },
    { fullName: 'Restaurant Waiter', email: 'waiter@buffalo-hotel.co.tz', role: 'waiter', password: 'Waiter@2026!' },
  ]

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        hotelId: hotel.id,
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        roleId: roleMap[u.role],
        isActive: true,
      },
    })
  }
  console.log(`✅ ${users.length} users created`)
  return hotel
}

async function cleanAllData() {
  console.log('🧹 Cleaning existing data...')
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
  console.log('✅ Data cleaned.')
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
  console.log(`✅ ${created.length} rooms created`)
  return created
}

async function seedAddonServices() {
  const addons = [
    { name: 'Chakula cha Asubuhi (Ziada)', nameEn: 'Extra Breakfast', price: 15000, category: 'food' as AddonCategory },
    { name: 'Chakula cha Mchana', nameEn: 'Lunch', price: 20000, category: 'food' as AddonCategory },
    { name: 'Chakula cha Jioni', nameEn: 'Dinner', price: 25000, category: 'food' as AddonCategory },
    { name: 'Kinywaji (Bar)', nameEn: 'Beverage (Bar)', price: 5000, category: 'beverage' as AddonCategory },
    { name: 'Usafiri wa Uwanja wa Ndege', nameEn: 'Airport Transfer', price: 50000, category: 'transport' as AddonCategory },
    { name: 'Dobi (Laundry)', nameEn: 'Laundry Service', price: 10000, category: 'laundry' as AddonCategory },
  ]
  const created = []
  for (const addon of addons) {
    const a = await prisma.addonService.create({ data: addon })
    created.push(a)
  }
  console.log(`✅ ${created.length} addon services created`)
  return created
}

async function seedSuppliers(hotelId: string) {
  const suppliersData = [
    { name: 'Morogoro General Supplies', phone: '+255712000001', email: 'supplies@mgs.co.tz', address: 'Morogoro Town', paymentTerms: '30 days net', notes: 'Reliable supplier' },
    { name: 'Tanzania Breweries Ltd', phone: '+255712000002', email: null, address: 'Dar es Salaam', paymentTerms: '14 days net', notes: 'Min order 2 crates' },
    { name: 'Karibu Textiles', phone: '+255712000003', email: 'karibu.textiles@gmail.com', address: 'Industrial Area', paymentTerms: 'Cash on delivery', notes: 'Linen supplier' },
    { name: 'Safari Distributors', phone: '+255712000004', email: 'orders@safaridist.co.tz', address: 'Moshi', paymentTerms: '7 days net', notes: 'Soft drinks & water' },
    { name: 'Jumbo Foods', phone: '+255712000005', email: 'sales@jumbofoods.co.tz', address: 'Arusha', paymentTerms: '30 days net', notes: 'Dry foods & kitchen supplies' },
    { name: 'Kilimanjaro Fresh Produce', phone: '+255712000006', email: 'fresh@kiliproduce.co.tz', address: 'Moshi', paymentTerms: 'Cash on delivery', notes: 'Vegetables & fruits' },
  ]

  const created = []
  for (const s of suppliersData) {
    const supplier = await prisma.supplier.create({ data: { ...s, hotelId, isActive: true } })
    created.push(supplier)
  }
  console.log(`✅ ${created.length} suppliers created`)
  return created
}

async function seedStoreItems(hotelId: string, suppliers: any[]) {
  const findSupplier = (name: string) => suppliers.find((s) => s.name.includes(name))?.id

  const itemsData = [
    // Bar Stock
    { name: 'Serengeti Beer (500ml)', sku: 'FB-001', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 48, minimumStock: 24, maximumStock: 120, unitCost: 1800, sellingPrice: 3500, isSellable: true, supplierName: 'Tanzania Breweries Ltd' },
    { name: 'Kilimanjaro Beer (500ml)', sku: 'FB-002', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 36, minimumStock: 24, maximumStock: 120, unitCost: 1800, sellingPrice: 3500, isSellable: true, supplierName: 'Tanzania Breweries Ltd' },
    { name: 'Tusker Lager (500ml)', sku: 'FB-003', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 24, minimumStock: 12, maximumStock: 80, unitCost: 1900, sellingPrice: 3800, isSellable: true, supplierName: 'Tanzania Breweries Ltd' },
    { name: 'Red Wine (Bottle)', sku: 'FB-004', category: 'FB', subCategory: 'Bar Stock', unit: 'BOTTLE', currentStock: 12, minimumStock: 6, maximumStock: 30, unitCost: 12000, sellingPrice: 25000, isSellable: true, supplierName: 'Safari Distributors' },
    // Beverages
    { name: 'Coca Cola (300ml)', sku: 'FB-005', category: 'FB', subCategory: 'Beverages', unit: 'BOTTLE', currentStock: 60, minimumStock: 30, maximumStock: 150, unitCost: 600, sellingPrice: 1500, isSellable: true, supplierName: 'Safari Distributors' },
    { name: 'Mineral Water (500ml)', sku: 'FB-006', category: 'FB', subCategory: 'Beverages', unit: 'BOTTLE', currentStock: 40, minimumStock: 40, maximumStock: 200, unitCost: 400, sellingPrice: 1000, isSellable: true, supplierName: 'Safari Distributors' },
    { name: 'Fresh Juice (Orange)', sku: 'FB-007', category: 'FB', subCategory: 'Beverages', unit: 'PCS', currentStock: 20, minimumStock: 10, maximumStock: 50, unitCost: 1500, sellingPrice: 4000, isSellable: true, supplierName: 'Jumbo Foods' },
    { name: 'Energy Drink', sku: 'FB-008', category: 'FB', subCategory: 'Beverages', unit: 'BOTTLE', currentStock: 30, minimumStock: 15, maximumStock: 60, unitCost: 1200, sellingPrice: 2500, isSellable: true, supplierName: 'Safari Distributors' },
    // Food
    { name: 'Breakfast Plate (Full)', sku: 'FB-009', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 3000, sellingPrice: 8000, isSellable: true, supplierName: 'Jumbo Foods' },
    { name: 'Chips (Portion)', sku: 'FB-010', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 1000, sellingPrice: 3000, isSellable: true, supplierName: 'Jumbo Foods' },
    { name: 'Pilau (Plate)', sku: 'FB-011', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 1500, sellingPrice: 5000, isSellable: true, supplierName: 'Jumbo Foods' },
    { name: 'Chicken (Half)', sku: 'FB-012', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 5000, sellingPrice: 12000, isSellable: true, supplierName: 'Jumbo Foods' },
    { name: 'Beef Steak', sku: 'FB-013', category: 'FB', subCategory: 'Food', unit: 'PCS', currentStock: 99, minimumStock: 0, maximumStock: 99, unitCost: 6000, sellingPrice: 15000, isSellable: true, supplierName: 'Jumbo Foods' },
    // Dry Foods
    { name: 'Rice (25kg bag)', sku: 'FB-014', category: 'FB', subCategory: 'Dry Foods', unit: 'KG', currentStock: 75, minimumStock: 25, maximumStock: 200, unitCost: 2200, sellingPrice: null, isSellable: false, supplierName: 'Jumbo Foods' },
    { name: 'Cooking Oil (20L)', sku: 'FB-015', category: 'FB', subCategory: 'Dry Foods', unit: 'LTR', currentStock: 40, minimumStock: 20, maximumStock: 100, unitCost: 4500, sellingPrice: null, isSellable: false, supplierName: 'Jumbo Foods' },
    { name: 'Sugar (50kg)', sku: 'FB-016', category: 'FB', subCategory: 'Dry Foods', unit: 'KG', currentStock: 50, minimumStock: 20, maximumStock: 100, unitCost: 1800, sellingPrice: null, isSellable: false, supplierName: 'Jumbo Foods' },
    { name: 'Fresh Vegetables Pack', sku: 'FB-017', category: 'FB', subCategory: 'Dry Foods', unit: 'PCS', currentStock: 15, minimumStock: 10, maximumStock: 40, unitCost: 5000, sellingPrice: null, isSellable: false, supplierName: 'Kilimanjaro Fresh Produce' },
    // Hotel
    { name: 'Bath Towel (Large)', sku: 'HT-001', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 20, minimumStock: 16, maximumStock: 40, unitCost: 8000, sellingPrice: null, isSellable: false, supplierName: 'Karibu Textiles' },
    { name: 'Bed Sheet (King)', sku: 'HT-002', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 12, minimumStock: 8, maximumStock: 24, unitCost: 15000, sellingPrice: null, isSellable: false, supplierName: 'Karibu Textiles' },
    { name: 'Shower Gel (50ml)', sku: 'HT-003', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 8, minimumStock: 20, maximumStock: 80, unitCost: 1200, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Toilet Soap (bar)', sku: 'HT-004', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 15, minimumStock: 20, maximumStock: 80, unitCost: 800, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Toilet Paper (roll)', sku: 'HT-005', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'ROLL', currentStock: 30, minimumStock: 24, maximumStock: 100, unitCost: 500, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Garbage Bags (roll)', sku: 'HT-006', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'ROLL', currentStock: 5, minimumStock: 6, maximumStock: 24, unitCost: 2000, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Floor Detergent (5L)', sku: 'HT-007', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'LTR', currentStock: 4, minimumStock: 5, maximumStock: 20, unitCost: 3500, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Air Freshener', sku: 'HT-008', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'PCS', currentStock: 10, minimumStock: 8, maximumStock: 30, unitCost: 2500, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
  ]

  const created = []
  for (const item of itemsData) {
    const supplierId = findSupplier(item.supplierName)
    const createdItem = await prisma.storeItem.create({
      data: {
        hotelId,
        name: item.name,
        sku: item.sku,
        category: item.category as any,
        subCategory: item.subCategory,
        unit: item.unit as any,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        maximumStock: item.maximumStock,
        unitCost: item.unitCost,
        sellingPrice: item.sellingPrice,
        isSellable: item.isSellable,
        isActive: true,
        supplierId,
      },
    })
    created.push(createdItem)
    storeItemMap.set(createdItem.id, createdItem)
  }
  console.log(`✅ ${created.length} store items created`)
  return created
}

async function seedPurchaseOrders(hotelId: string, adminId: string, storeItems: any[], suppliers: any[]) {
  const findItem = (sku: string) => storeItems.find((i) => i.sku === sku)!
  const findSupplier = (name: string) => suppliers.find((s) => s.name.includes(name))!.id

  const posData = [
    {
      poNumber: 'PO-2026-001',
      status: 'RECEIVED' as POStatus,
      supplierId: findSupplier('Tanzania Breweries'),
      totalAmount: 201600,
      notes: 'Monthly bar stock delivery',
      expectedDelivery: addDays(new Date(), -15),
      receivedAt: addDays(new Date(), -14),
      items: [
        { itemId: findItem('FB-001').id, quantityOrdered: 48, quantityReceived: 48, unitCost: 1800, totalCost: 86400 },
        { itemId: findItem('FB-002').id, quantityOrdered: 36, quantityReceived: 36, unitCost: 1800, totalCost: 64800 },
        { itemId: findItem('FB-003').id, quantityOrdered: 24, quantityReceived: 24, unitCost: 1900, totalCost: 45600 },
      ],
    },
    {
      poNumber: 'PO-2026-002',
      status: 'PENDING' as POStatus,
      supplierId: findSupplier('Karibu Textiles'),
      totalAmount: 340000,
      notes: 'Quarterly linen restock',
      expectedDelivery: addDays(new Date(), 3),
      receivedAt: null,
      items: [
        { itemId: findItem('HT-001').id, quantityOrdered: 20, quantityReceived: 0, unitCost: 8000, totalCost: 160000 },
        { itemId: findItem('HT-002').id, quantityOrdered: 12, quantityReceived: 0, unitCost: 15000, totalCost: 180000 },
      ],
    },
    {
      poNumber: 'PO-2026-003',
      status: 'PENDING' as POStatus,
      supplierId: findSupplier('Morogoro General'),
      totalAmount: 110000,
      notes: 'Urgent — amenities below minimum stock',
      expectedDelivery: addDays(new Date(), 2),
      receivedAt: null,
      items: [
        { itemId: findItem('HT-003').id, quantityOrdered: 60, quantityReceived: 0, unitCost: 1200, totalCost: 72000 },
        { itemId: findItem('HT-004').id, quantityOrdered: 40, quantityReceived: 0, unitCost: 800, totalCost: 32000 },
        { itemId: findItem('HT-006').id, quantityOrdered: 3, quantityReceived: 0, unitCost: 2000, totalCost: 6000 },
      ],
    },
    {
      poNumber: 'PO-2026-004',
      status: 'CLOSED' as POStatus,
      supplierId: findSupplier('Safari Distributors'),
      totalAmount: 72000,
      notes: 'Soft drinks weekly order',
      expectedDelivery: addDays(new Date(), -5),
      receivedAt: addDays(new Date(), -4),
      items: [
        { itemId: findItem('FB-005').id, quantityOrdered: 60, quantityReceived: 60, unitCost: 600, totalCost: 36000 },
        { itemId: findItem('FB-006').id, quantityOrdered: 90, quantityReceived: 90, unitCost: 400, totalCost: 36000 },
      ],
    },
    {
      poNumber: 'PO-2026-005',
      status: 'RECEIVED' as POStatus,
      supplierId: findSupplier('Jumbo Foods'),
      totalAmount: 95500,
      notes: 'Dry foods delivery',
      expectedDelivery: addDays(new Date(), -10),
      receivedAt: addDays(new Date(), -9),
      items: [
        { itemId: findItem('FB-014').id, quantityOrdered: 25, quantityReceived: 25, unitCost: 2200, totalCost: 55000 },
        { itemId: findItem('FB-015').id, quantityOrdered: 5, quantityReceived: 5, unitCost: 4500, totalCost: 22500 },
        { itemId: findItem('FB-016').id, quantityOrdered: 10, quantityReceived: 10, unitCost: 1800, totalCost: 18000 },
      ],
    },
    {
      poNumber: 'PO-2026-006',
      status: 'PENDING' as POStatus,
      supplierId: findSupplier('Kilimanjaro Fresh Produce'),
      totalAmount: 75000,
      notes: 'Weekly vegetables & fruits',
      expectedDelivery: addDays(new Date(), 1),
      receivedAt: null,
      items: [{ itemId: findItem('FB-017').id, quantityOrdered: 15, quantityReceived: 0, unitCost: 5000, totalCost: 75000 }],
    },
  ]

  for (const po of posData) {
    await prisma.purchaseOrder.create({
      data: {
        hotelId,
        poNumber: po.poNumber,
        status: po.status,
        supplierId: po.supplierId,
        totalAmount: po.totalAmount,
        notes: po.notes,
        expectedDelivery: po.expectedDelivery,
        receivedAt: po.receivedAt,
        createdById: adminId,
        items: {
          create: po.items.map((i) => ({
            itemId: i.itemId,
            quantityOrdered: i.quantityOrdered,
            quantityReceived: i.quantityReceived,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      },
    })

  }
  console.log(`✅ ${posData.length} purchase orders created`)
}

async function seedStoreTransactions(adminId: string) {
  const allIds = Array.from(stockState.keys())
  const fbItems = allIds.filter((id) => storeItemMap.get(id)?.category === 'FB')
  const amenityItems = allIds.filter((id) => {
    const item = storeItemMap.get(id)
    return item?.category === 'HOTEL' && item?.subCategory?.includes('Bathroom')
  })

  let txCount = 0
  // Random F&B stock-outs tied to room service over the last 30 days
  for (let i = 0; i < 45; i++) {
    const itemId = pickOne(fbItems)
    const qty = randomInt(1, 4)
    const room = randomInt(101, 130)
    const tx = await adjustStock(itemId, qty, 'STOCK_OUT', `Room ${room}`, `Room charge / room service`, adminId)
    if (tx) txCount++
  }

  // Housekeeping consumption of amenities
  for (let i = 0; i < 30; i++) {
    const itemId = pickOne(amenityItems)
    const qty = randomInt(1, 5)
    const room = randomInt(101, 130)
    const tx = await adjustStock(itemId, qty, 'STOCK_OUT', `Room ${room}`, `Housekeeping consumption`, adminId)
    if (tx) txCount++
  }

  // Some wastage and adjustments
  const wastageTargets = allIds.filter((id) => storeItemMap.get(id)?.category === 'FB')
  for (let i = 0; i < 6; i++) {
    const itemId = pickOne(wastageTargets)
    const qty = randomInt(1, 3)
    await adjustStock(itemId, qty, 'WASTAGE', 'WASTAGE-ADJ', 'Expired / damaged stock', adminId)
    txCount++
  }

  for (let i = 0; i < 4; i++) {
    const itemId = pickOne(allIds)
    const qty = randomInt(1, 5) * (chance(0.5) ? 1 : -1)
    await adjustStock(itemId, qty, 'ADJUSTMENT', 'Stock count', 'Physical stock count adjustment', adminId)
    txCount++
  }

  console.log(`✅ ${txCount} additional store transactions created`)
}

async function seedExpenses(hotelId: string, adminId: string) {
  const today = new Date()
  const categories: ExpenseCategory[] = ['salary', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']
  const descriptions: Record<ExpenseCategory, string[]> = {
    salary: ['Monthly staff salaries', 'Overtime payment', 'Night-shift allowance', 'Casual labour wages'],
    utilities: ['Electricity bill', 'Water bill', 'Internet & phone', 'Luku tokens', 'Generator fuel'],
    maintenance: ['AC repair', 'Plumbing repair', 'Carpentry work', 'Painting touch-up', 'Lift service'],
    supplies: ['Housekeeping supplies', 'Kitchen restock', 'Office stationery', 'Toiletries restock', 'Linen replacement'],
    marketing: ['Social media campaign', 'Google ads', 'Brochure printing', 'Travel agent commission', 'Website maintenance'],
    other: ['Bank charges', 'Licence renewal', 'Staff transport', 'Guest refund', 'Miscellaneous'],
  }

  const created = []
  for (let i = 0; i < 80; i++) {
    const category = pickOne(categories)
    const date = randomDate(addDays(today, -90), today)
    const amount = randomInt(20000, 600000)
    const expense = await prisma.expense.create({
      data: {
        hotelId,
        userId: adminId,
        amount,
        category,
        description: pickOne(descriptions[category]),
        date,
      },
    })
    created.push(expense)
  }
  console.log(`✅ ${created.length} expenses created`)
}

async function seedGuests() {
  const firstNames = [
    'Juma', 'Amina', 'John', 'Marie', 'Peter', 'Grace', 'David', 'Sarah', 'Emily', 'Michael',
    'Fatima', 'James', 'Lucy', 'Robert', 'Halima', 'Carlos', 'Yuki', 'Ibrahim', 'Nadia', 'William',
    'Esther', 'Daniel', 'Joyce', 'Thomas', 'Sophia', 'Ali', 'Hannah', 'Joseph', 'Ruth', 'Kevin',
    'Mariam', 'Eric', 'Christine', 'Francis', 'Asha', 'Mark', 'Lilian', 'Paul', 'Zainab', 'George',
    'Victoria', 'Hassan', 'Janet', 'Edward', 'Rose', 'Samwel', 'Cecilia', 'Patrick', 'Agnes', 'Steven',
  ]
  const lastNames = [
    'Saidi', 'Hassan', 'Smith', 'Dubois', 'Müller', 'Mwangi', 'Kimaro', 'Johnson', 'Chen', 'Brown',
    'Omar', 'Wilson', 'Anderson', 'Taylor', 'Rajab', 'Mendez', 'Tanaka', 'Musa', 'Juma', 'White',
    'Mollel', 'Ndosi', 'Kapinga', 'Lyimo', 'Mwakasege', 'Shoo', 'Mushi', 'Magessa', 'Kweka', 'Rwegasira',
    'Joseph', 'Minja', 'Sumari', 'Mtui', 'Kisambu', 'Kessy', 'Massawe', 'Mrosso', 'Nkinda', 'Mallya',
  ]

  const nationalities = ['Tanzanian', 'British', 'American', 'German', 'French', 'Chinese', 'Australian', 'Canadian', 'Spanish', 'Japanese', 'Kenyan', 'Ugandan', 'South African', 'Rwandan']
  const idTypes: IdType[] = ['national_id', 'passport', 'drivers_license']

  const created = []
  for (let i = 0; i < 60; i++) {
    const first = pickOne(firstNames)
    const last = pickOne(lastNames)
    const nationality = pickOne(nationalities)
    const idType = nationality === 'Tanzanian' ? pickOne(['national_id', 'drivers_license']) : 'passport'
    const guest = await prisma.guest.create({
      data: {
        fullName: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`,
        phone: `+2557${randomInt(10, 99)}${String(randomInt(100000, 999999))}`,
        idType,
        idNumber: idType === 'passport' ? `${pickOne(['A','B','C','D','E','F'])}${randomInt(1000000, 9999999)}` : `${randomInt(1970, 2005)}${String(randomInt(1, 12)).padStart(2,'0')}${String(randomInt(1,28)).padStart(2,'0')}-${String(randomInt(1, 99999)).padStart(5,'0')}-${randomInt(0, 99)}`,
        nationality,
      } as any,
    })
    created.push(guest)
  }
  console.log(`✅ ${created.length} guests created`)
  return created
}

async function seedCompanies(hotelId: string) {
  const companiesData = [
    { name: 'Kazi Huru Platform', email: 'finance@kazihuru.co.tz', phone: '+255745100001', address: 'Dar es Salaam', tinNumber: '101-234-567', contactPerson: 'Emmanuel Joseph', notes: 'Corporate retainer' },
    { name: 'Safari Trails Ltd', email: 'accounts@safaritrails.co.tz', phone: '+255745100002', address: 'Arusha', tinNumber: '102-345-678', contactPerson: 'Neema Mollel', notes: 'Tour operator partner' },
    { name: 'Tanzania Mining Co', email: 'procurement@tzmining.co.tz', phone: '+255745100003', address: 'Mwanza', tinNumber: '103-456-789', contactPerson: 'John Magesa', notes: 'Frequent business guest' },
    { name: 'Moshi Adventure Group', email: 'reservations@moshiadventure.co.tz', phone: '+255745100004', address: 'Moshi', tinNumber: '104-567-890', contactPerson: 'Grace Lema', notes: 'Kilimanjaro trek bookings' },
    { name: 'Northern Circuit Logistics', email: 'ops@northerncircuit.co.tz', phone: '+255745100005', address: 'Arusha', tinNumber: '105-678-901', contactPerson: 'Daniel Shoo', notes: 'Monthly room block' },
  ]

  const created = []
  for (const c of companiesData) {
    const company = await prisma.company.create({ data: { ...c, hotelId, isActive: true } })
    created.push(company)
  }
  console.log(`✅ ${created.length} companies created`)
  return created
}

// Will be populated while seeding bookings and used by service requests
let seededCheckedInBookings: any[] = []

// Replaced by seedExtraRequests which creates service requests after guest accounts exist
async function seedHousekeepingLogs(userId: string, rooms: any[]) {
  const statuses: HousekeepingStatus[] = ['clean', 'dirty', 'cleaning', 'inspected']
  const notes = ['Ready for guest', 'Checkout cleanup needed', 'In progress', 'Inspected and ready', 'Deep cleaning requested']

  for (const room of rooms) {
    const count = randomInt(2, 4)
    for (let i = 0; i < count; i++) {
      await prisma.housekeepingLog.create({
        data: {
          roomId: room.id,
          updatedById: userId,
          status: pickOne(statuses),
          notes: pickOne(notes),
          updatedAt: addDays(new Date(), -randomInt(0, 14)),
        },
      })
    }
  }
  console.log(`✅ Housekeeping logs created`)
}

interface BookingSeedContext {
  hotelId: string
  adminId: string
  receptionistId: string
  housekeepingUserId: string
  waiterId: string
  rooms: any[]
  addons: any[]
  storeItems: any[]
  guests: any[]
  companies: any[]
}

interface SeededBooking {
  booking: any
  guest: any
  company: any | null
  room: any
  guestAccountId?: string
}

async function seedBookingsAndRelated(ctx: BookingSeedContext) {
  const today = startOfDay(new Date())
  const sellableItems = ctx.storeItems.filter((i) => i.isSellable)
  const roomSchedules = new Map<string, Array<[Date, Date]>>()
  const createdBookings: SeededBooking[] = []

  function overlaps(roomId: string, checkIn: Date, checkOut: Date) {
    const list = roomSchedules.get(roomId) || []
    const in0 = startOfDay(checkIn).getTime()
    const out0 = startOfDay(checkOut).getTime()
    return list.some(([inD, outD]) => in0 < outD.getTime() && out0 > inD.getTime())
  }

  function trackBooking(roomId: string, checkIn: Date, checkOut: Date) {
    const list = roomSchedules.get(roomId) || []
    list.push([startOfDay(checkIn), startOfDay(checkOut)])
    roomSchedules.set(roomId, list)
  }

  function deriveStatus(checkIn: Date, checkOut: Date): BookingStatus {
    const cin = startOfDay(checkIn).getTime()
    const cout = startOfDay(checkOut).getTime()
    const now = today.getTime()

    if (cout < now) {
      // Past stay
      const r = Math.random()
      if (r < 0.12) return 'cancelled'
      if (r < 0.18) return 'no_show'
      return 'checked_out'
    }
    if (cin <= now && cout > now) {
      // Current stay
      return Math.random() < 0.85 ? 'checked_in' : 'late_checkout'
    }
    // Future stay
    return Math.random() < 0.65 ? 'confirmed' : 'pending'
  }

  const targetCount = 150
  for (let i = 0; i < targetCount; i++) {
    // Random dates across last 60 days and next 30 days
    const checkIn = addDays(today, randomInt(-55, 28))
    const nights = randomInt(1, 5)
    const checkOut = addDays(checkIn, nights)
    const status = deriveStatus(checkIn, checkOut)

    let room = pickOne(ctx.rooms)
    let attempts = 0
    while (overlaps(room.id, checkIn, checkOut) && attempts < 25) {
      room = pickOne(ctx.rooms)
      attempts++
    }
    trackBooking(room.id, checkIn, checkOut)

    const bookingType: BookingType = Math.random() < 0.15 ? 'company' : 'individual'
    const company = bookingType === 'company' ? pickOne(ctx.companies) : null
    const guest = pickOne(ctx.guests)
    const source: BookingSource = pickOne(['online_self', 'staff_entry', 'walk_in'])

    const roomTotal = Number(room.pricePerNight) * nights
    const initialTotal = roomTotal

    const booking = await prisma.booking.create({
      data: {
        bookingRef: await generateBookingRef(),
        hotelId: ctx.hotelId,
        guestId: guest.id,
        companyId: company?.id || null,
        roomId: room.id,
        createdById: ctx.receptionistId,
        source,
        status,
        bookingType,
        checkIn,
        checkOut,
        actualCheckIn:
          status === 'checked_in' || status === 'checked_out' || status === 'late_checkout'
            ? addHours(checkIn, 14 + randomInt(0, 4))
            : null,
        actualCheckOut: status === 'checked_out' ? addHours(checkOut, 11 + randomInt(0, 3)) : null,
        adults: randomInt(1, Math.min(2, room.capacity)),
        children: room.capacity > 2 ? randomInt(0, 1) : 0,
        roomTotal,
        addonsTotal: 0,
        totalAmount: initialTotal,
        paidAmount: 0,
        balanceDue: initialTotal,
        specialRequests: pickOne(['Ground floor please', 'Extra pillow', 'Airport transfer', 'Quiet room', 'Late check-in', null]),
        internalNotes: pickOne(['Repeat guest', 'VIP', 'Late arrival expected', 'Online promo', null]),
      },
    })

    // Booking guests
    const bookingGuests: any[] = [
      {
        bookingId: booking.id,
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email,
        nationality: guest.nationality,
        idType: guest.idType,
        idNumber: guest.idNumber,
        ageCategory: 'adult',
        isPrimary: true,
      },
    ]
    if (booking.adults + booking.children > 1) {
      bookingGuests.push({
        bookingId: booking.id,
        fullName: `Companion ${guest.fullName.split(' ')[0]}`,
        phone: guest.phone,
        email: null,
        nationality: guest.nationality,
        idType: null,
        idNumber: null,
        ageCategory: booking.children > 0 ? 'child' : 'adult',
        isPrimary: false,
      })
    }
    await prisma.bookingGuest.createMany({ data: bookingGuests as any })

    // Update room status for active/current stays
    if (status === 'checked_in' || status === 'late_checkout') {
      await prisma.room.update({ where: { id: room.id }, data: { status: 'occupied' } })
    } else if (status === 'checked_out') {
      await prisma.room.update({ where: { id: room.id }, data: { status: 'dirty' } })
    }

    // Addons for applicable bookings
    let addonsTotal = 0
    if (!['pending', 'cancelled', 'no_show'].includes(status) && chance(0.65)) {
      const selectedAddons = pickSome(ctx.addons, randomInt(1, 3))
      for (const addon of selectedAddons) {
        const qty = randomInt(1, 2)
        const subtotal = Number(addon.price) * qty
        addonsTotal += subtotal
        await prisma.bookingAddon.create({
          data: {
            bookingId: booking.id,
            addonId: addon.id,
            quantity: qty,
            unitPrice: addon.price,
            subtotal,
          },
        })
      }
    }

    // Room charges for in-house / completed stays
    let chargesTotal = 0
    if (['checked_in', 'checked_out', 'late_checkout'].includes(status) && sellableItems.length > 0 && chance(0.85)) {
      const chargeCount = randomInt(1, 4)
      for (let c = 0; c < chargeCount; c++) {
        const item = pickOne(sellableItems)
        const qty = randomInt(1, 3)
        const unitPrice = Number(item.sellingPrice)
        const totalPrice = unitPrice * qty
        chargesTotal += totalPrice

        await prisma.roomCharge.create({
          data: {
            bookingId: booking.id,
            totalAmount: totalPrice,
            status: 'SETTLED' as ChargeStatus,
            notes: pickOne(['Bar charge', 'Restaurant charge', 'Minibar', 'Room service', 'Kitchen order']),
            postedById: ctx.waiterId,
            settledAt: status === 'checked_out' ? addHours(checkOut, 12) : addHours(checkIn, 20 + c),
            items: {
              create: {
                itemId: item.id,
                itemName: item.name,
                quantity: qty,
                unitPrice,
                totalPrice,
              },
            },
          },
        })

        // Deduct stock
        await adjustStock(item.id, qty, 'STOCK_OUT', `Room ${room.roomNumber}`, `Room charge for ${booking.bookingRef}`, ctx.waiterId)
      }
    }

    // Update totals after addons & charges
    if (addonsTotal > 0 || chargesTotal > 0) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          addonsTotal: { increment: addonsTotal },
          totalAmount: { increment: addonsTotal + chargesTotal },
          balanceDue: { increment: addonsTotal + chargesTotal },
        },
      })
    }

    // Payments
    let paidAmount = 0
    const finalBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
    const totalDue = Number(finalBooking!.totalAmount)

    if (status === 'checked_out') {
      if (chance(0.88)) {
        paidAmount = totalDue
      } else if (chance(0.7)) {
        paidAmount = Math.floor(totalDue * randomFloat(0.5, 0.85, 2))
      }
    } else if (status === 'checked_in' || status === 'late_checkout') {
      if (chance(0.55)) {
        paidAmount = Math.floor(totalDue * randomFloat(0.25, 0.6, 2))
      }
    } else if (status === 'confirmed') {
      if (chance(0.35)) {
        paidAmount = Math.floor(totalDue * randomFloat(0.3, 0.5, 2))
      }
    }

    if (paidAmount > 0) {
      const methods: PaymentMethod[] = ['cash', 'mpesa', 'bank_transfer', 'visa']
      const paidAt = status === 'checked_out' ? addHours(checkOut, 12) : addHours(checkIn, 10 + randomInt(0, 12))
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          receivedById: ctx.receptionistId,
          amount: paidAmount,
          method: pickOne(methods),
          status: 'completed',
          paidAt,
          notes: paidAmount >= totalDue ? 'Full payment received' : 'Partial payment / deposit',
        },
      })

      await prisma.receipt.create({
        data: {
          bookingId: booking.id,
          paymentId: payment.id,
          receiptNumber: await generateReceiptNumber(),
          pdfUrl: 'https://buffalo-hotel.co.tz/receipts/sample.pdf',
          issuedById: ctx.receptionistId,
          issuedAt: paidAt,
        },
      })

      await prisma.booking.update({
        where: { id: booking.id },
        data: { paidAmount: { increment: paidAmount }, balanceDue: { decrement: paidAmount } },
      })

      // Invoice only when fully paid
      if (paidAmount >= totalDue) {
        const invoice = await prisma.invoice.create({
          data: {
            hotelId: ctx.hotelId,
            invoiceNumber: await generateInvoiceNumber(),
            type: company ? 'company' : 'individual',
            status: 'paid',
            // bookingId removed from Invoice — InvoiceBooking (created below)
            // is now the only link between an invoice and its booking(s).
            companyId: company?.id || null,
            amount: totalDue,
            totalAmount: totalDue,
            paidAmount: totalDue,
            notes: `Invoice for ${booking.bookingRef}`,
            paidAt,
          },
        })
        await prisma.invoiceBooking.create({
          data: { invoiceId: invoice.id, bookingId: booking.id },
        })
      }

      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          type: 'payment_receipt',
          channel: company ? 'email' : 'sms',
          recipient: company?.email || guest.email || guest.phone,
          subject: `Payment received for ${booking.bookingRef}`,
          body: `Thank you for your payment. Receipt issued.`,
          status: 'pending',
        },
      })
    }

    // Notification for confirmed / checked in bookings
    if (status === 'confirmed' || status === 'checked_in') {
      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          type: status === 'checked_in' ? 'check_in_reminder' : 'booking_confirmation',
          channel: 'email',
          recipient: guest.email || guest.phone,
          subject: `Booking ${booking.bookingRef}`,
          body: `Your reservation at Buffalo Hotel is ${status}.`,
          status: 'pending',
        },
      })
    }

    // Reviews for a subset of checked-out guests
    if (status === 'checked_out' && chance(0.45)) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          guestId: guest.id,
          rating: randomInt(3, 5),
          comment: pickOne(['Great stay!', 'Friendly staff', 'Clean rooms', 'Good breakfast', 'Would recommend', 'Nice location', 'Comfortable bed']),
          isApproved: true,
          isPublished: true,
        },
      })
    }

    // Guest account for current/in-house bookings (used by service requests)
    let guestAccountId: string | undefined
    if ((status === 'checked_in' || status === 'late_checkout') && chance(0.6)) {
      const names = guest.fullName.split(' ')
      const account = await prisma.guestAccount.create({
        data: {
          email: `${booking.bookingRef.toLowerCase()}@guest.buffalo-hotel.co.tz`,
          firstName: names[0],
          lastName: names.slice(1).join(' ') || 'Guest',
          phone: guest.phone,
          status: 'ACTIVE',
          linkedBookingId: booking.id,
        } as any,
      })
      guestAccountId = account.id
    }

    createdBookings.push({ booking, guest, company, room, guestAccountId })
  }

  seededCheckedInBookings = createdBookings.filter(
    (b) => (b.booking.status === 'checked_in' || b.booking.status === 'late_checkout') && b.guestAccountId
  )

  console.log(`✅ ${createdBookings.length} bookings created with guests, addons, charges, payments & invoices`)
}

async function seedExtraRequests(hotelId: string) {
  const withAccounts = seededCheckedInBookings
  if (withAccounts.length === 0) return

  const serviceTypes: ServiceRequestType[] = ['laundry', 'taxi', 'tour', 'housekeeping', 'other']
  const serviceStatuses: ServiceRequestStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const rsStatuses: RoomServiceOrderStatus[] = ['PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED']
  const extensionStatuses: ExtensionRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

  const sellableItems = Array.from(storeItemMap.values()).filter((i: any) => i.isSellable && i.sellingPrice)

  // Service requests
  const serviceTargets = pickSome(withAccounts, Math.min(25, withAccounts.length))
  for (const entry of serviceTargets) {
    await prisma.serviceRequest.create({
      data: {
        requestId: `SR-${randomInt(10000, 99999)}`,
        guestAccountId: entry.guestAccountId!,
        bookingId: entry.booking.id,
        type: pickOne(serviceTypes),
        payload: { notes: 'Guest requested via dashboard' } as any,
        status: pickOne(serviceStatuses),
      },
    })
  }
  console.log(`✅ ${serviceTargets.length} service requests created`)

  // Room service orders
  const rsTargets = pickSome(withAccounts, Math.min(18, withAccounts.length))
  for (const entry of rsTargets) {
    const itemCount = randomInt(1, 3)
    // NOTE: RoomServiceOrder.items is now a real relation (RoomServiceOrderItem),
    // not a Json blob — each line item references the StoreItem it came from.
    const orderItems: { itemId: string; itemName: string; quantity: number; unitPrice: number; subtotal: number }[] = []
    let total = 0
    for (let i = 0; i < itemCount; i++) {
      const item = pickOne(sellableItems)
      const qty = randomInt(1, 3)
      const price = Math.round(Number(item.sellingPrice) / 100) * 100
      total += price * qty
      orderItems.push({ itemId: item.id, itemName: item.name, quantity: qty, unitPrice: price, subtotal: price * qty })
    }
    await prisma.roomServiceOrder.create({
      data: {
        orderId: `RSO-${randomInt(10000, 99999)}`,
        guestAccountId: entry.guestAccountId!,
        bookingId: entry.booking.id,
        totalAmount: total,
        notes: pickOne(['Please deliver by 8pm', 'Extra cutlery', 'No onions', null]),
        status: pickOne(rsStatuses),
        items: {
          create: orderItems,
        },
      },
    })
  }
  console.log(`✅ ${rsTargets.length} room service orders created`)

  // Extension requests
  const extTargets = pickSome(withAccounts, Math.min(12, withAccounts.length))
  for (const entry of extTargets) {
    const extra = randomInt(1, 3)
    await prisma.extensionRequest.create({
      data: {
        bookingId: entry.booking.id,
        extraNights: extra,
        requestedNewCheckout: addDays(entry.booking.checkOut, extra),
        reason: pickOne(['Flight delayed', 'Tour extended', 'Guest prefers to stay longer', 'Business meeting']),
        status: pickOne(extensionStatuses),
      },
    })
  }
  console.log(`✅ ${extTargets.length} extension requests created`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
