import { PrismaClient, PaymentMethod, PaymentStatus, BookingStatus, BookingSource, BookingType, ChargeStatus, InvoiceStatus, InvoiceType, HousekeepingStatus, ExpenseCategory, NotificationType, NotificationChannel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'
import { generateBookingRef, generateInvoiceNumber } from '../utils/generateRef'

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

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding FULL StayFlow dataset...')

  // 1. Hotel + users
  const hotel = await seedHotelAndUsers()
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@buffalo-hotel.co.tz' } })
  const receptionist = await prisma.user.findFirstOrThrow({ where: { email: 'reception@buffalo-hotel.co.tz' } })
  const housekeepingUser = await prisma.user.findFirstOrThrow({ where: { email: 'housekeeping@buffalo-hotel.co.tz' } })

  // 2. Clean all existing data (keep hotel/users)
  await cleanAllData()

  // 3. Seed lookup data
  const rooms = await seedRooms(hotel.id)
  const addons = await seedAddonServices()
  const suppliers = await seedSuppliers(hotel.id)
  const storeItems = await seedStoreItems(hotel.id, suppliers)
  await seedPurchaseOrders(hotel.id, admin.id, storeItems, suppliers)
  await seedStoreTransactions(admin.id, storeItems)
  await seedExpenses(hotel.id, admin.id)

  // 4. Seed guests & companies
  const guests = await seedGuests()
  const companies = await seedCompanies(hotel.id)

  // 5. Seed bookings with related data
  await seedBookingsAndRelated({
    hotelId: hotel.id,
    adminId: admin.id,
    receptionistId: receptionist.id,
    rooms,
    addons,
    storeItems,
    guests,
    companies,
  })

  // 6. Seed housekeeping logs
  await seedHousekeepingLogs(housekeepingUser.id, rooms)

  console.log('\n🎉 Full seeding completed!')
  console.log('   Login: admin@buffalo-hotel.co.tz / Admin@2026!')
  console.log('   Every dashboard section now has sample data to test.')
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
    }
  })
  console.log('✅ Hotel:', hotel.name)

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
        role: u.role as any,
        isActive: true,
      }
    })
    console.log('✅ User:', u.email)
  }

  return hotel
}

async function cleanAllData() {
  console.log('🧹 Cleaning existing data...')
  await prisma.roomServiceOrder.deleteMany()
  await prisma.serviceRequest.deleteMany()
  await prisma.extensionRequest.deleteMany()
  await prisma.guestAccount.deleteMany()
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
      }
    })
    created.push(room)
  }
  console.log(`✅ ${created.length} rooms created`)
  return created
}

async function seedAddonServices() {
  const addons = [
    { name: 'Chakula cha Asubuhi (Ziada)', nameEn: 'Extra Breakfast', price: 15000, category: 'food' as const },
    { name: 'Chakula cha Mchana', nameEn: 'Lunch', price: 20000, category: 'food' as const },
    { name: 'Chakula cha Jioni', nameEn: 'Dinner', price: 25000, category: 'food' as const },
    { name: 'Kinywaji (Bar)', nameEn: 'Beverage (Bar)', price: 5000, category: 'beverage' as const },
    { name: 'Usafiri wa Uwanja wa Ndege', nameEn: 'Airport Transfer', price: 50000, category: 'transport' as const },
    { name: 'Dobi (Laundry)', nameEn: 'Laundry Service', price: 10000, category: 'laundry' as const },
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
  const findSupplier = (name: string) => suppliers.find(s => s.name.includes(name))?.id

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
    // Hotel
    { name: 'Bath Towel (Large)', sku: 'HT-001', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 20, minimumStock: 16, maximumStock: 40, unitCost: 8000, sellingPrice: null, isSellable: false, supplierName: 'Karibu Textiles' },
    { name: 'Bed Sheet (King)', sku: 'HT-002', category: 'HOTEL', subCategory: 'Linen & Towels', unit: 'PCS', currentStock: 12, minimumStock: 8, maximumStock: 24, unitCost: 15000, sellingPrice: null, isSellable: false, supplierName: 'Karibu Textiles' },
    { name: 'Shower Gel (50ml)', sku: 'HT-003', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 8, minimumStock: 20, maximumStock: 80, unitCost: 1200, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Toilet Soap (bar)', sku: 'HT-004', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'PCS', currentStock: 15, minimumStock: 20, maximumStock: 80, unitCost: 800, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Toilet Paper (roll)', sku: 'HT-005', category: 'HOTEL', subCategory: 'Bathroom Amenities', unit: 'ROLL', currentStock: 30, minimumStock: 24, maximumStock: 100, unitCost: 500, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Garbage Bags (roll)', sku: 'HT-006', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'ROLL', currentStock: 5, minimumStock: 6, maximumStock: 24, unitCost: 2000, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
    { name: 'Floor Detergent (5L)', sku: 'HT-007', category: 'HOTEL', subCategory: 'Cleaning Supplies', unit: 'LTR', currentStock: 4, minimumStock: 5, maximumStock: 20, unitCost: 3500, sellingPrice: null, isSellable: false, supplierName: 'Morogoro General Supplies' },
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
      }
    })
    created.push(createdItem)
  }
  console.log(`✅ ${created.length} store items created`)
  return created
}

