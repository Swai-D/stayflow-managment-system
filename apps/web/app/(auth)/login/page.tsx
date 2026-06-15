'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Karibu tena! Umefanikiwa kuingia.')
      router.push('/overview')
    } catch (err: any) {
      toast.error(err.message || 'Imeshindwa kuingia. Angalia barua pepe na nywila.')
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Buffalo Hotel</h1>
        <p className="text-sm text-gray-500 mt-1">Ingia kwenye mfumo</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Barua pepe
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@buffalo.co.tz"
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
        Buffalo Hotel Reservation Management System
      </p>
    </div>
  )
}
