import { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { rolesService } from '../services/roles.service'
import { AuthRequest } from '../middleware/authenticate'

export const getRoles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const roles = await rolesService.getRoles(req.user!.hotelId)
  res.json(new ApiResponse(roles))
})

export const getRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const role = await rolesService.getRoleById(req.user!.hotelId, req.params.id)
  res.json(new ApiResponse(role))
})

export const createRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const role = await rolesService.createRole(req.user!.hotelId, req.body)
  res.status(201).json(new ApiResponse(role, 'Jukumu limeundwa'))
})

export const updateRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const role = await rolesService.updateRole(req.user!.hotelId, req.params.id, req.body)
  res.json(new ApiResponse(role, 'Jukumu limesasishwa'))
})

export const deleteRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  await rolesService.deleteRole(req.user!.hotelId, req.params.id)
  res.json(new ApiResponse(null, 'Jukumu limefutwa'))
})