async function seedPurchaseOrders(hotelId: string, adminId: string, storeItems: any[], suppliers: any[]) {
  const findItem = (sku: string) => storeItems.find(i => i.sku === sku)!

  const posData = [
    {
      poNumber: 'PO-2026-001',
      status: 'RECEIVED',
      supplierId: suppliers.find(s => s.name.includes('Tanzania Breweries'))!.id,
      totalAmount: 86400,
      notes: 'Monthly bar stock delivery',
      expectedDelivery: addDays(new Date(), -10),
      receivedAt: addDays(new Date(), -9),
      items: [
        { itemId: findItem('FB-001').id, quantityOrdered: 48, quantityReceived: 48, unitCost: 1800, totalCost: 86400 },
      ]
    },
    {
      poNumber: 'PO-2026-002',
      status: 'SENT_TO_SUPPLIER',
      supplierId: suppliers.find(s => s.name.includes('Karibu Textiles'))!.id,
      totalAmount: 340000,
      notes: 'Quarterly linen restock',
      expectedDelivery: addDays(new Date(), 3),
      items: [
        { itemId: findItem('HT-001').id, quantityOrdered: 20, quantityReceived: 0, unitCost: 8000, totalCost: 160000 },
        { itemId: findItem('HT-002').id, quantityOrdered: 12, quantityReceived: 0, unitCost: 15000, totalCost: 180000 },
      ]
    },
    {
      poNumber: 'PO-2026-003',
      status: 'DRAFT',
      supplierId: suppliers.find(s => s.name.includes('Morogoro General'))!.id,
      totalAmount: 110000,
      notes: 'Urgent — amenities below minimum stock',
      expectedDelivery: addDays(new Date(), 2),
      items: [
        { itemId: findItem('HT-003').id, quantityOrdered: 60, quantityReceived: 0, unitCost: 1200, totalCost: 72000 },
        { itemId: findItem('HT-004').id, quantityOrdered: 40, quantityReceived: 0, unitCost: 800, totalCost: 32000 },
        { itemId: findItem('HT-006').id, quantityOrdered: 3, quantityReceived: 0, unitCost: 2000, totalCost: 6000 },
      ]
    },
    {
      poNumber: 'PO-2026-004',
      status: 'APPROVED',
      supplierId: suppliers.find(s => s.name.includes('Safari Distributors'))!.id,
      totalAmount: 72000,
      notes: 'Soft drinks weekly order',
      expectedDelivery: addDays(new Date(), 1),
      items: [
        { itemId: findItem('FB-005').id, quantityOrdered: 60, quantityReceived: 0, unitCost: 600, totalCost: 36000 },
        { itemId: findItem('FB-006').id, quantityOrdered: 90, quantityReceived: 0, unitCost: 400, totalCost: 36000 },
      ]
    },
  ]

  for (const po of posData) {
    await prisma.purchaseOrder.create({
      data: {
        hotelId,
        poNumber: po.poNumber,
        status: po.status as any,
        supplierId: po.supplierId,
        totalAmount: po.totalAmount,
        notes: po.notes,
        expectedDelivery: po.expectedDelivery,
        receivedAt: po.receivedAt,
        createdById: adminId,
        items: {
          create: po.items.map(i => ({
            itemId: i.itemId,
            quantityOrdered: i.quantityOrdered,
            quantityReceived: i.quantityReceived,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      }
    })
  }
  console.log(`✅ ${posData.length} purchase orders created`)
}

async function seedStoreTransactions(adminId: string, storeItems: any[]) {
  const findItem = (sku: string) => storeItems.find(i => i.sku === sku)!
  const txs = [
    { itemId: findItem('FB-001').id, type: 'STOCK_IN', quantity: 48, unitCost: 1800, balanceBefore: 0, balanceAfter: 48, reference: 'PO-2026-001', notes: 'Delivery received from TBL' },
    { itemId: findItem('FB-002').id, type: 'STOCK_IN', quantity: 36, unitCost: 1800, balanceBefore: 0, balanceAfter: 36, reference: 'PO-2026-001', notes: 'Delivery received from TBL' },
    { itemId: findItem('FB-005').id, type: 'STOCK_IN', quantity: 60, unitCost: 600, balanceBefore: 0, balanceAfter: 60, reference: 'PO-2026-004', notes: 'Soft drinks delivery' },
    { itemId: findItem('FB-006').id, type: 'STOCK_IN', quantity: 40, unitCost: 400, balanceBefore: 0, balanceAfter: 40, reference: 'PO-2026-004', notes: 'Water delivery' },
    { itemId: findItem('FB-001').id, type: 'STOCK_OUT', quantity: 4, unitCost: 1800, balanceBefore: 48, balanceAfter: 44, reference: 'Room 101', notes: 'Guest room charge' },
    { itemId: findItem('FB-009').id, type: 'STOCK_OUT', quantity: 2, unitCost: 3000, balanceBefore: 99, balanceAfter: 97, reference: 'Kitchen', notes: 'Breakfast served' },
    { itemId: findItem('HT-003').id, type: 'STOCK_OUT', quantity: 4, unitCost: 1200, balanceBefore: 12, balanceAfter: 8, reference: 'Housekeeping', notes: 'Room replenishment' },
    { itemId: findItem('HT-005').id, type: 'STOCK_OUT', quantity: 12, unitCost: 500, balanceBefore: 42, balanceAfter: 30, reference: 'Housekeeping', notes: 'Room replenishment' },
    { itemId: findItem('FB-007').id, type: 'WASTAGE', quantity: 2, unitCost: 1500, balanceBefore: 22, balanceAfter: 20, reference: undefined, notes: 'Expired — not sold' },
    { itemId: findItem('HT-001').id, type: 'ADJUSTMENT', quantity: 20, unitCost: 8000, balanceBefore: 0, balanceAfter: 20, reference: 'Stock count', notes: 'Stock count correction' },
  ]

  for (const tx of txs) {
    await prisma.storeTransaction.create({
      data: {
        itemId: tx.itemId,
        type: tx.type as any,
        quantity: tx.quantity,
        unitCost: tx.unitCost,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        reference: tx.reference,
        notes: tx.notes,
        performedById: adminId,
      }
    })
  }
  console.log(`✅ ${txs.length} store transactions created`)
}

async function seedExpenses(hotelId: string, adminId: string) {
  const expenses = [
    { amount: 450000, category: 'salary', description: 'Monthly staff salaries', date: addDays(new Date(), -5) },
    { amount: 120000, category: 'utilities', description: 'Electricity bill', date: addDays(new Date(), -10) },
    { amount: 85000, category: 'utilities', description: 'Water bill', date: addDays(new Date(), -12) },
    { amount: 65000, category: 'maintenance', description: 'AC repair Room 203', date: addDays(new Date(), -3) },
    { amount: 220000, category: 'supplies', description: 'Monthly housekeeping supplies', date: addDays(new Date(), -7) },
    { amount: 150000, category: 'marketing', description: 'Social media campaign', date: addDays(new Date(), -15) },
    { amount: 35000, category: 'other', description: 'Office stationery', date: addDays(new Date(), -2) },
    { amount: 180000, category: 'supplies', description: 'Kitchen restock', date: addDays(new Date(), -8) },
  ]

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        hotelId,
        userId: adminId,
        amount: e.amount,
        category: e.category as any,
        description: e.description,
        date: e.date,
      }
    })
  }
  console.log(`✅ ${expenses.length} expenses created`)
}

