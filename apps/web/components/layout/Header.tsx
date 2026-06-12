'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Bell, Search, Calendar, Menu, Moon, Mic } from 'lucide-react'
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
  const { toggleSidebar } = useUIStore()

  const pageTitle = titleMap[pathname] || 'StayFlow'
  const dateStr = format(new Date(), "EEE, dd MMMM")

  return (
    <header className="flex items-center justify-between mb-5 h-[64px] px-0">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-[8px] text-[#6b7280] transition-all flex-shrink-0"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[22px] font-bold text-[#111827] truncate">{pageTitle}</h1>
      </div>

      {/* Center: Search Box */}
      <div className="hidden md:flex flex-1 max-w-[260px] mx-5">
        <div className="flex items-center gap-2 w-full h-[36px] bg-white border border-[#e5e7eb] rounded-[8px] px-3 cursor-text hover:border-gray-300 transition-colors">
          <Search size={14} className="text-[#9ca3af] flex-shrink-0" />
          <span className="text-[12px] text-[#9ca3af]">Search..</span>
          <Mic size={12} className="ml-auto text-[#9ca3af]" />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button className="w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-[8px] text-[#6b7280] hover:bg-gray-50 transition-colors">
          <Moon size={15} />
        </button>

        {/* Notifications */}
        <button className="relative w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-[8px] text-[#6b7280] hover:bg-gray-50 transition-colors">
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ef4444] rounded-full border border-white" />
        </button>

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-[8px] h-[34px] px-3">
          <Calendar size={13} className="text-[#6b7280] flex-shrink-0" />
          <span className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap">{dateStr}</span>
        </div>
      </div>
    </header>
  )
}
