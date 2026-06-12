'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Bell, Search, Calendar, Menu } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const titleMap: Record<string, string> = {
  '/overview': 'Dashboard',
  '/reservations': 'All Reservation',
  '/guests': 'Guests',
  '/rooms': 'Room Status',
  '/housekeeping': 'Housekeeping',
  '/accounting/expenses': 'Expense Tracking',
  '/accounting/revenue': 'Revenue Management',
  '/settings': 'Settings',
}

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggleSidebar } = useUIStore()

  const pageTitle = titleMap[pathname] || 'StayFlow'
  const dateStr = format(new Date(), "EEE, dd MMMM")

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'R'

  return (
    <header className="h-[64px] bg-transparent flex items-center justify-between px-5 flex-shrink-0">

      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-white hover:border hover:border-gray-200 rounded-lg transition-all flex-shrink-0"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[19px] font-bold text-gray-900 truncate">{pageTitle}</h1>
      </div>

      {/* Center: search — hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-[240px] mx-4">
        <div className="flex items-center gap-2 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 cursor-text hover:border-gray-300 transition-colors">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-[12px] text-gray-400">Search..</span>
          <span className="ml-auto text-[10px] text-gray-300">🎤</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden h-9">
          <button className="px-3 h-full text-[11px] font-semibold text-white bg-[#2563EB] transition-colors">
            EN
          </button>
          <button className="px-3 h-full text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            SW
          </button>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
        </button>

        {/* Date */}
        <div className="hidden sm:flex bg-white border border-gray-200 rounded-lg h-9 px-3 items-center gap-2">
          <Calendar size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-[12px] font-medium text-gray-500 whitespace-nowrap">{dateStr}</span>
        </div>

        {/* User avatar */}
        <div className="hidden md:flex w-9 h-9 rounded-full bg-[#c7d2fe] items-center justify-center flex-shrink-0 cursor-pointer">
          <span className="text-[11px] font-bold text-[#4338ca]">{initials}</span>
        </div>
      </div>
    </header>
  )
}
