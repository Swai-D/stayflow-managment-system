'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  Bell, Search, Calendar, Menu, Moon, Sun, Mic,
  CalendarDays, Users, DoorOpen, Package, Truck,
  Loader2, X, Briefcase, FileText, Banknote, Receipt,
  Building2, LayoutDashboard, Sparkles, Settings, Users2,
  Wallet, Smartphone, ConciergeBell, ShoppingCart, CreditCard,
  ArrowLeftRight, TrendingUp, KeyRound, Webhook, Activity,
  ScrollText, LayoutGrid
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/components/shared/ThemeProvider'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useSearch, type SearchResult } from '@/hooks/useSearch'
import Link from 'next/link'
import AIChatDrawer from '@/components/ai/AIChatDrawer'

const titleMap: Record<string, string> = {
  '/overview': 'Dashboard',
  '/reservations': 'All Reservation',
  '/calendar': 'Calendar',
  '/guests': 'Guests',
  '/rooms': 'Room Status',
  '/housekeeping': 'Housekeeping',
  '/checkouts': 'Checkout Management',
  '/accounting/expenses': 'Expense Tracking',
  '/accounting/revenue': 'Revenue Management',
  '/payments': 'Payments',
  '/invoices': 'Invoices',
  '/companies': 'Companies',
  '/store': 'Store Dashboard',
  '/store/items': 'Items & Stock',
  '/store/transactions': 'Transactions',
  '/store/purchase-orders': 'Purchase Orders',
  '/store/suppliers': 'Suppliers',
  '/store/pos': 'POS — Post to Room',
  '/guest-portal': 'Guest Portal',
  '/guest-portal/orders': 'Guest Orders',
  '/guest-portal/requests': 'Guest Requests',
  '/staff': 'Staff',
  '/staff/leaves': 'Staff Leaves',
  '/staff/payroll': 'Staff Payroll',
  '/staff/roles': 'Staff Roles',
  '/developer': 'Developer',
  '/developer/api-keys': 'API Keys',
  '/developer/webhooks': 'Webhooks',
  '/developer/logs': 'API Logs',
  '/developer/docs': 'API Documentation',
  '/settings': 'Settings',
}

const NAV_ITEMS: SearchResult[] = [
  { id: 'nav-overview', title: 'Overview', subtitle: 'Dashboard', type: 'nav', href: '/overview' },
  { id: 'nav-reservations', title: 'Reservations', subtitle: 'Bookings & calendar', type: 'nav', href: '/reservations' },
  { id: 'nav-calendar', title: 'Calendar', subtitle: 'Booking calendar view', type: 'nav', href: '/calendar' },
  { id: 'nav-guests', title: 'Guests', subtitle: 'Guest directory', type: 'nav', href: '/guests' },
  { id: 'nav-rooms', title: 'Rooms', subtitle: 'Room status & management', type: 'nav', href: '/rooms' },
  { id: 'nav-housekeeping', title: 'Housekeeping', subtitle: 'Cleaning & maintenance', type: 'nav', href: '/housekeeping' },
  { id: 'nav-checkouts', title: 'Checkouts', subtitle: 'Today checkouts', type: 'nav', href: '/checkouts' },
  { id: 'nav-payments', title: 'Payments', subtitle: 'Recorded payments', type: 'nav', href: '/payments' },
  { id: 'nav-invoices', title: 'Invoices', subtitle: 'Billing invoices', type: 'nav', href: '/invoices' },
  { id: 'nav-companies', title: 'Companies', subtitle: 'Corporate accounts', type: 'nav', href: '/companies' },
  { id: 'nav-expenses', title: 'Expenses', subtitle: 'Expense tracking', type: 'nav', href: '/accounting/expenses' },
  { id: 'nav-revenue', title: 'Revenue', subtitle: 'Revenue reports', type: 'nav', href: '/accounting/revenue' },
  { id: 'nav-store', title: 'Store Dashboard', subtitle: 'Inventory overview', type: 'nav', href: '/store' },
  { id: 'nav-store-items', title: 'Items & Stock', subtitle: 'Inventory items', type: 'nav', href: '/store/items' },
  { id: 'nav-store-pos', title: 'POS', subtitle: 'Post to room', type: 'nav', href: '/store/pos' },
  { id: 'nav-suppliers', title: 'Suppliers', subtitle: 'Vendor management', type: 'nav', href: '/store/suppliers' },
  { id: 'nav-staff', title: 'Staff', subtitle: 'Team management', type: 'nav', href: '/staff' },
  { id: 'nav-staff-payroll', title: 'Payroll', subtitle: 'Staff salaries', type: 'nav', href: '/staff/payroll' },
  { id: 'nav-staff-roles', title: 'Roles', subtitle: 'Permission roles', type: 'nav', href: '/staff/roles' },
  { id: 'nav-guest-portal', title: 'Guest Portal', subtitle: 'Guest orders & requests', type: 'nav', href: '/guest-portal' },
  { id: 'nav-settings', title: 'Settings', subtitle: 'Hotel & system settings', type: 'nav', href: '/settings' },
  { id: 'nav-ai', title: 'AI Assistant', subtitle: 'Buffalo AI settings', type: 'nav', href: '/settings?tab=ai' },
  { id: 'nav-developer', title: 'Developer', subtitle: 'API keys & webhooks', type: 'nav', href: '/developer' },
]

