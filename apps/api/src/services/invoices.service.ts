import { PrismaClient, InvoiceType, InvoiceStatus, Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'
import { generateInvoiceNumber } from '../utils/generateRef'

const prisma = new PrismaClient()

export class InvoicesService {
  async createInvoice(hotelId: string, data: {
    type: InvoiceType
    bookingId?: string
    companyId?: string
    amount: number
    taxAmount?: number
    totalAmount: number
    dueDate?: Date
    notes?: string
  }) {
    if (data.type === 'individual' && !data.bookingId) {
      throw ApiError.badRequest('Invoice ya individual inahitaji bookingId')
    }
    if (data.type === 'company' && !data.companyId) {
      throw ApiError.badRequest('Invoice ya company inahitaji companyId')
    }

    const invoiceNumber = await generateInvoiceNumber()

    return prisma.invoice.create({
      data: {
        hotelId,
        invoiceNumber,
        type: data.type,
        bookingId: data.bookingId || null,
        companyId: data.companyId || null,
        amount: data.amount,
        taxAmount: data.taxAmount || 0,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        dueDate: data.dueDate || null,
        notes: data.notes
      },
      include: {
        booking: { select: { bookingRef: true, guest: { select: { fullName: true } } } },
        company: { select: { name: true } }
      }
    })
  }

  async getInvoices(hotelId: string, filters?: {
    type?: InvoiceType
    status?: InvoiceStatus
    search?: string
    page?: number
    limit?: number
  }) {
    const { type, status, search, page = 1, limit = 20 } = filters || {}
    const skip = (page - 1) * limit

    const where: Prisma.InvoiceWhereInput = {
      hotelId,
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { company: { name: { contains: search, mode: 'insensitive' } } },
          { booking: { guest: { fullName: { contains: search, mode: 'insensitive' } } } },
          { booking: { bookingRef: { contains: search, mode: 'insensitive' } } }
        ]
      })
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          booking: { select: { bookingRef: true, guest: { select: { fullName: true } } } },
          company: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.invoice.count({ where })
    ])

    return {
      invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  }

  async getInvoice(id: string, hotelId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, hotelId },
      include: {
        hotel: true,
        booking: {
          include: {
            guest: true,
            room: true,
            payments: true,
            roomCharges: { include: { items: true } }
          }
        },
        company: {
          select: { id: true, name: true, address: true, phone: true, email: true, tinNumber: true }
        },
        invoiceBookings: {
          include: {
            booking: {
              include: {
                guest: { select: { fullName: true } },
                room: { select: { roomNumber: true, type: true } },
                roomCharges: { include: { items: true } }
              }
            }
          }
        }
      }
    })
    if (!invoice) throw ApiError.notFound('Invoice haikupatikana')
    return invoice
  }

  async updateInvoice(id: string, hotelId: string, data: Partial<{
    status: InvoiceStatus
    amount: number
    taxAmount: number
    totalAmount: number
    paidAmount: number
    dueDate: Date
    notes: string
    pdfUrl: string
    sentAt: Date
    paidAt: Date
  }>) {
    const invoice = await prisma.invoice.findFirst({ where: { id, hotelId } })
    if (!invoice) throw ApiError.notFound('Invoice haikupatikana')

    return prisma.invoice.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        booking: { select: { bookingRef: true, guest: { select: { fullName: true } } } },
        company: { select: { name: true } }
      }
    })
  }

  async deleteInvoice(id: string, hotelId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id, hotelId } })
    if (!invoice) throw ApiError.notFound('Invoice haikupatikana')

    return prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled', updatedAt: new Date() }
    })
  }

  async recordPayment(id: string, hotelId: string, amount: number) {
    const invoice = await prisma.invoice.findFirst({ where: { id, hotelId } })
    if (!invoice) throw ApiError.notFound('Invoice haikupatikana')
    if (invoice.status === 'cancelled') throw ApiError.badRequest('Invoice hii imefutwa')

    const newPaid = Number(invoice.paidAmount) + amount
    const status: InvoiceStatus = newPaid >= Number(invoice.totalAmount) ? 'paid' : 'sent'

    return prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        status,
        paidAt: status === 'paid' ? new Date() : invoice.paidAt
      },
      include: {
        booking: { select: { bookingRef: true, guest: { select: { fullName: true } } } },
        company: { select: { name: true } }
      }
    })
  }

  async generateCompanyInvoice(hotelId: string, companyId: string, bookingIds: string[], notes?: string) {
    const company = await prisma.company.findFirst({ where: { id: companyId, hotelId, isActive: true } })
    if (!company) throw ApiError.notFound('Kampuni haikupatikana')

    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds }, hotelId, companyId, status: { not: 'cancelled' } },
      include: { guest: true, room: true, roomCharges: { include: { items: true } } }
    })

    if (bookings.length === 0) throw ApiError.badRequest('Hakuna booking sahihi za kampuni hii')

    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)
    const paidAmount = bookings.reduce((sum, b) => sum + Number(b.paidAmount), 0)
    const amount = totalAmount - paidAmount

    const invoiceNumber = await generateInvoiceNumber()

    return prisma.invoice.create({
      data: {
        hotelId,
        invoiceNumber,
        type: 'company',
        companyId,
        amount,
        totalAmount,
        paidAmount,
        notes: notes || `Company invoice for ${bookings.length} booking(s)`,
        status: paidAmount >= totalAmount ? 'paid' : 'draft',
        invoiceBookings: {
          create: bookings.map(b => ({ bookingId: b.id }))
        }
      },
      include: {
        company: { select: { id: true, name: true, address: true, phone: true, email: true, tinNumber: true } },
        invoiceBookings: {
          include: {
            booking: {
              include: {
                guest: { select: { fullName: true } },
                room: { select: { roomNumber: true, type: true } },
                roomCharges: { include: { items: true } }
              }
            }
          }
        }
      }
    })
  }
}