async function seedGuests() {
  const guestsData = [
    { fullName: 'Juma Saidi', email: 'juma.saidi@email.co.tz', phone: '+255745000001', idType: 'national_id', idNumber: '19900101-00001-00', nationality: 'Tanzanian' },
    { fullName: 'Amina Hassan', email: 'amina.hassan@email.co.tz', phone: '+255745000002', idType: 'national_id', idNumber: '19910202-00002-00', nationality: 'Tanzanian' },
    { fullName: 'John Smith', email: 'john.smith@email.com', phone: '+255745000003', idType: 'passport', idNumber: 'A12345678', nationality: 'British' },
    { fullName: 'Marie Dubois', email: 'marie.dubois@email.fr', phone: '+255745000004', idType: 'passport', idNumber: 'FR99887766', nationality: 'French' },
    { fullName: 'Peter Müller', email: 'peter.mueller@email.de', phone: '+255745000005', idType: 'passport', idNumber: 'DE11223344', nationality: 'German' },
    { fullName: 'Grace Mwangi', email: 'grace.mwangi@email.co.tz', phone: '+255745000006', idType: 'national_id', idNumber: '19880303-00003-00', nationality: 'Tanzanian' },
    { fullName: 'David Kimaro', email: 'david.kimaro@email.co.tz', phone: '+255745000007', idType: 'national_id', idNumber: '19920404-00004-00', nationality: 'Tanzanian' },
    { fullName: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+255745000008', idType: 'passport', idNumber: 'US55443322', nationality: 'American' },
    { fullName: 'Emily Chen', email: 'emily.chen@email.cn', phone: '+255745000009', idType: 'passport', idNumber: 'CN66554433', nationality: 'Chinese' },
    { fullName: 'Michael Brown', email: 'm.brown@email.au', phone: '+255745000010', idType: 'passport', idNumber: 'AU77665544', nationality: 'Australian' },
    { fullName: 'Fatima Omar', email: 'fatima.omar@email.co.tz', phone: '+255745000011', idType: 'national_id', idNumber: '19950505-00005-00', nationality: 'Tanzanian' },
    { fullName: 'James Wilson', email: 'james.wilson@email.uk', phone: '+255745000012', idType: 'passport', idNumber: 'UK88776655', nationality: 'British' },
    { fullName: 'Lucy Anderson', email: 'lucy.a@email.ca', phone: '+255745000013', idType: 'passport', idNumber: 'CA99887766', nationality: 'Canadian' },
    { fullName: 'Robert Taylor', email: 'robert.taylor@email.us', phone: '+255745000014', idType: 'passport', idNumber: 'US11223344', nationality: 'American' },
    { fullName: 'Halima Rajab', email: 'halima.rajab@email.co.tz', phone: '+255745000015', idType: 'national_id', idNumber: '19960606-00006-00', nationality: 'Tanzanian' },
    { fullName: 'Carlos Mendez', email: 'carlos.m@email.es', phone: '+255745000016', idType: 'passport', idNumber: 'ES22334455', nationality: 'Spanish' },
    { fullName: 'Yuki Tanaka', email: 'yuki.tanaka@email.jp', phone: '+255745000017', idType: 'passport', idNumber: 'JP33445566', nationality: 'Japanese' },
    { fullName: 'Ibrahim Musa', email: 'ibrahim.musa@email.co.tz', phone: '+255745000018', idType: 'national_id', idNumber: '19970707-00007-00', nationality: 'Tanzanian' },
  ]

  const created = []
  for (const g of guestsData) {
    const guest = await prisma.guest.create({ data: g as any })
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
  ]

  const created = []
  for (const c of companiesData) {
    const company = await prisma.company.create({ data: { ...c, hotelId, isActive: true } })
    created.push(company)
  }
  console.log(`✅ ${created.length} companies created`)
  return created
}

async function seedHousekeepingLogs(userId: string, rooms: any[]) {
  const statuses = ['clean', 'dirty', 'cleaning', 'inspected'] as HousekeepingStatus[]
  const notes = ['Ready for guest', 'Checkout cleanup needed', 'In progress', 'Inspected and ready', 'Deep cleaning requested']

  for (const room of rooms) {
    // 2-3 logs per room
    const count = randomInt(2, 3)
    for (let i = 0; i < count; i++) {
      await prisma.housekeepingLog.create({
        data: {
          roomId: room.id,
          updatedById: userId,
          status: pickOne(statuses),
          notes: pickOne(notes),
          updatedAt: addDays(new Date(), -randomInt(0, 7)),
        }
      })
    }
  }
  console.log(`✅ Housekeeping logs created`)
}

interface BookingSeedContext {
  hotelId: string
  adminId: string
  receptionistId: string
  rooms: any[]
  addons: any[]
  storeItems: any[]
  guests: any[]
  companies: any[]
}

async function seedBookingsAndRelated(ctx: BookingSeedContext) {
  const today = startOfDay(new Date())
  const sellableItems = ctx.storeItems.filter(i => i.isSellable)

  // Booking configs: status, relative checkIn, relative checkOut, count, paid?, roomCharges?
  const configs: Array<{ status: BookingStatus; checkInOffset: number; checkOutOffset: number; count: number; paid: boolean; roomCharges: boolean; source: BookingSource; types: BookingType[] }> = [
    { status: 'pending', checkInOffset: 3, checkOutOffset: 5, count: 4, paid: false, roomCharges: false, source: 'online_self', types: ['individual'] },
    { status: 'confirmed', checkInOffset: 1, checkOutOffset: 4, count: 4, paid: false, roomCharges: false, source: 'staff_entry', types: ['individual', 'company'] },
    { status: 'checked_in', checkInOffset: -2, checkOutOffset: 2, count: 5, paid: false, roomCharges: true, source: 'walk_in', types: ['individual', 'company'] },
    { status: 'checked_out', checkInOffset: -5, checkOutOffset: -3, count: 6, paid: true, roomCharges: true, source: 'staff_entry', types: ['individual', 'company'] },
    { status: 'checked_out', checkInOffset: -10, checkOutOffset: -8, count: 4, paid: true, roomCharges: true, source: 'online_self', types: ['individual'] },
    { status: 'cancelled', checkInOffset: 7, checkOutOffset: 9, count: 2, paid: false, roomCharges: false, source: 'online_self', types: ['individual'] },
    { status: 'no_show', checkInOffset: -1, checkOutOffset: 1, count: 2, paid: false, roomCharges: false, source: 'online_self', types: ['individual'] },
    { status: 'late_checkout', checkInOffset: -3, checkOutOffset: 0, count: 1, paid: false, roomCharges: true, source: 'walk_in', types: ['individual'] },
  ]

  let bookingCount = 0
  for (const cfg of configs) {
    for (let i = 0; i < cfg.count; i++) {
      const bookingType = pickOne(cfg.types)
      const isCompany = bookingType === 'company'
      const company = isCompany ? pickOne(ctx.companies) : null
      const guest = isCompany ? pickOne(ctx.guests) : ctx.guests[(bookingCount + i) % ctx.guests.length]
      const room = ctx.rooms[(bookingCount + i) % ctx.rooms.length]
      const checkIn = addDays(today, cfg.checkInOffset)
      const checkOut = addDays(today, cfg.checkOutOffset)
      const nights = calculateNights(checkIn, checkOut)
      const roomTotal = Number(room.pricePerNight) * nights
      const addonTotal = 0
      const totalAmount = roomTotal + addonTotal

      const booking = await prisma.booking.create({
        data: {
          bookingRef: await generateBookingRef(),
          hotelId: ctx.hotelId,
          guestId: guest.id,
          companyId: company?.id || null,
          roomId: room.id,
          createdById: ctx.receptionistId,
          source: cfg.source,
          status: cfg.status,
          bookingType,
          checkIn,
          checkOut,
          actualCheckIn: cfg.status === 'checked_in' || cfg.status === 'checked_out' || cfg.status === 'late_checkout' ? addHours(checkIn, 14 + randomInt(0, 4)) : null,
          actualCheckOut: cfg.status === 'checked_out' ? addHours(checkOut, 11 + randomInt(0, 3)) : null,
          adults: randomInt(1, Math.min(2, room.capacity)),
          children: room.capacity > 2 ? randomInt(0, 1) : 0,
          roomTotal,
          addonsTotal: addonTotal,
          totalAmount,
          paidAmount: cfg.paid ? totalAmount : 0,
          balanceDue: cfg.paid ? 0 : totalAmount,
          specialRequests: pickOne(['Ground floor please', 'Extra pillow', 'Airport transfer', 'Quiet room', null]),
          internalNotes: pickOne(['Repeat guest', 'VIP', 'Late arrival expected', null]),
        }
      })

      // Booking guests (primary + optional child)
      const bookingGuests = [
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
        }
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

      // Update room status based on booking status
      if (cfg.status === 'checked_in' || cfg.status === 'late_checkout') {
        await prisma.room.update({ where: { id: room.id }, data: { status: 'occupied' } })
      } else if (cfg.status === 'checked_out') {
        await prisma.room.update({ where: { id: room.id }, data: { status: 'dirty' } })
      }

      // Addons for some bookings
      if (cfg.status !== 'pending' && cfg.status !== 'cancelled' && cfg.status !== 'no_show' && Math.random() > 0.5) {
        const addon = pickOne(ctx.addons)
        const qty = randomInt(1, 2)
        await prisma.bookingAddon.create({
          data: {
            bookingId: booking.id,
            addonId: addon.id,
            quantity: qty,
            unitPrice: addon.price,
            subtotal: Number(addon.price) * qty,
          }
        })
      }

      // Room charges for checked-in/out bookings
      if (cfg.roomCharges && sellableItems.length > 0) {
        const chargeCount = randomInt(1, 3)
        for (let c = 0; c < chargeCount; c++) {
          const item = pickOne(sellableItems)
          const qty = randomInt(1, 3)
          const unitPrice = item.sellingPrice
          const totalPrice = unitPrice * qty
          await prisma.roomCharge.create({
            data: {
              bookingId: booking.id,
              totalAmount: totalPrice,
              status: cfg.paid ? 'SETTLED' : 'OPEN',
              notes: pickOne(['Bar charge', 'Restaurant charge', 'Minibar', 'Room service']),
              postedById: ctx.receptionistId,
              settledAt: cfg.paid ? addHours(checkOut, 12) : null,
              items: {
                create: {
                  itemId: item.id,
                  itemName: item.name,
                  quantity: qty,
                  unitPrice,
                  totalPrice,
                }
              }
            }
          })
          // Update booking totals
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              totalAmount: { increment: totalPrice },
              balanceDue: { increment: cfg.paid ? 0 : totalPrice },
              paidAmount: { increment: cfg.paid ? totalPrice : 0 },
            }
          })
        }
      }

      // Payments for paid bookings
      if (cfg.paid) {
        const methods: PaymentMethod[] = ['cash', 'mpesa', 'bank_transfer', 'visa']
        const finalTotal = (await prisma.booking.findUnique({ where: { id: booking.id } }))!.totalAmount
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            receivedById: ctx.receptionistId,
            amount: finalTotal,
            method: pickOne(methods),
            status: 'completed',
            paidAt: addHours(checkOut, 12),
            notes: 'Full payment received',
          }
        })

        // Invoice record
        const invoice = await prisma.invoice.create({
          data: {
            hotelId: ctx.hotelId,
            invoiceNumber: await generateInvoiceNumber(),
            type: isCompany ? 'company' : 'individual',
            status: 'paid',
            bookingId: booking.id,
            companyId: company?.id || null,
            amount: finalTotal,
            totalAmount: finalTotal,
            paidAmount: finalTotal,
            notes: `Invoice generated on check-out for ${booking.bookingRef}`,
            paidAt: addHours(checkOut, 12),
          }
        })

        // Notification
        await prisma.notification.create({
          data: {
            bookingId: booking.id,
            type: 'payment_receipt',
            channel: 'email',
            recipient: company?.email || guest.email || guest.phone,
            subject: `Payment received for ${booking.bookingRef}`,
            body: `Thank you for your payment. Invoice ${invoice.invoiceNumber} is attached.`,
            status: 'pending',
          }
        })
      }

      // Reviews for checked-out guests
      if (cfg.status === 'checked_out' && Math.random() > 0.6) {
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            guestId: guest.id,
            rating: randomInt(3, 5),
            comment: pickOne(['Great stay!', 'Friendly staff', 'Clean rooms', 'Good breakfast', 'Would recommend']),
            isApproved: true,
            isPublished: true,
          }
        })
      }

      bookingCount++
    }
  }

  console.log(`✅ ${bookingCount} bookings created with guests, charges, payments & invoices`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
