'use client'

import { useState } from 'react'
import { useBookings, useBookingStats } from '@/hooks/useBookings'
import { BOOKING_STATUS_CONFIG, BookingStatus, Booking } from '@/types/booking'
import { format } from 'date-fns'
import BookingDetailModal from '@/components/reservations/BookingDetailModal'
import NewBookingModal from '@/components/reservations/NewBookingModal'
import { cn } from '@/lib/utils'
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Sparkline mini SVG ───────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 100 36" className="w-full mt-2" style={{ height: 36 }}>
      <polyline
        points={up
          ? "0,28 20,18 40,22 60,10 80,16 100,8"
          : "0,8 20,16 40,12 60,22 80,18 100,28"
        }
        fill="none"
        stroke={up ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({ label, value, icon, up }: { label: string; value: number; icon: string; up: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-[24px] font-bold text-gray-900">{value}</span>
        <span className="text-[18px]">{icon}</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">From Jan 01, 2026 – Apr 30, 2026</p>
      <Sparkline up={up} />
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────
const TABS = [
  { id: 'all', label: 'All reservation', icon: '📋' },
  { id: 'online', label: 'Online reservation', icon: '💻' },
  { id: 'direct', label: 'Direct reservation', icon: '📅' },
]

// ─── Main Page ────────────────────────────────────────────────
export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)

  // TODO: replace with useBookingStats() hook — Gemini connects API
  const { data: bookingStats } = useBookingStats()
  const { data: bookingsData, isLoading } = useBookings({
    status: activeTab === 'all' ? undefined : (activeTab === 'online' ? 'pending' : 'confirmed') as any,
    search,
    page,
    limit: 10
  })

  const bookings = bookingsData?.data || []
  const meta = bookingsData?.meta || { total: 0, totalPages: 1 }

  return (
    <div className="space-y-4 py-5">

      {/* ── Tabs + New Booking Button ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-white p-1 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="flex items-center gap-2 h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          New booking
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Check-in" value={bookingStats?.checkInsToday ?? 32} icon="🔔" up />
        <StatCard label="Total Check-out" value={bookingStats?.checkOutsToday ?? 24} icon="🔄" up={false} />
        <StatCard label="Total Guests" value={bookingStats?.totalActive ?? 24} icon="👤" up />
        <StatCard label="Pending Bookings" value={bookingStats?.pendingCount ?? 24} icon="🏠" up={false} />
      </div>

      {/* ── Booking List Card ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        {/* Card header: title + search + filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Booking list</h2>
            <p className="text-[11px] text-gray-400">All reservations at a glance</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-[240px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search bookings..."
                className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 bg-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
              />
            </div>
            <select className="h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-600 bg-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 flex-shrink-0">
              <option>All floors</option>
              <option>4th floor</option>
              <option>3rd floor</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                {[
                  'Full Name', 'Order No.', 'Room', 'Check In', 'Days',
                  'Guests', 'Origin', 'Status'
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-100"
                  >
                    <span className="flex items-center gap-1">
                      {h}
                      <span className="text-[9px] text-gray-300">↕</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : bookings.map((booking) => {
                    const cfg = BOOKING_STATUS_CONFIG[booking.status]
                    const nights = Math.ceil(
                      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
                    )
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                          {booking.guest.fullName}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-500 font-medium whitespace-nowrap">
                          {booking.bookingRef}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                          {booking.room.roomNumber}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                          {format(new Date(booking.checkIn), 'EEE, dd MMM')}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                          {nights}D {nights - 1}N
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                          {booking.adults + booking.children} Guests
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                          {booking.guest.nationality || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                            cfg.bgClass, cfg.textClass
                          )}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
              }
              {!isLoading && bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-[13px] text-gray-400">No reservations found matching your criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400 font-medium">
            Showing {bookings.length} of {meta.total} results
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-gray-600 font-medium px-1">
              {page} / {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {isNewBookingOpen && (
        <NewBookingModal onClose={() => setIsNewBookingOpen(false)} />
      )}
    </div>
  )
}
