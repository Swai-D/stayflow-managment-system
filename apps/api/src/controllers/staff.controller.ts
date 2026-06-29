import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { staffService } from '../services/staff.service'
import { AuthRequest } from '../middleware/authenticate'

export const getStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const staff = await staffService.getStaff(req.user!.hotelId)
  res.json(new ApiResponse(staff))
})

export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await staffService.createStaff(req.user!.hotelId, req.body)
  res.status(201).json(new ApiResponse(result, 'Mfanyakazi ameongezwa'))
})

export const updateStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await staffService.updateStaff(req.params.id, req.user!.hotelId, req.body)
  res.json(new ApiResponse(result, 'Taarifa za mfanyakazi zimesasishwa'))
})

export const deactivateStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  await staffService.deactivateStaff(req.params.id, req.user!.hotelId)
  res.json(new ApiResponse(null, 'Mfanyakazi amezimwa'))
})

export const clockIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const shift = await staffService.clockIn(req.user!.id, req.user!.hotelId)
  res.status(201).json(new ApiResponse(shift, 'Umeingia kazini'))
})

export const clockOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  const shift = await staffService.clockOut(req.user!.id, req.user!.hotelId)
  res.json(new ApiResponse(shift, 'Umetoka kazini'))
})

export const getShifts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { staffId, month, year } = req.query
  const shifts = await staffService.getShifts(
    req.user!.hotelId,
    staffId as string | undefined,
    month ? Number(month) : undefined,
    year ? Number(year) : undefined
  )
  res.json(new ApiResponse(shifts))
})

export const requestLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const leave = await staffService.requestLeave(req.user!.id, req.user!.hotelId, req.body)
  res.status(201).json(new ApiResponse(leave, 'Ombi la likizo limetumwa'))
})

export const reviewLeave = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { action, note } = req.body
  const leave = await staffService.reviewLeave(
    req.params.id, req.user!.hotelId, action, req.user!.id, note
  )
  res.json(new ApiResponse(leave, action === 'approved' ? 'Likizo imeidhinishwa' : 'Likizo imekataliwa'))
})

export const getLeaves = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, staffId } = req.query
  const leaves = await staffService.getLeaves(
    req.user!.hotelId,
    status as string | undefined,
    staffId as string | undefined
  )
  res.json(new ApiResponse(leaves))
})

export const generatePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { staffId, month, year } = req.body
  const record = await staffService.generatePayroll(staffId, req.user!.hotelId, month, year)
  res.status(201).json(new ApiResponse(record, 'Payroll imetengenezwa'))
})

export const getPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query
  const records = await staffService.getPayrollRecords(
    req.user!.hotelId,
    month ? Number(month) : undefined,
    year ? Number(year) : undefined,
  )
  res.json(new ApiResponse(records))
})

export const approvePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await staffService.approvePayroll(req.params.id, req.user!.hotelId, req.user!.id)
  res.json(new ApiResponse(record, 'Payroll imeidhinishwa'))
})

export const markPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await staffService.markPayrollPaid(req.params.id, req.user!.hotelId, req.user!.id)
  res.json(new ApiResponse(record, 'Mishahara imelipwa'))
})

export const getPayrollSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query
  const summary = await staffService.getPayrollSummary(
    req.user!.hotelId,
    Number(month) || new Date().getMonth() + 1,
    Number(year) || new Date().getFullYear(),
  )
  res.json(new ApiResponse(summary))
})
