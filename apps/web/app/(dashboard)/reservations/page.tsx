'use client'

import { useState } from 'react'
import { useBookings, useBookingStats } from '@/hooks/useBookings'
import { BOOKING_STATUS_CONFIG, Booking } from '@/types/booking'
import { format } from 'date-fns'
import BookingDetailModal from '@/components/reservations/BookingDetailModal'
import NewBookingModal from '@/components/reservations/NewBookingModal'
import { cn } from '@/lib/utils'
import { Search, Plus, ChevronLeft, ChevronRight, Settings, ChevronDown } from 'lucide-react'

// ─── Sparkline mini SVG ───────────────────────────────────────
function Sparkline({ up, color }: { up: boolean, color?: string }) {
  const upPoints = "0,28 20,18 40,22 60,10 80,16 100,8"
  const downPoints = "0,8 20,16 40,12 60,22 80,18 100,28"
  return (
    <svg viewBox="0 0 100 36" className="w-full mt-[6px]" style={{ height: 36 }}>
      <polyline
        points={up ? upPoints : downPoints}
        fill="none"
        stroke={color || (up ? '#22c55e' : '#ef4444')}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)

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
    <div className="space-y-[20px]">

      {/* ── Tabs + New Booking Button ─────────────────────── */}
      <div className="flex items-center gap-[4px]">
        {[
          { id: 'all', label: 'All reservation', icon: '📋' },
          { id: 'online', label: 'Online reservation', icon: '💻' },
          { id: 'direct', label: 'Direct reservation', icon: '📅' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1) }}
            className={cn(
              'px-[14px] py-[7px] rounded-[8px] text-[12px] font-medium flex items-center gap-[6px] border border-transparent transition-all',
              activeTab === tab.id
                ? 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]'
                : 'text-[#9ca3af] hover:bg-[#f3f4f6]'
            )}
          >
            <span className="text-[13px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="ml-auto bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] px-[16px] py-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors"
        >
          <Plus size={14} />
          New booking
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px_18px]">
          <p className="text-[11px] font-medium text-[#9ca3af] mb-[8px]">Total Checkin</p>
          <div className="text-[28px] font-bold text-[#111827] flex items-center gap-[8px] mb-[6px]">
            {bookingStats?.checkInsToday ?? 32} <span className="text-[13px]">🔔</span>
          </div>
          <p className="text-[10px] bg-[#eff6ff] text-[#2563eb] px-[8px] py-[3px] rounded-[4px] font-bold inline-block">
            From Jan 01, 2026 - April 30, 2026
          </p>
          <Sparkline up={true} />
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px_18px]">
          <p className="text-[11px] font-medium text-[#9ca3af] mb-[8px]">Total Checkout</p>
          <div className="text-[28px] font-bold text-[#111827] flex items-center gap-[8px] mb-[6px]">
            {bookingStats?.checkOutsToday ?? 24} <span className="text-[13px]">🔄</span>
          </div>
          <p className="text-[10px] text-[#6b7280] mt-[4px]">From Jan 01, 2026 - April 30, 2026</p>
          <Sparkline up={false} />
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px_18px]">
          <p className="text-[11px] font-medium text-[#9ca3af] mb-[8px]">Total Guest</p>
          <div className="text-[28px] font-bold text-[#111827] flex items-center gap-[8px] mb-[6px]">
            {bookingStats?.totalActive ?? 24} <span className="text-[13px]">👤</span>
          </div>
          <p className="text-[10px] text-[#6b7280] mt-[4px]">From Jan 01, 2026 - April 30, 2026</p>
          <Sparkline up={true} />
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px_18px]">
          <p className="text-[11px] font-medium text-[#9ca3af] mb-[8px]">Occupancy Rate</p>
          <div className="text-[28px] font-bold text-[#111827] flex items-center gap-[8px] mb-[6px]">
            {bookingStats?.pendingCount ?? 24} <span className="text-[13px]">🏠</span>
          </div>
          <p className="text-[10px] text-[#6b7280] mt-[4px]">From Jan 01, 2026 - April 30, 2026</p>
          <Sparkline up={false} />
        </div>
      </div>

      {/* ── Booking List Card ─────────────────────────────── */}
      <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden p-[16px]">
        <div className="flex items-center justify-between mb-[14px]">
          <h2 className="text-[18px] font-bold text-[#111827]">Booking list</h2>
          <div className="flex items-center gap-[10px]">
            <div className="flex items-center gap-[8px] bg-white border border-[#e5e7eb] rounded-[8px] px-[12px] py-[7px] min-w-[180px]">
              <Search size={14} className="text-[#9ca3af]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search.."
                className="bg-transparent text-[12px] text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
              />
              <Settings size={12} className="ml-auto text-[#9ca3af] cursor-pointer" />
            </div>
            <button className="flex items-center gap-1.5 px-[12px] py-[7px] bg-white border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium text-[#6b7280]">
              4th floor <ChevronDown size={12} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                {[
                  'Full name', 'Order No.', 'Room', 'Check in', 'Day',
                  'Guests', 'Origins', 'Status'
                ].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider p-[8px_12px]">
                    <div className="flex items-center gap-[4px]">
                      {h} <span className="text-[9px] text-[#9ca3af]">↕</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="p-[14px_12px]"><div className="h-4 bg-[#f3f4f6] animate-pulse rounded" /></td></tr>
                  ))
                : bookings.map((booking: Booking) => {
                    const status = booking.status
                    const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)
                    
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="hover:bg-[#f3f4f6] cursor-pointer transition-colors"
                      >
                        <td className="p-[14px_12px] text-[13px] font-semibold text-[#111827]">
                          {booking.guest.fullName}
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280]">
                          {booking.bookingRef}
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280]">
                          {booking.room.type}
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280] whitespace-nowrap">
                          {format(new Date(booking.checkIn), 'EEE, dd MMM')}
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280]">
                          {nights}D {nights - 1}N
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280]">
                          {booking.adults + booking.children} Guests
                        </td>
                        <td className="p-[14px_12px] text-[13px] text-[#6b7280]">
                          {booking.guest.nationality || '—'}
                        </td>
                        <td className="p-[14px_12px]">
                          <span className={cn(
                            'inline-flex items-center px-[10px] py-[4px] rounded-[6px] font-semibold text-[11px]',
                            status === 'checked_in' ? 'bg-[#dbeafe] text-[#2563eb]' :
                            status === 'confirmed' ? 'bg-[#1a2b4a] text-white' :
                            status === 'late_checkout' ? 'bg-[#fee2e2] text-[#ef4444]' :
                            status === 'pending' ? 'bg-[#fef9c3] text-[#854d0e]' :
                            'bg-[#f3f4f6] text-[#6b7280]'
                          )}>
                            {BOOKING_STATUS_CONFIG[status].label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-[16px] px-[12px]">
          <p className="text-[11px] text-[#9ca3af] font-medium">
            Showing {bookings.length} of {meta.total} results
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#9ca3af] hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-[#6b7280] font-medium">
              {page} / {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#9ca3af] hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

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
