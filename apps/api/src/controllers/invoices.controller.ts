import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { invoicesService } from '../services/invoices.service'
import { pdfService } from '../services/pdf.service'
import { AuthRequest } from '../middleware/authenticate'
import { getSystemHotelId } from '../utils/systemHotel'

export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const invoice = await invoicesService.createInvoice(hotelId, {
    ...req.body,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
  })
  res.status(201).json(new ApiResponse(invoice, 'Invoice imeundwa'))
})

export const getInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { type, status, search, page, limit } = req.query
  const result = await invoicesService.getInvoices(hotelId, {
    type: type as any,
    status: status as any,
    search: search as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20
  })
  res.json(new ApiResponse(result.invoices, 'OK', result.meta))
})

export const getInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const invoice = await invoicesService.getInvoice(req.params.id, hotelId)
  res.json(new ApiResponse(invoice))
})

export const updateInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const data: any = { ...req.body }
  if (req.body.dueDate) data.dueDate = new Date(req.body.dueDate)
  if (req.body.sentAt) data.sentAt = new Date(req.body.sentAt)
  if (req.body.paidAt) data.paidAt = new Date(req.body.paidAt)

  const invoice = await invoicesService.updateInvoice(req.params.id, hotelId, data)
  res.json(new ApiResponse(invoice, 'Invoice imesasishwa'))
})

export const deleteInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  await invoicesService.deleteInvoice(req.params.id, hotelId)
  res.json(new ApiResponse(null, 'Invoice imefutwa'))
})

export const recordInvoicePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { amount } = req.body
  const invoice = await invoicesService.recordPayment(req.params.id, hotelId, amount)
  res.json(new ApiResponse(invoice, 'Malipo ya invoice yamerekodiwa'))
})

export const generateCompanyInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const { companyId, bookingIds, notes } = req.body
  const invoice = await invoicesService.generateCompanyInvoice(hotelId, companyId, bookingIds, notes)
  res.status(201).json(new ApiResponse(invoice, 'Invoice ya kampuni imeundwa'))
})

export const getInvoicePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const hotelId = await getSystemHotelId()
  const invoice = await invoicesService.getInvoice(req.params.id, hotelId)

  let pdfBuffer: Buffer
  if (invoice.type === 'company') {
    pdfBuffer = await pdfService.generateCompanyInvoicePdf(invoice)
  } else if (invoice.bookingId) {
    pdfBuffer = await pdfService.generateInvoice(invoice.bookingId)
  } else {
    throw ApiError.badRequest('Invoice hii haina taarifa za kutosha kutengeneza PDF')
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`)
  res.send(pdfBuffer)
})
