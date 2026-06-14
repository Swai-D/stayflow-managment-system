import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { reportsService } from '../services/reports.service'
import { AuthRequest } from '../middleware/authenticate'

export const getRevenueReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const data = await reportsService.getRevenueReport(req.user!.hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})

export const getOccupancyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const data = await reportsService.getOccupancyReport(req.user!.hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})

export const getDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await reportsService.getDashboardSummary(req.user!.hotelId)
  res.json(new ApiResponse(data))
})

export const getFinancialReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const data = await reportsService.getFinancialReport(req.user!.hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})
