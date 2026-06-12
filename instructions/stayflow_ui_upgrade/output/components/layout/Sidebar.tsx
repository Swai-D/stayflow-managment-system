'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Calendar, Users, DoorOpen,
  Sparkles, Receipt, TrendingUp, Settings, LogOut,
  ChevronDown, Hotel
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

const navGroups = [
  {
    section: 'DAILY OPERATION',
    items: [
      { label: 'Reservations', href: '/reservations', icon: Calendar, badge: 6 },
      { label: 'Guests', href: '/guests', icon: Users },
      { label: 'Rooms', href: '/rooms', icon: DoorOpen },
      { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
    ]
  },
  {
    section: 'ACCOUNTING',
    items: [
      { label: 'Expense Tracking', href: '/accounting/expenses', icon: Receipt },
      { label: 'Revenue Management', href: '/accounting/revenue', icon: TrendingUp },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { isSidebarOpen, closeSidebar } = useUIStore()

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'R'

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white rounded-2xl m-4 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.07)] transition-transform duration-300",
        "lg:sticky lg:top-4 lg:m-4 lg:mr-0 lg:h-[calc(100vh-32px)] lg:translate-x-0 lg:flex-shrink-0 overflow-y-auto no-scrollbar",
        isSidebarOpen ? "translate-x-0" : "-translate-x-[280px]"
      )}>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] bg-[#1a2b4a] rounded-lg flex items-center justify-center flex-shrink-0">
              <Hotel size={17} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#1a2b4a] leading-tight">StayFlow</p>
              <p className="text-[10px] text-gray-400 font-medium">G4 Homez · Morogoro</p>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="px-3 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-[36px] h-[36px] rounded-full bg-[#c7d2fe] flex items-center justify-center flex-shrink-0">
              <span className="text-[#4338ca] text-[12px] font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 truncate">
                {user?.fullName || 'Ronald Richards'}
              </p>
              <p className="text-[11px] text-gray-400 capitalize">
                {user?.role || 'Admin'}
              </p>
            </div>
            <ChevronDown size={11} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {/* Overview */}
          <Link
            href="/overview"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all mb-0.5",
              pathname === '/overview'
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <LayoutDashboard size={16} className={cn("flex-shrink-0", pathname === '/overview' ? "opacity-100" : "opacity-60")} />
            <span>Overview</span>
          </Link>

          {/* Nav Groups */}
          {navGroups.map((group) => (
            <div key={group.section} className="pt-3">
              <div className="flex items-center justify-between px-3 py-1 mb-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {group.section}
                </p>
                <ChevronDown size={10} className="text-gray-300" />
              </div>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium mb-0.5 transition-all",
                      isActive
                        ? "bg-[#EFF6FF] text-[#2563EB]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon size={16} className={cn("flex-shrink-0", isActive ? "opacity-100" : "opacity-60")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-[#EF4444] text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 pt-3 border-t border-gray-100 space-y-0.5">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all",
              pathname === '/settings'
                ? "bg-[#EFF6FF] text-[#2563EB]"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Settings size={16} className={cn("flex-shrink-0", pathname === '/settings' ? "opacity-100" : "opacity-60")} />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <LogOut size={16} className="opacity-60 flex-shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
