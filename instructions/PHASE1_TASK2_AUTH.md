# ⚠️ DESIGN REFERENCE — READ BEFORE WRITING ANY UI CODE
> Design: YowStay Hotel Management Dashboard
> Link  : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Designer: https://dribbble.com/yowdesain
> Rules : White bg, Blue (#2563EB) only accent, Inter font, NO purple, NO gradients
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STAYFLOW — PHASE 1, TASK 2: AUTHENTICATION
> Tegemea: Task 1 imekamilika — DB ipo, seed imefanyika
> Matokeo ya Task hii: Login inafanya kazi, JWT tokens, protected routes, user session

---

## OVERVIEW — Unajenga Nini

```
1. Backend  : POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
2. Frontend : Login page (YowStay style), auth store (Zustand), protected route wrapper
3. Security : Access token (15min) + Refresh token (7days, httpOnly cookie)
4. Test     : Unit tests za auth service
```

---

## TASK 2A — Backend Auth Routes & Controller

### apps/api/src/routes/auth.routes.ts
```typescript
import { Router } from 'express'
import { login, refresh, logout, getMe } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { loginSchema } from '../middleware/validate'

const router = Router()

router.post('/login', validate(loginSchema), login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)

export default router
```

### apps/api/src/middleware/validate.ts
```typescript
import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'
import { ApiError } from '../utils/ApiError'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = result.error.flatten().fieldErrors
      throw ApiError.badRequest('Taarifa zilizowekwa si sahihi', details)
    }
    req.body = result.data
    next()
  }
}

// ─── Schemas ───────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email si sahihi'),
  password: z.string().min(1, 'Nywila inahitajika'),
})

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Jina linahitajika'),
  email: z.string().email('Email si sahihi'),
  password: z.string().min(8, 'Nywila lazima iwe na herufi 8+'),
  role: z.enum(['admin', 'receptionist', 'housekeeping']),
  phone: z.string().optional(),
})
```

### apps/api/src/services/auth.service.ts
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
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
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
    })
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
    })
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
```

### apps/api/src/controllers/auth.controller.ts
```typescript
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
```

### Update apps/api/src/app.ts — Add cookie parser:
```typescript
// Ongeza package kwanza:
// npm install cookie-parser && npm install -D @types/cookie-parser

import cookieParser from 'cookie-parser'

// Ongeza baada ya express.json():
app.use(cookieParser())
```

---

## TASK 2B — Auth Unit Tests

### apps/api/src/services/auth.service.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.service'
import { ApiError } from '../utils/ApiError'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }))
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  }
}))

const authService = new AuthService()

describe('AuthService', () => {

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
      const { PrismaClient } = await import('@prisma/client')
      const mockPrisma = new PrismaClient() as any
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(authService.login('notfound@test.com', 'password'))
        .rejects.toThrow('Email au nywila si sahihi')
    })

    it('should throw unauthorized if user is inactive', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mockPrisma = new PrismaClient() as any
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', isActive: false, passwordHash: 'hash'
      })

      await expect(authService.login('test@test.com', 'password'))
        .rejects.toThrow('Akaunti yako imezimwa')
    })

    it('should throw unauthorized if password is wrong', async () => {
      const { PrismaClient } = await import('@prisma/client')
      const mockPrisma = new PrismaClient() as any
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', isActive: true, passwordHash: 'hash'
      })

      const bcrypt = await import('bcryptjs')
      ;(bcrypt.default.compare as any).mockResolvedValue(false)

      await expect(authService.login('test@test.com', 'wrongpassword'))
        .rejects.toThrow('Email au nywila si sahihi')
    })
  })

})
```

### Run tests:
```bash
cd apps/api
npm run test
# Expected: 4 tests pass
```

---

## TASK 2C — Frontend Auth Store (Zustand)

### apps/web/store/authStore.ts
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface User {
  id: string
  fullName: string
  email: string
  role: 'admin' | 'receptionist' | 'housekeeping'
  avatarUrl?: string
  hotel: {
    id: string
    name: string
    logoUrl?: string
    checkInTime: string
    checkOutTime: string
    defaultLanguage: string
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  setUser: (user: User) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { accessToken, user } = res.data.data

          // Store token in memory (NOT localStorage for security)
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error: any) {
          set({ isLoading: false })
          throw new Error(error.response?.data?.error?.message || 'Imeshindwa kuingia')
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        delete api.defaults.headers.common['Authorization']
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      refreshToken: async () => {
        try {
          const res = await api.post('/auth/refresh')
          const { accessToken } = res.data.data
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          set({ accessToken, isAuthenticated: true })
          return true
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false })
          return false
        }
      },

      setUser: (user) => set({ user }),

      initialize: async () => {
        // Try to restore session on page load
        const success = await get().refreshToken()
        if (success) {
          try {
            const res = await api.get('/auth/me')
            set({ user: res.data.data })
          } catch {
            set({ isAuthenticated: false })
          }
        }
      }
    }),
    {
      name: 'stayflow-auth',
      partialize: (state) => ({ user: state.user }) // Only persist user info, NOT token
    }
  )
)
```

### apps/web/lib/api.ts
```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Important: allows httpOnly cookie to be sent
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptor — auto refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = res.data.data.accessToken
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

---

## TASK 2D — Login Page (YowStay Style)

### apps/web/app/(auth)/layout.tsx
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      {children}
    </div>
  )
}
```

### apps/web/app/(auth)/login/page.tsx
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      router.push('/overview')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">StayFlow</h1>
        <p className="text-sm text-gray-500 mt-1">Ingia kwenye mfumo</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Barua pepe
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@g4homez.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 text-sm border-gray-200 focus:border-primary focus:ring-primary"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Nywila
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 text-sm border-gray-200 focus:border-primary focus:ring-primary"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Inaingia...
              </span>
            ) : 'Ingia'}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-6">
        StayFlow Reservation Management System
      </p>
    </div>
  )
}
```