const TYPE_ICONS: Record<SearchResult['type'], typeof CalendarDays> = {
  booking: CalendarDays,
  guest: Users,
  room: DoorOpen,
  store_item: Package,
  supplier: Truck,
  staff: Briefcase,
  invoice: FileText,
  payment: Banknote,
  expense: Receipt,
  company: Building2,
  nav: LayoutDashboard,
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  booking: 'Reservation',
  guest: 'Guest',
  room: 'Room',
  store_item: 'Item',
  supplier: 'Supplier',
  staff: 'Staff',
  invoice: 'Invoice',
  payment: 'Payment',
  expense: 'Expense',
  company: 'Company',
  nav: 'Page',
}

const TYPE_COLORS: Record<SearchResult['type'], { bg: string; text: string }> = {
  booking: { bg: 'bg-[#EFF6FF] dark:bg-blue-900/30', text: 'text-[#2563EB] dark:text-blue-300' },
  guest: { bg: 'bg-[#dcfce7] dark:bg-green-900/30', text: 'text-[#16a34a] dark:text-green-300' },
  room: { bg: 'bg-[#ede9fe] dark:bg-purple-900/30', text: 'text-[#7c3aed] dark:text-purple-300' },
  store_item: { bg: 'bg-[#f3f4f6] dark:bg-gray-700', text: 'text-[#6b7280] dark:text-gray-300' },
  supplier: { bg: 'bg-[#fef3c7] dark:bg-amber-900/30', text: 'text-[#d97706] dark:text-amber-300' },
  staff: { bg: 'bg-[#dbeafe] dark:bg-indigo-900/30', text: 'text-[#1d4ed8] dark:text-indigo-300' },
  invoice: { bg: 'bg-[#fce7f3] dark:bg-pink-900/30', text: 'text-[#db2777] dark:text-pink-300' },
  payment: { bg: 'bg-[#d1fae5] dark:bg-emerald-900/30', text: 'text-[#059669] dark:text-emerald-300' },
  expense: { bg: 'bg-[#fee2e2] dark:bg-red-900/30', text: 'text-[#dc2626] dark:text-red-300' },
  company: { bg: 'bg-[#e0e7ff] dark:bg-violet-900/30', text: 'text-[#4f46e5] dark:text-violet-300' },
  nav: { bg: 'bg-[#f3f4f6] dark:bg-gray-700', text: 'text-[#6b7280] dark:text-gray-300' },
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SearchResultItem({ result, selected, onSelect }: {
  result: SearchResult
  selected: boolean
  onSelect: (r: SearchResult) => void
}) {
  const Icon = TYPE_ICONS[result.type]
  const colors = TYPE_COLORS[result.type]

  return (
    <Link
      href={result.href}
      onClick={() => onSelect(result)}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer',
        selected ? 'bg-[#EFF6FF] dark:bg-blue-900/20' : 'hover:bg-[#f9fafb] dark:hover:bg-gray-700/50'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors.bg, colors.text)}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#111827] dark:text-gray-100 truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-[11px] text-[#9ca3af] dark:text-gray-400 truncate">{result.subtitle}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-[10px] font-medium text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider">{TYPE_LABELS[result.type]}</span>
        {result.meta && <p className="text-[11px] text-[#9ca3af] dark:text-gray-500 truncate max-w-[100px]">{result.meta}</p>}
      </div>
    </Link>
  )
}

