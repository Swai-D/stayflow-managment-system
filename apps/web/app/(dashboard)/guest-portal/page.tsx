'use client'

import Link from 'next/link'
import { useGuestPortalStats } from '@/hooks/useGuestPortal'
import { Smartphone, ShoppingCart, ConciergeBell, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const CARDS = [
  {
    label: 'Pending Orders',
    icon: ShoppingCart,
    href: '/guest-portal/orders',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100'
  },
  {
    label: 'Pending Requests',
    icon: ConciergeBell,
    href: '/guest-portal/requests',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100'
  },
  {
    label: "Today's Orders",
    icon: ShoppingCart,
    href: '/guest-portal/orders',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100'
  },
  {
    label: "Today's Requests",
    icon: ConciergeBell,
    href: '/guest-portal/requests',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100'
  }
]

export default function GuestPortalPage() {
  const { data: stats, isLoading } = useGuestPortalStats()

  const values = [
    stats?.pendingOrders ?? 0,
    stats?.pendingRequests ?? 0,
    stats?.todayOrders ?? 0,
    stats?.todayRequests ?? 0
  ]

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Guest Portal</h1>
        <p className="text-[12px] text-[#9ca3af] font-medium">Monitor guest orders, requests and portal activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card, idx) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                'bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-all group',
                card.border
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                  <Icon size={20} className={card.color} />
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-[#2563EB] transition-colors" />
              </div>
              <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">{card.label}</p>
              <p className="text-[26px] font-bold text-[#111827] tracking-tight mt-1">
                {isLoading ? '—' : values[idx]}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <Smartphone size={20} className="text-[#2563EB]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#111827]">How it works</h2>
            <p className="text-[12px] text-[#9ca3af]">Guest portal flow connected to rooms</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px] text-gray-600">
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="font-bold text-[#2563EB]">1.</span> Guest checks in → Room QR code is activated and linked to their booking.
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="font-bold text-[#2563EB]">2.</span> Guest scans QR in the room → Auto-login to the guest portal dashboard.
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="font-bold text-[#2563EB]">3.</span> Guest orders & requests appear here and are posted to the room folio.
          </div>
        </div>
      </div>
    </div>
  )
}
