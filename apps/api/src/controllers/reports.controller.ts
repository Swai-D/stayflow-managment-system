import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { reportsService } from '../services/reports.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const getCalendarReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined
  const hotelId = await getSystemHotelId()
  const data = await reportsService.getCalendarReport(hotelId, year)
  res.json(new ApiResponse(data))
})

export const getRevenueReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const hotelId = await getSystemHotelId()
  const data = await reportsService.getRevenueReport(hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})

export const getOccupancyReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const hotelId = await getSystemHotelId()
  const data = await reportsService.getOccupancyReport(hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})

export const getDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const data = await reportsService.getDashboardSummary(hotelId)
  res.json(new ApiResponse(data))
})

export const getFinancialReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days } = req.query
  const hotelId = await getSystemHotelId()
  const data = await reportsService.getFinancialReport(hotelId, days ? Number(days) : undefined)
  res.json(new ApiResponse(data))
})