---

## TASK 2E — Protected Route & Dashboard Layout

### apps/web/components/shared/AuthGuard.tsx
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'receptionist' | 'housekeeping')[]
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, user, initialize } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated) {
        await initialize()
        if (!useAuthStore.getState().isAuthenticated) {
          router.push('/login')
        }
      }
    }
    init()
  }, [isAuthenticated, router, initialize])

  // Role check
  if (isAuthenticated && allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Huna ruhusa</p>
          <p className="text-sm text-gray-500 mt-1">Wasiliana na admin</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-page">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
```

### apps/web/app/(dashboard)/layout.tsx
```typescript
import AuthGuard from '@/components/shared/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-page overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
```

### apps/web/components/layout/Sidebar.tsx
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Calendar, Users, DoorOpen,
  Sparkles, Receipt, TrendingUp, Settings, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    section: 'DAILY OPERATION',
    items: [
      { label: 'Overview', labelSw: 'Muhtasari', href: '/overview', icon: LayoutDashboard },
      { label: 'Reservations', labelSw: 'Uhifadhi', href: '/reservations', icon: Calendar, badge: true },
      { label: 'Guests', labelSw: 'Wageni', href: '/guests', icon: Users },
      { label: 'Rooms', labelSw: 'Vyumba', href: '/rooms', icon: DoorOpen },
      { label: 'Housekeeping', labelSw: 'Usafi', href: '/housekeeping', icon: Sparkles },
    ]
  },
  {
    section: 'ACCOUNTING',
    items: [
      { label: 'Expenses', labelSw: 'Matumizi', href: '/accounting/expenses', icon: Receipt },
      { label: 'Revenue', labelSw: 'Mapato', href: '/accounting/revenue', icon: TrendingUp },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-[220px] h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">StayFlow</span>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-semibold">
              {user?.fullName?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map((group) => (
          <div key={group.section} className="mb-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1.5">
              {group.section}
            </p>
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm mb-0.5 transition-colors",
                    isActive
                      ? "bg-primary-light text-primary font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon size={16} className={cn(isActive ? "text-primary" : "text-gray-400")} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Settings size={16} className="text-gray-400" />
          Settings
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut size={16} className="text-gray-400" />
          Log out
        </button>
      </div>
    </aside>
  )
}
```

### apps/web/components/layout/Header.tsx
```typescript
'use client'

import { useAuthStore } from '@/store/authStore'
import { Bell, Moon } from 'lucide-react'

export default function Header() {
  const { user } = useAuthStore()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'long'
  })

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Hotel name */}
      <div>
        <p className="text-sm font-semibold text-gray-900">{user?.hotel?.name || 'StayFlow'}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
          <Moon size={16} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 relative">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">
          <span>{dateStr}</span>
        </div>
      </div>
    </header>
  )
}
```

---

## TASK 2F — Placeholder Pages (Prevent 404)

### Unda placeholder page kwa kila route ya dashboard:

Kwa kila moja ya hizi — unda `page.tsx` yenye content ya msingi:
```
apps/web/app/(dashboard)/overview/page.tsx
apps/web/app/(dashboard)/reservations/page.tsx
apps/web/app/(dashboard)/guests/page.tsx
apps/web/app/(dashboard)/rooms/page.tsx
apps/web/app/(dashboard)/housekeeping/page.tsx
apps/web/app/(dashboard)/settings/page.tsx
```

Content ya placeholder (same pattern kwa zote — badilisha title tu):
```typescript
export default function OverviewPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Overview</h1>
      <p className="text-sm text-gray-500">Dashboard — inakuja hivi karibuni</p>
    </div>
  )
}
```

---

## TASK 2G — Root Redirect

### apps/web/app/page.tsx
```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
```

### apps/web/app/(auth)/login/page.tsx — tayari imeandikwa hapo juu ✅

---

## CHECKPOINT — Verify Task 2

Angalia hivi vyote vinafanya kazi:

```bash
# Terminal 1 — API
cd apps/api
npm run dev

# Terminal 2 — Tests
cd apps/api
npm run test
# Expected: All auth tests pass

# Terminal 3 — Web
cd apps/web
npm run dev
```

**Manual tests:**
- [ ] http://localhost:3000 → iredirect kwenda /login
- [ ] Login na `admin@g4homez.com / Admin@2026!` → inakupeleka /overview
- [ ] Login na credentials mbaya → inaonyesha error message
- [ ] Baada ya login, refresh page → bado umeingia (session ipo)
- [ ] Logout → inarudi /login
- [ ] Jaribu kwenda /overview bila login → redirect /login
- [ ] Sidebar inaonyesha jina la mtumiaji na role
- [ ] Header inaonyesha jina la hoteli na tarehe ya leo

**API tests (PowerShell au curl):**
```powershell
# Login
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@g4homez.com","password":"Admin@2026!"}'

# Expected response:
# { success: true, data: { accessToken: "...", user: { ... } } }
```

---

## KUMBUKA KWA GEMINI/AI AGENT

1. **httpOnly cookie** — refresh token lazima iwe cookie, si localStorage
2. **withCredentials: true** — axios lazima iwe na hii ili cookie itumwe
3. **CORS** — backend lazima iruhusiwe `credentials: true` na exact origin
4. **Design** — Login page iwe clean, white, blue button — angalia YowStay reference
5. **Error messages** — Kiswahili first ("Email au nywila si sahihi")
6. **No purple, no gradient** — hata kwenye loading spinner

---

*StayFlow Phase 1 Task 2 — Authentication*
*Next: Task 3 — Rooms CRUD + Room Grid UI*
