import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.service'
import { ApiError } from '../utils/ApiError'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn()
  }
}))

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  }
}))

const authService = new AuthService()

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      process.env.JWT_ACCESS_SECRET = 'test_secret_32_chars_minimum_ok'
      const token = authService.generateAccessToken({
        id: '123', role: 'admin', hotelId: 'hotel-1', email: 'test@test.com'
      })
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('login', () => {
    it('should throw unauthorized if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.login('notfound@test.com', 'password'))
        .rejects.toThrow('Email au nywila si sahihi')
    })

    it('should throw unauthorized if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', isActive: false, passwordHash: 'hash',
        roleId: 'role-1', role: { id: 'role-1', name: 'admin', permissions: [] }
      })

      await expect(authService.login('test@test.com', 'password'))
        .rejects.toThrow('Akaunti yako imezimwa')
    })

    it('should throw unauthorized if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', isActive: true, passwordHash: 'hash',
        roleId: 'role-1', role: { id: 'role-1', name: 'admin', permissions: [] }
      })

      const bcrypt = await import('bcryptjs')
      ;(bcrypt.default.compare as any).mockResolvedValue(false)

      await expect(authService.login('test@test.com', 'wrongpassword'))
        .rejects.toThrow('Email au nywila si sahihi')
    })
  })

})
