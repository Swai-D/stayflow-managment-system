import { Response } from 'express'
import { advisorService, AdvicePeriod } from '../services/advisor.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { AuthRequest } from '../middleware/authenticate'

const VALID_PERIODS: AdvicePeriod[] = ['DAILY', 'WEEKLY', 'MONTHLY']

function normalizePeriod(value: any): AdvicePeriod {
  const p = String(value || 'MONTHLY').toUpperCase()
  return VALID_PERIODS.includes(p as AdvicePeriod) ? (p as AdvicePeriod) : 'MONTHLY'
}

export const getBusinessAdvice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = normalizePeriod(req.query.period)
  const result = await advisorService.getBusinessAdvice(req.user!.hotelId, period)
  res.json(new ApiResponse(result))
})

export const refreshBusinessAdvice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = normalizePeriod(req.body?.period || req.query.period)
  const result = await advisorService.refreshBusinessAdvice(req.user!.hotelId, period)
  res.json(new ApiResponse(result))
})
