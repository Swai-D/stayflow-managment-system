import { Response } from 'express'
import { posService } from '../services/pos.service'
import { pdfService } from '../services/pdf.service'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { AuthRequest } from '../middleware/authenticate'

export const getSellableItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = await posService.getSellableItems(req.user!.hotelId)
  res.json(new ApiResponse(items))
})

export const getActiveBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const bookings = await posService.getActiveBookings(req.user!.hotelId)
  res.json(new ApiResponse(bookings))
})

export const postCharge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const charge = await posService.postCharge(req.user!.hotelId, req.user!.id, req.body)
  res.status(201).json(new ApiResponse(charge))
})

export const getFolio = asyncHandler(async (req: AuthRequest, res: Response) => {
  const folio = await posService.getFolio(req.params.bookingId, req.user!.hotelId)
  res.json(new ApiResponse(folio))
})

export const voidCharge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await posService.voidCharge(req.params.chargeId, req.user!.hotelId, req.user!.id)
  res.json(new ApiResponse(result))
})

export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await posService.getInvoiceData(req.params.bookingId, req.user!.hotelId)
  res.json(new ApiResponse(invoice))
})

export const getInvoicePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { bookingId } = req.params
  const pdfBuffer = await pdfService.generateInvoice(bookingId)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=INV-${bookingId}.pdf`)
  res.send(pdfBuffer)
})

export const checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await posService.checkout(req.params.bookingId, req.user!.hotelId)
  res.json(new ApiResponse(result))
})