function SearchDropdown({ query, open, onClose }: {
  query: string
  open: boolean
  onClose: () => void
}) {
  const debouncedQuery = useDebounce(query, 250)
  const { data: backendResults = [], isLoading } = useSearch(debouncedQuery, open)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  const navResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return NAV_ITEMS.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    ).slice(0, 4)
  }, [debouncedQuery])

  const results = useMemo(() => {
    return [...navResults, ...backendResults]
  }, [navResults, backendResults])

  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery, results.length])

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(result.href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, handleSelect, onClose])

  if (!open) return null

  const showEmpty = !isLoading && debouncedQuery.trim().length >= 2 && results.length === 0
  const showHint = !isLoading && debouncedQuery.trim().length < 2
  const showShortcuts = !isLoading && debouncedQuery.trim().length < 2

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-xl shadow-md z-50 overflow-hidden"
    >
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-[#9ca3af] dark:text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[12px]">Searching...</span>
        </div>
      )}

      {showHint && (
        <div className="px-4 py-5 text-center text-[12px] text-[#9ca3af] dark:text-gray-400">
          Type at least 2 characters to search across guests, rooms, reservations, staff, invoices, payments, items, and pages
        </div>
      )}

      {showShortcuts && (
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Quick pages</p>
          <div className="grid grid-cols-2 gap-1">
            {NAV_ITEMS.slice(0, 6).map(item => (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f9fafb] dark:hover:bg-gray-700/50 text-[12px] text-[#374151] dark:text-gray-300"
              >
                <span className="w-5 h-5 rounded bg-[#EFF6FF] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                  <LayoutGrid size={11} />
                </span>
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {showEmpty && (
        <div className="px-4 py-5 text-center text-[12px] text-[#9ca3af] dark:text-gray-400">
          No results found for &quot;{debouncedQuery}&quot;
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto py-1">
          {results.map((result, index) => (
            <SearchResultItem
              key={`${result.type}-${result.id}`}
              result={result}
              selected={index === selectedIndex}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="px-4 py-2 bg-[#f9fafb] dark:bg-gray-800 border-t border-[#f3f4f6] dark:border-gray-700 text-[10px] text-[#9ca3af] dark:text-gray-500 flex items-center justify-between">
          <span>{results.length} result{results.length > 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-[#e5e7eb] dark:border-gray-600 rounded text-[9px]">↑↓</kbd>
            <span>to navigate</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-[#e5e7eb] dark:border-gray-600 rounded text-[9px] ml-1">↵</kbd>
            <span>to open</span>
          </span>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const pathname = usePathname()
  const { toggleSidebar } = useUIStore()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const pageTitle = titleMap[pathname] || 'Buffalo Reservation'
  const dateStr = format(new Date(), "EEE, dd MMMM")

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="flex items-center justify-between mb-5 h-[64px] px-6">
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-[34px] h-[34px] flex items-center justify-center bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-lg text-[#6b7280] dark:text-gray-300 transition-colors flex-shrink-0"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[22px] font-bold text-[#111827] dark:text-gray-100 truncate">{pageTitle}</h1>
      </div>

      {/* Center: Search Box */}
      <div
        ref={containerRef}
        className="hidden md:flex flex-1 max-w-[420px] mx-5 relative"
      >
        <div
          className={cn(
            'flex items-center gap-2 w-full h-[38px] bg-white dark:bg-[#1f2937] border rounded-lg px-3 transition-all',
            searchOpen ? 'border-[#2563EB] ring-2 ring-[#dbeafe] dark:ring-blue-900/40' : 'border-[#e5e7eb] dark:border-gray-700 hover:border-[#d1d5db] dark:hover:border-gray-600'
          )}
        >
          <Search size={15} className="text-[#9ca3af] dark:text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onClick={() => setSearchOpen(true)}
            placeholder="Search guests, rooms, reservations, staff, invoices, pages..."
            className="flex-1 bg-transparent text-[13px] text-[#374151] dark:text-gray-200 placeholder:text-[#9ca3af] dark:placeholder:text-gray-500 outline-none min-w-0"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="text-[#9ca3af] dark:text-gray-400 hover:text-[#6b7280] dark:hover:text-gray-300"
            >
              <X size={13} />
            </button>
          ) : (
            <Mic size={14} className="text-[#9ca3af] dark:text-gray-400 flex-shrink-0" />
          )}
        </div>

        <SearchDropdown
          query={query}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* AI Assistant */}
        <AIChatDrawer />

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-[34px] h-[34px] flex items-center justify-center bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-lg text-[#6b7280] dark:text-gray-300 hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors"
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button className="relative w-[34px] h-[34px] flex items-center justify-center bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-lg text-[#6b7280] dark:text-gray-300 hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors">
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ef4444] rounded-full border border-white dark:border-[#1f2937]" />
        </button>

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-lg h-[34px] px-3">
          <Calendar size={13} className="text-[#6b7280] dark:text-gray-400 flex-shrink-0" />
          <span className="text-[12px] font-medium text-[#6b7280] dark:text-gray-300 whitespace-nowrap">{dateStr}</span>
        </div>
      </div>
    </header>
  )
}
