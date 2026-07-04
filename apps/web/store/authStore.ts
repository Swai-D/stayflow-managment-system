import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

export interface User {
  id: string
  fullName: string
  email: string
  phone?: string
  roleId: string
  role: {
    id: string
    name: string
    permissions: string[]
  }
  avatarUrl?: string
  lastLoginAt?: string
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
  updateUser: (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => Promise<User>
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

      updateUser: async (data) => {
        const res = await api.patch('/auth/me', data)
        const updatedUser = res.data.data
        set({ user: updatedUser })
        return updatedUser
      },

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
