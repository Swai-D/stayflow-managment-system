'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/formatters'
import {
  LayoutDashboard, CalendarDays, CalendarIcon, Users, DoorOpen,
  Sparkles, Receipt, TrendingUp, Settings, LogOut,
  ChevronDown, LayoutGrid, Package, ArrowLeftRight,
  ShoppingCart, Truck, CreditCard, Banknote, FileText, Building2,
  Code2, KeyRound, Webhook, ScrollText, Activity,
  Users2, Wallet, Smartphone, ConciergeBell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasAnyPermission } from '@/lib/roles'
import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  permissions?: import('@/lib/roles').AppPermission[]
}

const NAV_GROUPS: { key: string; label: string; emoji: string; items: NavItem[] }[] = [
  {
    key: 'daily',
    label: 'DAILY OPERATION',
    emoji: '📋',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard },
      { label: 'Reservations', href: '/reservations', icon: CalendarDays, badge: 6, permissions: ['bookings:view'] },
      { label: 'Calendar', href: '/calendar', icon: CalendarIcon, permissions: ['bookings:view'] },
      { label: 'Guests', href: '/guests', icon: Users, permissions: ['guests:view'] },
      { label: 'Rooms', href: '/rooms', icon: DoorOpen, permissions: ['rooms:view'] },
      { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles, permissions: ['housekeeping:view'] },
      { label: 'Checkouts', href: '/checkouts', icon: DoorOpen, permissions: ['bookings:checkout'] },
    ]
  },
  {
    key: 'accounting',
    label: 'ACCOUNTING',
    emoji: '💰',
    items: [
      { label: 'Expense Tracking', href: '/accounting/expenses', icon: Receipt, permissions: ['reports:view'] },
      { label: 'Revenue Management', href: '/accounting/revenue', icon: TrendingUp, permissions: ['reports:view'] },
    ]
  },
  {
    key: 'billing',
    label: 'BILLING',
    emoji: '🧾',
    items: [
      { label: 'Payments', href: '/payments', icon: Banknote, permissions: ['payments:view'] },
      { label: 'Invoices', href: '/invoices', icon: FileText, permissions: ['invoices:view'] },
      { label: 'Companies', href: '/companies', icon: Building2, permissions: ['companies:view'] },
    ]
  },
  {
    key: 'store',
    label: 'STORE & INVENTORY',
    emoji: '📦',
    items: [
      { label: 'Store Dashboard', href: '/store', icon: LayoutGrid, permissions: ['store:view'] },
      { label: 'Items & Stock', href: '/store/items', icon: Package, permissions: ['store:view'] },
      { label: 'Transactions', href: '/store/transactions', icon: ArrowLeftRight, permissions: ['store:view'] },
      { label: 'Purchase Orders', href: '/store/purchase-orders', icon: ShoppingCart, permissions: ['store:view'] },
      { label: 'Suppliers', href: '/store/suppliers', icon: Truck, permissions: ['store:view'] },
      { label: 'POS — Post to Room', href: '/store/pos', icon: CreditCard, permissions: ['pos:view'] },
    ]
  },
  {
    key: 'guest-portal',
    label: 'GUEST PORTAL',
    emoji: '📱',
    items: [
      { label: 'Portal Dashboard', href: '/guest-portal', icon: Smartphone, permissions: ['guest_portal:orders', 'guest_portal:requests'] },
      { label: 'Orders', href: '/guest-portal/orders', icon: ShoppingCart, permissions: ['guest_portal:orders'] },
      { label: 'Requests', href: '/guest-portal/requests', icon: ConciergeBell, permissions: ['guest_portal:requests'] },
    ]
  },
  {
    key: 'developer',
    label: 'DEVELOPER',
    emoji: '🛠️',
    items: [
      { label: 'API Keys', href: '/developer/api-keys', icon: KeyRound, permissions: ['developer:manage'] },
      { label: 'Webhooks', href: '/developer/webhooks', icon: Webhook, permissions: ['developer:manage'] },
      { label: 'API Logs', href: '/developer/logs', icon: Activity, permissions: ['developer:manage'] },
      { label: 'Documentation', href: '/developer/docs', icon: ScrollText, permissions: ['developer:manage'] },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { isSidebarOpen, closeSidebar } = useUIStore()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }))
  const isOpen = (key: string) => !collapsed[key]

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
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white dark:bg-[#1f2937] rounded-2xl shadow-card flex flex-col flex-shrink-0 transition-transform duration-300",
        "lg:static lg:ml-4 lg:my-4 lg:h-[calc(100vh-32px)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-[60px] border-b border-[#f3f4f6] dark:border-gray-700 flex-shrink-0">
          <div className="w-8 h-8 bg-[#26120c] dark:bg-[#8B4530] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L1.5 4.5v7L8 15l6.5-3.5v-7L8 1z" fill="white" opacity="0.95" />
              <path d="M8 5L4.5 7v4L8 13l3.5-2V7L8 5z" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-[#111827] dark:text-gray-100">
            🐃 Buffalo<span className="text-[#8B4530] dark:text-blue-400"> MS</span>
          </span>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-[#f3f4f6] dark:border-gray-700 flex-shrink-0">
          <div
            onClick={() => router.push('/settings?tab=profile')}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-[#f3f4f6] dark:hover:bg-gray-700/50 rounded-lg p-1.5 -m-1.5 transition-colors"
            title="Go to My Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[#f5dfce] dark:bg-blue-900/40 flex items-center justify-center text-[#26120c] dark:text-blue-200 font-semibold text-[11px] flex-shrink-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                : getInitials(user?.fullName ?? 'U')
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-100 truncate leading-tight">{user?.fullName ?? 'Admin'}</p>
              <p className="text-[11px] text-[#9ca3af] dark:text-gray-400 capitalize leading-tight">{user?.role?.name ?? 'admin'}</p>
            </div>
            <ChevronDown size={12} className="text-[#9ca3af] dark:text-gray-500 flex-shrink-0" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 no-scrollbar">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(item =>
              !item.permissions || hasAnyPermission(user?.role, item.permissions)
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={group.key} className="mb-1">
                <button onClick={() => toggle(group.key)}
                  className="w-full flex items-center justify-between px-2 pt-2 pb-1.5">
                  <span className="text-[9.5px] font-semibold text-[#9ca3af] dark:text-gray-500 uppercase tracking-[0.08em]">
                    <span className="mr-1" aria-hidden="true">{group.emoji}</span>{group.label}
                  </span>
                  <ChevronDown size={10} className={cn('text-[#d1d5db] dark:text-gray-600 transition-transform', !isOpen(group.key) && '-rotate-90')} />
                </button>

                {isOpen(group.key) && visibleItems.map(item => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/store' && pathname.startsWith(item.href + '/')) ||
                    (item.href === '/store' && pathname === '/store')
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] mb-0.5 transition-all duration-150',
                        isActive
                          ? 'bg-[#FBF1EA] dark:bg-blue-900/20 text-[#8B4530] dark:text-blue-300 font-semibold'
                          : 'text-[#6b7280] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700/50 hover:text-[#111827] dark:hover:text-gray-200 font-medium'
                      )}>
                      <Icon size={14} className={cn('flex-shrink-0', isActive ? 'text-[#8B4530] dark:text-blue-300' : 'text-[#9ca3af] dark:text-gray-500')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {'badge' in item && item.badge && (
                        <span className="bg-[#ef4444] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* System option */}
          <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
            <span className="text-[9.5px] font-semibold text-[#9ca3af] dark:text-gray-500 uppercase tracking-[0.08em]">🧩 SYSTEM OPTION</span>
            <ChevronDown size={10} className="text-[#d1d5db] dark:text-gray-600" />
          </div>

          {hasAnyPermission(user?.role, ['staff:view']) && (
            <Link href="/staff"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] mb-0.5 transition-all duration-150 font-medium',
                pathname === '/staff' || pathname.startsWith('/staff/')
                  ? 'bg-[#FBF1EA] dark:bg-blue-900/20 text-[#8B4530] dark:text-blue-300 font-semibold'
                  : 'text-[#6b7280] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700/50 hover:text-[#111827] dark:hover:text-gray-200'
              )}>
              <Users2 size={14} className={cn('flex-shrink-0', pathname === '/staff' || pathname.startsWith('/staff/') ? 'text-[#8B4530] dark:text-blue-300' : 'text-[#9ca3af] dark:text-gray-500')} />
              <span className="flex-1 truncate">👥 Staff</span>
            </Link>
          )}

          {hasAnyPermission(user?.role, ['payroll:view']) && (
            <Link href="/staff/payroll"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] mb-0.5 transition-all duration-150 font-medium',
                pathname === '/staff/payroll'
                  ? 'bg-[#FBF1EA] dark:bg-blue-900/20 text-[#8B4530] dark:text-blue-300 font-semibold'
                  : 'text-[#6b7280] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700/50 hover:text-[#111827] dark:hover:text-gray-200'
              )}>
              <Wallet size={14} className={cn('flex-shrink-0', pathname === '/staff/payroll' ? 'text-[#8B4530] dark:text-blue-300' : 'text-[#9ca3af] dark:text-gray-500')} />
              <span className="flex-1 truncate">💵 Payroll</span>
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 pt-2 border-t border-[#f3f4f6] dark:border-gray-700 flex-shrink-0 space-y-0.5">
          {hasAnyPermission(user?.role, ['settings:view', 'settings:manage']) && (
            <Link href="/settings"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] transition-all duration-150 font-medium',
                pathname === '/settings' ? 'bg-[#FBF1EA] dark:bg-blue-900/20 text-[#8B4530] dark:text-blue-300' : 'text-[#6b7280] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
              )}>
              <Settings size={14} className="text-[#9ca3af] dark:text-gray-500 flex-shrink-0" />
              ⚙️ Settings
            </Link>
          )}
          <button onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] text-[#6b7280] dark:text-gray-400 hover:bg-[#fef2f2] dark:hover:bg-red-900/20 hover:text-[#ef4444] dark:hover:text-red-300 transition-all duration-150 font-medium">
            <LogOut size={14} className="text-[#9ca3af] dark:text-gray-500" />
            🚪 Log out
          </button>
        </div>
      </aside>
    </>
  )
}