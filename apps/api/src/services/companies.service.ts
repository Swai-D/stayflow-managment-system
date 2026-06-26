import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class CompaniesService {
  async createCompany(hotelId: string, data: {
    name: string
    email?: string
    phone?: string
    address?: string
    tinNumber?: string
    contactPerson?: string
    notes?: string
  }) {
    const existing = await prisma.company.findFirst({
      where: { hotelId, name: { equals: data.name, mode: 'insensitive' }, isActive: true }
    })
    if (existing) {
      throw ApiError.conflict('Kampuni yenye jina hili tayari ipo')
    }

    return prisma.company.create({
      data: { ...data, hotelId }
    })
  }

  async getCompanies(hotelId: string, search?: string) {
    return prisma.company.findMany({
      where: {
        hotelId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { name: 'asc' }
    })
  }

  async getCompany(id: string, hotelId: string) {
    const company = await prisma.company.findFirst({
      where: { id, hotelId, isActive: true },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            guest: { select: { id: true, fullName: true, phone: true, email: true } },
            room: { select: { id: true, roomNumber: true, type: true } },
            payments: { select: { id: true, amount: true, status: true, method: true } }
          }
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            type: true,
            status: true,
            amount: true,
            totalAmount: true,
            paidAmount: true,
            createdAt: true
          }
        },
        _count: { select: { bookings: true } }
      }
    })
    if (!company) throw ApiError.notFound('Kampuni haikupatikana')
    return company
  }

  async updateCompany(id: string, hotelId: string, data: Partial<{
    name: string
    email: string
    phone: string
    address: string
    tinNumber: string
    contactPerson: string
    notes: string
    isActive: boolean
  }>) {
    const company = await prisma.company.findFirst({ where: { id, hotelId } })
    if (!company) throw ApiError.notFound('Kampuni haikupatikana')

    if (data.name && data.name !== company.name) {
      const existing = await prisma.company.findFirst({
        where: { hotelId, name: { equals: data.name, mode: 'insensitive' }, isActive: true, id: { not: id } }
      })
      if (existing) throw ApiError.conflict('Kampuni yenye jina hili tayari ipo')
    }

    return prisma.company.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    })
  }

  async deleteCompany(id: string, hotelId: string) {
    const company = await prisma.company.findFirst({ where: { id, hotelId } })
    if (!company) throw ApiError.notFound('Kampuni haikupatikana')

    return prisma.company.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() }
    })
  }
}

export const companiesService = new CompaniesService()
