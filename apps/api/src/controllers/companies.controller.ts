import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { companiesService } from '../services/companies.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const createCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const company = await companiesService.createCompany(hotelId, req.body)
  res.status(201).json(new ApiResponse(company, 'Kampuni imesajiliwa'))
})

export const getCompanies = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { search } = req.query
  const companies = await companiesService.getCompanies(hotelId, search as string)
  res.json(new ApiResponse(companies))
})

export const getCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const company = await companiesService.getCompany(req.params.id, hotelId)
  res.json(new ApiResponse(company))
})

export const updateCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const company = await companiesService.updateCompany(req.params.id, hotelId, req.body)
  res.json(new ApiResponse(company, 'Kampuni imesasishwa'))
})

export const deleteCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  await companiesService.deleteCompany(req.params.id, hotelId)
  res.json(new ApiResponse(null, 'Kampuni imefutwa'))
})
