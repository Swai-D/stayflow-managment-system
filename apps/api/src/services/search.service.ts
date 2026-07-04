import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'booking' | 'guest' | 'room' | 'store_item' | 'supplier' | 'staff' | 'invoice' | 'payment' | 'expense' | 'company'
  href: string
  status?: string
  meta?: string
}

export class SearchService {
  async search(hotelId: string, query: string, limit: number = 12): Promise<SearchResult[]> {
    const q = query.trim()
    if (!q || q.length < 2) return []

    const searchPattern = q
    const perType = Math.ceil(limit / 3)

    const [
      bookings,
      guests,
      rooms,
      storeItems,
      suppliers,
      staff,
      invoices,
      payments,
      expenses,
      companies
    ] = await Promise.all([
      // Bookings by ref or guest name
      prisma.booking.findMany({
        where: {
          hotelId,
          OR: [
            { bookingRef: { contains: searchPattern, mode: 'insensitive' } },
            { guest: { fullName: { contains: searchPattern, mode: 'insensitive' } } },
            { guest: { phone: { contains: searchPattern, mode: 'insensitive' } } }
          ]
        },
        include: {
          guest: { select: { fullName: true } },
          room: { select: { roomNumber: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),

      // Guests by name, phone, email
      prisma.guest.findMany({
        where: {
          bookings: { some: { hotelId } },
          OR: [
            { fullName: { contains: searchPattern, mode: 'insensitive' } },
            { phone: { contains: searchPattern, mode: 'insensitive' } },
            { email: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { fullName: 'asc' },
        take: limit
      }),

      // Rooms by number or name
      prisma.room.findMany({
        where: {
          hotelId,
          isActive: true,
          OR: [
            { roomNumber: { contains: searchPattern, mode: 'insensitive' } },
            { name: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { roomNumber: 'asc' },
        take: limit
      }),

      // Store items by name, SKU, subcategory
      prisma.storeItem.findMany({
        where: {
          hotelId,
          isActive: true,
          OR: [
            { name: { contains: searchPattern, mode: 'insensitive' } },
            { sku: { contains: searchPattern, mode: 'insensitive' } },
            { subCategory: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' },
        take: limit
      }),

      // Suppliers by name, phone, email
      prisma.supplier.findMany({
        where: {
          hotelId,
          isActive: true,
          OR: [
            { name: { contains: searchPattern, mode: 'insensitive' } },
            { phone: { contains: searchPattern, mode: 'insensitive' } },
            { email: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' },
        take: perType
      }),

      // Staff by name, email, phone
      prisma.staff.findMany({
        where: {
          hotelId,
          OR: [
            { fullName: { contains: searchPattern, mode: 'insensitive' } },
            { email: { contains: searchPattern, mode: 'insensitive' } },
            { phone: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { fullName: 'asc' },
        take: perType
      }),

      // Invoices by number or guest name
      prisma.invoice.findMany({
        where: {
          hotelId,
          OR: [
            { invoiceNumber: { contains: searchPattern, mode: 'insensitive' } },
            { booking: { guest: { fullName: { contains: searchPattern, mode: 'insensitive' } } } },
            { company: { name: { contains: searchPattern, mode: 'insensitive' } } }
          ]
        },
        include: {
          booking: { select: { guest: { select: { fullName: true } } } },
          company: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: perType
      }),

      // Payments by reference or guest name
      prisma.payment.findMany({
        where: {
          hotelId,
          OR: [
            { reference: { contains: searchPattern, mode: 'insensitive' } },
            { booking: { guest: { fullName: { contains: searchPattern, mode: 'insensitive' } } } },
            { method: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        include: {
          booking: { select: { guest: { select: { fullName: true } }, bookingRef: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: perType
      }),

      // Expenses by description or category
      prisma.expense.findMany({
        where: {
          hotelId,
          OR: [
            { description: { contains: searchPattern, mode: 'insensitive' } },
            { category: { contains: searchPattern, mode: 'insensitive' } },
            { vendor: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { date: 'desc' },
        take: perType
      }),

      // Companies by name or TIN
      prisma.company.findMany({
        where: {
          hotelId,
          OR: [
            { name: { contains: searchPattern, mode: 'insensitive' } },
            { tinNumber: { contains: searchPattern, mode: 'insensitive' } },
            { email: { contains: searchPattern, mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' },
        take: perType
      })
    ])

    const results: SearchResult[] = [
      ...bookings.map(b => ({
        id: b.id,
        title: `${b.bookingRef}`,
        subtitle: b.guest.fullName,
        type: 'booking' as const,
        href: `/reservations`,
        status: b.status,
        meta: `Room ${b.room.roomNumber}`
      })),

      ...guests.map(g => ({
        id: g.id,
        title: g.fullName,
        subtitle: g.phone,
        type: 'guest' as const,
        href: `/guests`,
        meta: g.email || undefined
      })),

      ...rooms.map(r => ({
        id: r.id,
        title: `Room ${r.roomNumber}`,
        subtitle: r.name,
        type: 'room' as const,
        href: `/rooms`,
        status: r.status,
        meta: r.type
      })),

      ...storeItems.map(i => ({
        id: i.id,
        title: i.name,
        subtitle: i.subCategory,
        type: 'store_item' as const,
        href: `/store/items`,
        status: i.currentStock < i.minimumStock ? 'low_stock' : i.currentStock === 0 ? 'out_of_stock' : 'in_stock',
        meta: `${i.currentStock} ${i.unit}`
      })),

      ...suppliers.map(s => ({
        id: s.id,
        title: s.name,
        subtitle: s.phone,
        type: 'supplier' as const,
        href: `/store/suppliers`,
        meta: s.email || undefined
      })),

      ...staff.map(s => ({
        id: s.id,
        title: s.fullName,
        subtitle: s.position || s.department,
        type: 'staff' as const,
        href: `/staff`,
        meta: s.phone || s.email
      })),

      ...invoices.map(i => ({
        id: i.id,
        title: i.invoiceNumber,
        subtitle: i.booking?.guest?.fullName || i.company?.name,
        type: 'invoice' as const,
        href: `/invoices`,
        status: i.status,
        meta: `TZS ${Number(i.totalAmount).toLocaleString()}`
      })),

      ...payments.map(p => ({
        id: p.id,
        title: p.reference || `Payment for ${p.booking?.bookingRef}`,
        subtitle: p.booking?.guest?.fullName,
        type: 'payment' as const,
        href: `/payments`,
        status: p.status,
        meta: `${p.method} — TZS ${Number(p.amount).toLocaleString()}`
      })),

      ...expenses.map(e => ({
        id: e.id,
        title: e.description,
        subtitle: e.category,
        type: 'expense' as const,
        href: `/accounting/expenses`,
        meta: `TZS ${Number(e.amount).toLocaleString()}`
      })),

      ...companies.map(c => ({
        id: c.id,
        title: c.name,
        subtitle: c.tinNumber,
        type: 'company' as const,
        href: `/companies`,
        meta: c.email || c.phone
      }))
    ]

    return results.slice(0, limit)
  }
}

export const searchService = new SearchService()
