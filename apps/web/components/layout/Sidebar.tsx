'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Calendar, Users, DoorOpen,
  Sparkles, Receipt, TrendingUp, Settings, LogOut,
  ChevronDown, ShieldCheck, LayoutGrid, Package,
  ArrowLeftRight, ShoppingCart, Truck, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { toast } from 'sonner'

const navGroups = [
  {
    section: 'Daily Operation',
    items: [
      { label: 'Reservations', href: '/reservations', icon: Calendar, badge: 6 },
      { label: 'Guests', href: '/guests', icon: Users },
      { label: 'Rooms', href: '/rooms', icon: DoorOpen },
      { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
    ]
  },
  {
    section: 'Accounting',
    items: [
      { label: 'Expense Tracking', href: '/accounting/expenses', icon: Receipt },
      { label: 'Revenue Management', href: '/accounting/revenue', icon: TrendingUp },
    ]
  },
  {
    section: 'STORE & INVENTORY',
    items: [
      { label: 'Store Dashboard',   href: '/store',                    icon: LayoutGrid },
      { label: 'Items & Stock',     href: '/store/items',              icon: Package },
      { label: 'Transactions',      href: '/store/transactions',       icon: ArrowLeftRight },
      { label: 'Purchase Orders',   href: '/store/purchase-orders',    icon: ShoppingCart },
      { label: 'Suppliers',         href: '/store/suppliers',          icon: Truck },
      { label: 'POS — Post to Room',href: '/store/pos',                icon: CreditCard },
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
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white rounded-[16px] m-4 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.07)] transition-transform duration-300",
        "lg:sticky lg:top-4 lg:m-4 lg:mr-0 lg:h-[calc(100vh-32px)] lg:translate-x-0 lg:flex-shrink-0 overflow-y-auto no-scrollbar",
        isSidebarOpen ? "translate-x-0" : "-translate-x-[280px]"
      )}>

        {/* User Section */}
        <div className="px-4 pt-5 pb-5 border-b border-[#f3f4f6] mb-5 cursor-pointer flex items-center gap-2.5">
          <div className="w-[38px] h-[38px] rounded-full bg-[#c7d2fe] flex items-center justify-center text-[16px] flex-shrink-0">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#111827] truncate">
              {user?.fullName || 'Ronald Richards'}
            </p>
            <p className="text-[11px] text-[#9ca3af] capitalize">
              {user?.role || 'Admin'}
            </p>
          </div>
          <ChevronDown size={11} className="text-[#9ca3af] flex-shrink-0" />
        </div>

        {/* Overview */}
        <div className="px-4">
          <Link
            href="/overview"
            className={cn(
              "flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all mb-0.5",
              pathname === '/overview'
                ? "bg-[#eff6ff] text-[#2563eb]"
                : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
            )}
          >
            <LayoutDashboard size={16} className={cn("flex-shrink-0 opacity-70", pathname === '/overview' && "opacity-100")} />
            <span>Overview</span>
          </Link>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-4 py-3 space-y-0.5">
          {navGroups.map((group) => (
            <div key={group.section} className="pt-3 first:pt-0">
              <div className="flex items-center justify-between px-3 py-3 mb-1.5 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
                {group.section}
                <ChevronDown size={10} className="cursor-pointer" />
              </div>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium mb-0.5 transition-all",
                      isActive
                        ? "bg-[#eff6ff] text-[#2563eb]"
                        : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
                    )}
                  >
                    <Icon size={16} className={cn("flex-shrink-0 opacity-70", isActive && "opacity-100")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-[#ef4444] text-white rounded-[20px] text-[10px] px-1.5 py-0.5 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
          
          <div className="pt-3">
            <div className="flex items-center justify-between px-3 py-3 mb-1.5 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
              System Option <span className="text-[10px]">▾</span>
            </div>
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-5 pt-4 border-t border-[#f3f4f6] space-y-0.5 mt-auto">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all",
              pathname === '/settings'
                ? "bg-[#eff6ff] text-[#2563eb]"
                : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]"
            )}
          >
            <Settings size={16} className={cn("flex-shrink-0 opacity-70", pathname === '/settings' && "opacity-100")} />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => {
              logout()
              toast.success('Umetoka kwenye mfumo salama')
            }}
            className="w-full flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13.5px] font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-all"
          >
            <LogOut size={16} className="opacity-70 flex-shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