/**
 * Sync invoice(s) linked to a booking whenever the booking's payment/balance changes.
 * Should be called inside the same Prisma transaction that updated the booking.
 */
export async function syncInvoicesForBooking(
  tx: Prisma.TransactionClient,
  booking: { id: string; totalAmount: number | Prisma.Decimal; paidAmount: number | Prisma.Decimal }
) {
  const totalAmount = Number(booking.totalAmount)
  const paidAmount = Number(booking.paidAmount)
  const balanceDue = totalAmount - paidAmount
  const status: any = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'sent' : 'draft'

  // Individual invoices linked directly to the booking
  await tx.invoice.updateMany({
    where: { bookingId: booking.id, type: 'individual' },
    data: {
      totalAmount,
      paidAmount,
      amount: balanceDue,
      status,
      paidAt: status === 'paid' ? new Date() : null,
      updatedAt: new Date()
    }
  })

  // Company invoices linked via InvoiceBooking
  const companyInvoices = await tx.invoice.findMany({
    where: {
      type: 'company',
      invoiceBookings: { some: { bookingId: booking.id } }
    },
    include: { invoiceBookings: { include: { booking: true } } }
  })

  for (const invoice of companyInvoices) {
    const linkedBookings = invoice.invoiceBookings.map(ib => ib.booking)
    const invTotal = linkedBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)
    const invPaid = linkedBookings.reduce((sum, b) => sum + Number(b.paidAmount), 0)
    const invBalance = invTotal - invPaid
    const invStatus: any = invPaid >= invTotal ? 'paid' : invPaid > 0 ? 'sent' : 'draft'

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: invTotal,
        paidAmount: invPaid,
        amount: invBalance,
        status: invStatus,
        paidAt: invStatus === 'paid' ? new Date() : invoice.paidAt,
        updatedAt: new Date()
      }
    })
  }
}

export const invoicesService = new InvoicesService()
