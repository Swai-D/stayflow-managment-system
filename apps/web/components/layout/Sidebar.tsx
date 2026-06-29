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
  Users2, Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'

const NAV_GROUPS = [
  {
    key: 'daily',
    label: 'DAILY OPERATION',
    items: [
      { label:'Overview',       href:'/overview',             icon:LayoutDashboard },
      { label:'Reservations',   href:'/reservations',         icon:CalendarDays,   badge:6 },
      { label:'Calendar',       href:'/calendar',             icon:CalendarIcon },
      { label:'Guests',         href:'/guests',               icon:Users },
      { label:'Rooms',          href:'/rooms',                icon:DoorOpen },
      { label:'Housekeeping',   href:'/housekeeping',         icon:Sparkles },
      { label:'Checkouts',      href:'/checkouts',            icon:DoorOpen },
    ]
  },
  {
    key: 'accounting',
    label: 'ACCOUNTING',
    items: [
      { label:'Expense Tracking',   href:'/accounting/expenses', icon:Receipt },
      { label:'Revenue Management', href:'/accounting/revenue',  icon:TrendingUp },
    ]
  },
  {
    key: 'billing',
    label: 'BILLING',
    items: [
      { label:'Payments',     href:'/payments',     icon:Banknote },
      { label:'Invoices',     href:'/invoices',     icon:FileText },
      { label:'Companies',    href:'/companies',    icon:Building2 },
    ]
  },
  {
    key: 'store',
    label: 'STORE & INVENTORY',
    items: [
      { label:'Store Dashboard',    href:'/store',                    icon:LayoutGrid },
      { label:'Items & Stock',      href:'/store/items',              icon:Package },
      { label:'Transactions',       href:'/store/transactions',       icon:ArrowLeftRight },
      { label:'Purchase Orders',    href:'/store/purchase-orders',    icon:ShoppingCart },
      { label:'Suppliers',          href:'/store/suppliers',          icon:Truck },
      { label:'POS — Post to Room', href:'/store/pos',                icon:CreditCard },
    ]
  },
  {
    key: 'developer',
    label: 'DEVELOPER',
    items: [
      { label:'API Keys',       href:'/developer/api-keys',    icon:KeyRound },
      { label:'Webhooks',       href:'/developer/webhooks',    icon:Webhook },
      { label:'API Logs',       href:'/developer/logs',        icon:Activity },
      { label:'Documentation',  href:'/developer/docs',        icon:ScrollText },
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
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white rounded-2xl shadow-card flex flex-col flex-shrink-0 transition-transform duration-300",
        "lg:static lg:ml-4 lg:my-4 lg:h-[calc(100vh-32px)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-[60px] border-b border-[#f3f4f6] flex-shrink-0">
          <div className="w-8 h-8 bg-[#1a2b4a] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L1.5 4.5v7L8 15l6.5-3.5v-7L8 1z" fill="white" opacity="0.95"/>
              <path d="M8 5L4.5 7v4L8 13l3.5-2V7L8 5z" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold text-[#111827]">
            Buffalo<span className="text-[#2563EB]"> MS</span>
          </span>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <div
            onClick={() => router.push('/settings?tab=profile')}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-[#f3f4f6] rounded-lg p-1.5 -m-1.5 transition-colors"
            title="Go to My Profile"
          >
            <div className="w-9 h-9 rounded-full bg-[#c7d2fe] flex items-center justify-center text-[#1a2b4a] font-semibold text-[11px] flex-shrink-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover"/>
                : getInitials(user?.fullName ?? 'U')
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#111827] truncate leading-tight">{user?.fullName ?? 'Admin'}</p>
              <p className="text-[11px] text-[#9ca3af] capitalize leading-tight">{user?.role ?? 'admin'}</p>
            </div>
            <ChevronDown size={12} className="text-[#9ca3af] flex-shrink-0"/>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 no-scrollbar">
          {NAV_GROUPS.map(group => (
            <div key={group.key} className="mb-1">
              <button onClick={() => toggle(group.key)}
                className="w-full flex items-center justify-between px-2 pt-2 pb-1.5">
                <span className="text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
                  {group.label}
                </span>
                <ChevronDown size={10} className={cn('text-[#d1d5db] transition-transform', !isOpen(group.key) && '-rotate-90')}/>
              </button>

              {isOpen(group.key) && group.items.map(item => {
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
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] font-medium'
                    )}>
                    <Icon size={14} className={cn('flex-shrink-0', isActive ? 'text-[#2563EB]' : 'text-[#9ca3af]')}/>
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
          ))}

          {/* System option */}
          <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
            <span className="text-[9.5px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">SYSTEM OPTION</span>
            <ChevronDown size={10} className="text-[#d1d5db]"/>
          </div>

          {(user?.role === 'admin' || user?.role === 'receptionist') && (
            <Link href="/staff"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] mb-0.5 transition-all duration-150 font-medium',
                pathname === '/staff' || pathname.startsWith('/staff/')
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
              )}>
              <Users2 size={14} className={cn('flex-shrink-0', pathname === '/staff' || pathname.startsWith('/staff/') ? 'text-[#2563EB]' : 'text-[#9ca3af]')}/>
              <span className="flex-1 truncate">Staff</span>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link href="/staff/payroll"
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] mb-0.5 transition-all duration-150 font-medium',
                pathname === '/staff/payroll'
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
              )}>
              <Wallet size={14} className={cn('flex-shrink-0', pathname === '/staff/payroll' ? 'text-[#2563EB]' : 'text-[#9ca3af]')}/>
              <span className="flex-1 truncate">Payroll</span>
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 pt-2 border-t border-[#f3f4f6] flex-shrink-0 space-y-0.5">
          <Link href="/settings"
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] transition-all duration-150 font-medium',
              pathname === '/settings' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6b7280] hover:bg-[#f3f4f6]'
            )}>
            <Settings size={14} className="text-[#9ca3af] flex-shrink-0"/>
            Settings
          </Link>
          <button onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-all duration-150 font-medium">
            <LogOut size={14} className="text-[#9ca3af] flex-shrink-0"/>
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}
