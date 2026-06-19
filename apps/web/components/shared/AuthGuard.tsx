'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'receptionist' | 'housekeeping' | 'waiter')[]
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
