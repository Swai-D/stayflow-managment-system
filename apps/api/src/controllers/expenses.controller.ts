import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { expensesService } from '../services/expenses.service'
import { AuthRequest } from '../middleware/authenticate'

export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await expensesService.createExpense({
    ...req.body,
    hotelId: req.user!.hotelId,
    userId: req.user!.id,
    date: req.body.date ? new Date(req.body.date) : undefined
  })
  res.status(201).json(new ApiResponse(expense, 'Gharama imerekodiwa'))
})

export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category, search, dateFrom, dateTo, page, limit } = req.query
  const result = await expensesService.getExpenses(req.user!.hotelId, {
    category: category as any,
    search: search as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20
  })
  res.json(new ApiResponse(result.expenses, 'OK', result.meta))
})

export const getExpenseStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query
  const stats = await expensesService.getExpenseStats(
    req.user!.hotelId,
    month ? Number(month) : undefined,
    year ? Number(year) : undefined
  )
  res.json(new ApiResponse(stats))
})
