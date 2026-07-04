'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  Bell, Search, Calendar, Menu, Moon, Mic,
  CalendarDays, Users, DoorOpen, Package, Truck,
  Loader2, X
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useSearch, type SearchResult } from '@/hooks/useSearch'
import Link from 'next/link'
import AIChatDrawer from '@/components/ai/AIChatDrawer'

const titleMap: Record<string, string> = {
  '/overview': 'Dashboard',
  '/reservations': 'All Reservation',
  '/guests': 'Guests',
  '/rooms': 'Room Status',
  '/housekeeping': 'Housekeeping',
  '/checkouts': 'Checkout Management',
  '/accounting/expenses': 'Expense Tracking',
  '/accounting/revenue': 'Revenue Management',
  '/settings': 'Settings',
  '/store': 'Store Dashboard',
  '/store/items': 'Items & Stock',
  '/store/transactions': 'Transactions',
  '/store/purchase-orders': 'Purchase Orders',
  '/store/suppliers': 'Suppliers',
  '/store/pos': 'POS — Post to Room',
}

const TYPE_ICONS: Record<SearchResult['type'], typeof CalendarDays> = {
  booking: CalendarDays,
  guest: Users,
  room: DoorOpen,
  store_item: Package,
  supplier: Truck,
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  booking: 'Reservation',
  guest: 'Guest',
  room: 'Room',
  store_item: 'Item',
  supplier: 'Supplier',
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
  const router = useRouter()

  return (
    <Link
      href={result.href}
      onClick={() => onSelect(result)}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer',
        selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#f9fafb]'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        result.type === 'booking' ? 'bg-[#EFF6FF] text-[#2563EB]' :
        result.type === 'guest' ? 'bg-[#dcfce7] text-[#16a34a]' :
        result.type === 'room' ? 'bg-[#ede9fe] text-[#7c3aed]' :
        result.type === 'supplier' ? 'bg-[#fef3c7] text-[#d97706]' :
        'bg-[#f3f4f6] text-[#6b7280]'
      )}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#111827] truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-[11px] text-[#9ca3af] truncate">{result.subtitle}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-[10px] font-medium text-[#9ca3af] uppercase tracking-wider">{TYPE_LABELS[result.type]}</span>
        {result.meta && <p className="text-[11px] text-[#9ca3af] truncate max-w-[100px]">{result.meta}</p>}
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
  const { data: results = [], isLoading } = useSearch(debouncedQuery, open)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e7eb] rounded-xl shadow-md z-50 overflow-hidden"
    >
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-[#9ca3af]">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[12px]">Searching...</span>
        </div>
      )}

      {showHint && (
        <div className="px-4 py-5 text-center text-[12px] text-[#9ca3af]">
          Type at least 2 characters to search across guests, rooms, reservations, items, and suppliers
        </div>
      )}

      {showEmpty && (
        <div className="px-4 py-5 text-center text-[12px] text-[#9ca3af]">
          No results found for "{debouncedQuery}"
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
        <div className="px-4 py-2 bg-[#f9fafb] border-t border-[#f3f4f6] text-[10px] text-[#9ca3af] flex items-center justify-between">
          <span>{results.length} result{results.length > 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-[#e5e7eb] rounded text-[9px]">↑↓</kbd>
            <span>to navigate</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#e5e7eb] rounded text-[9px] ml-1">↵</kbd>
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
          className="lg:hidden w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-lg text-[#6b7280] transition-colors flex-shrink-0"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[22px] font-bold text-[#111827] truncate">{pageTitle}</h1>
      </div>

      {/* Center: Search Box */}
      <div
        ref={containerRef}
        className="hidden md:flex flex-1 max-w-[360px] mx-5 relative"
      >
        <div
          className={cn(
            'flex items-center gap-2 w-full h-[38px] bg-white border rounded-lg px-3 transition-all',
            searchOpen ? 'border-[#2563EB] ring-2 ring-[#dbeafe]' : 'border-[#e5e7eb] hover:border-[#d1d5db]'
          )}
        >
          <Search size={15} className="text-[#9ca3af] flex-shrink-0" />
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
            placeholder="Search guests, rooms, reservations, items..."
            className="flex-1 bg-transparent text-[13px] text-[#374151] placeholder:text-[#9ca3af] outline-none min-w-0"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="text-[#9ca3af] hover:text-[#6b7280]"
            >
              <X size={13} />
            </button>
          ) : (
            <Mic size={14} className="text-[#9ca3af] flex-shrink-0" />
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
        <button className="w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
          <Moon size={15} />
        </button>

        {/* Notifications */}
        <button className="relative w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ef4444] rounded-full border border-white" />
        </button>

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg h-[34px] px-3">
          <Calendar size={13} className="text-[#6b7280] flex-shrink-0" />
          <span className="text-[12px] font-medium text-[#6b7280] whitespace-nowrap">{dateStr}</span>
        </div>
      </div>
    </header>
  )
}
