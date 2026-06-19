import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiResponse } from '../utils/ApiResponse'
import { authService } from '../services/auth.service'
import { AuthRequest } from '../middleware/authenticate'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth'
}

// POST /auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body
  const result = await authService.login(email, password)

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)

  res.status(200).json(new ApiResponse({
    accessToken: result.accessToken,
    user: result.user
  }, 'Umeingia mfumoni'))
})

// POST /auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken
  const result = await authService.refreshToken(token)

  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)

  res.status(200).json(new ApiResponse({
    accessToken: result.accessToken
  }, 'Token imesasishwa'))
})

// POST /auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' })
  res.status(200).json(new ApiResponse(null, 'Umetoka mfumoni'))
})

// GET /auth/me
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.user!.id)
  res.status(200).json(new ApiResponse(user))
})

// PATCH /auth/me
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body)
  res.status(200).json(new ApiResponse(user, 'Wasifu umesasishwa'))
})
