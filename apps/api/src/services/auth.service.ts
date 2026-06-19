import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

interface TokenPayload {
  id: string
  role: string
  hotelId: string
  email: string
}

export class AuthService {

  // ─── Generate Tokens ───────────────────────────────

  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_ACCESS_EXPIRY as any) || '15m'
    }
    return jwt.sign(payload as object, process.env.JWT_ACCESS_SECRET!, options)
  }

  generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRY as any) || '7d'
    }
    return jwt.sign(payload as object, process.env.JWT_REFRESH_SECRET!, options)
  }

  // ─── Login ──────────────────────────────────────────

  async login(email: string, password: string) {
    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { hotel: { select: { id: true, name: true, logoUrl: true } } }
    })

    if (!user) throw ApiError.unauthorized('Email au nywila si sahihi')
    if (!user.isActive) throw ApiError.unauthorized('Akaunti yako imezimwa. Wasiliana na admin')

    // 2. Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw ApiError.unauthorized('Email au nywila si sahihi')

    // 3. Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 4. Generate tokens
    const payload: TokenPayload = {
      id: user.id,
      role: user.role,
      hotelId: user.hotelId,
      email: user.email
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(payload)

    // 5. Return user data (no sensitive fields)
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        hotel: user.hotel
      }
    }
  }

  // ─── Refresh Token ──────────────────────────────────

  async refreshToken(token: string) {
    if (!token) throw ApiError.unauthorized('Refresh token haipo')

    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, hotelId: true, email: true, isActive: true }
      })

      if (!user || !user.isActive) throw ApiError.unauthorized()

      const payload: TokenPayload = {
        id: user.id,
        role: user.role,
        hotelId: user.hotelId,
        email: user.email
      }

      const accessToken = this.generateAccessToken(payload)
      const newRefreshToken = this.generateRefreshToken(payload)

      return { accessToken, refreshToken: newRefreshToken }
    } catch {
      throw ApiError.unauthorized('Session imekwisha — tafadhali ingia tena')
    }
  }

  // ─── Update Current User Profile ─────────────────────
  // Self-service: user can update own basic info, NOT role
  async updateProfile(userId: string, data: {
    fullName?: string
    email?: string
    phone?: string
    avatarUrl?: string
    currentPassword?: string
    newPassword?: string
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')

    // If changing password, verify current password
    if (data.newPassword) {
      if (!data.currentPassword) {
        throw ApiError.badRequest('Nywila ya sasa inahitajika kubadili nywila')
      }
      const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash)
      if (!isValid) throw ApiError.badRequest('Nywila ya sasa sio sahihi')
    }

    // Check email uniqueness if changed
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } })
      if (existing) throw ApiError.conflict('Email hii tayari inatumika')
    }

    const updateData: any = {
      fullName: data.fullName,
      email: data.email ? data.email.toLowerCase().trim() : undefined,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      updatedAt: new Date()
    }

    if (data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 12)
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key]
    })

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        lastLoginAt: true,
        hotel: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            checkInTime: true,
            checkOutTime: true,
            defaultLanguage: true
          }
        }
      }
    })
  }

  // ─── Get Current User ────────────────────────────────

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        lastLoginAt: true,
        hotel: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            checkInTime: true,
            checkOutTime: true,
            defaultLanguage: true
          }
        }
      }
    })

    if (!user) throw ApiError.notFound('Mtumiaji hakupatikana')
    return user
  }
}

export const authService = new AuthService()
