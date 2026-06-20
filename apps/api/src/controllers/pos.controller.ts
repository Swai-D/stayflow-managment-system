import { Response } from 'express'
import { posService } from '../services/pos.service'
import { pdfService } from '../services/pdf.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const getSellableItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const items = await posService.getSellableItems(hotelId)
  res.json(new ApiResponse(items))
})

export const getActiveBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const bookings = await posService.getActiveBookings(hotelId)
  res.json(new ApiResponse(bookings))
})

export const postCharge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const charge = await posService.postCharge(hotelId, req.user!.id, req.body)
  res.status(201).json(new ApiResponse(charge))
})

export const getFolio = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const folio = await posService.getFolio(req.params.bookingId, hotelId)
  res.json(new ApiResponse(folio))
})

export const voidCharge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const result = await posService.voidCharge(req.params.chargeId, hotelId, req.user!.id)
  res.json(new ApiResponse(result))
})

export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const invoice = await posService.getInvoiceData(req.params.bookingId, hotelId)
  res.json(new ApiResponse(invoice))
})

export const sendInvoiceEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const result = await posService.sendInvoiceEmail(req.params.bookingId, hotelId)
  res.json(new ApiResponse(result, 'Invoice imetumwa kwa email'))
})

export const getInvoicePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { bookingId } = req.params
  const pdfBuffer = await pdfService.generateInvoice(bookingId)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=INV-${bookingId}.pdf`)
  res.send(pdfBuffer)
})

export const checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const result = await posService.checkout(req.params.bookingId, hotelId)
  res.json(new ApiResponse(result))
})