import { PrismaClient, ExpenseCategory } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export class ExpensesService {
  async createExpense(data: {
    hotelId: string
    userId: string
    amount: number
    category: ExpenseCategory
    description: string
    date?: Date
  }) {
    return prisma.expense.create({
      data: {
        ...data,
        date: data.date || new Date()
      }
    })
  }

  async getExpenses(hotelId: string, filters?: {
    category?: ExpenseCategory
    dateFrom?: Date
    dateTo?: Date
    search?: string
    page?: number
    limit?: number
  }) {
    const { category, dateFrom, dateTo, search, page = 1, limit = 20 } = filters || {}
    const skip = (page - 1) * limit

    const where = {
      hotelId,
      ...(category && { category }),
      ...(search && {
        description: { contains: search, mode: 'insensitive' as const }
      }),
      ...(dateFrom && dateTo && {
        date: { gte: dateFrom, lte: dateTo }
      })
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { fullName: true } } }
      }),
      prisma.expense.count({ where })
    ])

    return {
      expenses,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  }

  async getExpenseStats(hotelId: string, month?: number, year?: number) {
    const now = new Date()
    const m = month ?? now.getMonth() + 1
    const y = year ?? now.getFullYear()

    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 0)

    const total = await prisma.expense.aggregate({
      where: {
        hotelId,
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        hotelId,
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    return {
      total: total._sum.amount || 0,
      byCategory
    }
  }
}

export const expensesService = new ExpensesService()
