'use client'

import { useState, useEffect } from 'react'
import {
  useBookings, useBookingStats,
  useCancelBooking, useConfirmPayment,
  useCheckIn, useCheckOut
} from '@/hooks/useBookings'
import { useOccupancyReport } from '@/hooks/useReports'
import { BOOKING_STATUS_CONFIG, Booking } from '@/types/booking'
import { format } from 'date-fns'
import { formatDate, formatTZS } from '@/lib/formatters'
import NewBookingModal from '@/components/reservations/NewBookingModal'
import RecordPaymentModal from '@/components/payments/RecordPaymentModal'
import { cn } from '@/lib/utils'
import { Search, Plus, ChevronLeft, ChevronRight, Settings, ChevronDown, CreditCard, LogIn, LogOut, Printer, CheckCircle, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

// ─── Booking Detail Modal ──────────────────────────────
function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { mutate: cancel,   isPending: cancelling }  = useCancelBooking()
  const { mutate: confirmPayment, isPending: confirmingPayment } = useConfirmPayment()
  const { mutate: checkIn, isPending: checkingIn } = useCheckIn()
  const { mutate: checkOut, isPending: checkingOut } = useCheckOut()

  const [confirmCancel, setConfirmCancel] = useState(false)
  const [checkoutDone, setCheckoutDone] = useState(false)
  const [invoiceSent, setInvoiceSent] = useState(false)
  const [invoiceEmail, setInvoiceEmail] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [confirmCheckIn, setConfirmCheckIn] = useState(false)

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  )

  const handleCancel = () => {
    cancel({ id: booking.id, reason: 'Imefutwa na staff' }, {
      onSuccess: () => {
        toast.success('Booking imefutwa')
        onClose()
      }
    })
  }

  const handleConfirmPayment = () => {
    confirmPayment({ id: booking.id, method: 'cash' }, {
      onSuccess: (data) => {
        toast.success(data?.message || 'Malipo yamethibitishwa na invoice imetumwa')
        onClose()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kuthibitisha malipo')
      }
    })
  }

  const handleCheckIn = () => {
    if (Number(booking.balanceDue) > 0 && !confirmCheckIn) {
      setConfirmCheckIn(true)
      return
    }
    setConfirmCheckIn(false)
    checkIn(booking.id, {
      onSuccess: () => {
        toast.success('Mgeni amewasili (checked in)')
        onClose()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kufanya check-in')
      }
    })
  }

  const handleCheckOut = () => {
    checkOut(booking.id, {
      onSuccess: (data) => {
        setCheckoutDone(true)
        setInvoiceSent(data?.invoiceSent || false)
        setInvoiceEmail(data?.invoiceEmail || null)
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kufanya check-out')
      }
    })
  }

  const handlePrintInvoice = async () => {
    try {
      const res = await api.get(`/pos/invoice/${booking.id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Imeshindwa kupata invoice')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="relative bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden shadow-modal">

          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-0 font-sans text-left">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">{booking.bookingRef}</h2>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-bold",
                  BOOKING_STATUS_CONFIG[booking.status].bgClass,
                  BOOKING_STATUS_CONFIG[booking.status].textClass
                )}>
                  {BOOKING_STATUS_CONFIG[booking.status].label}
                </span>
              </div>
              <p className="text-[13px] text-[#9ca3af] font-medium">
                {booking.guest.fullName} · Room {booking.room.roomNumber}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-subtle text-[#9ca3af] text-lg mt-1">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4 font-sans text-left overflow-y-auto flex-1">
            {checkoutDone ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-green-600"/>
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#111827]">Guest Checked Out</h3>
                  <p className="text-[13px] text-[#6b7280] mt-1">{booking.guest.fullName} · Room {booking.room.roomNumber}</p>
                  {invoiceSent ? (
                    <p className="text-[13px] text-green-600 mt-2">Invoice imetumwa kwa {invoiceEmail}</p>
                  ) : (
                    <p className="text-[13px] text-amber-600 mt-2">Mgeni hana email. Tumia Print Invoice.</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handlePrintInvoice}
                    className="flex-1 py-2.5 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
                    <Printer size={15}/> Print Invoice
                  </button>
                  <button onClick={onClose}
                    className="flex-1 py-2.5 border border-border text-[#6b7280] rounded-xl text-[13px] font-bold hover:bg-subtle transition-all">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Booking Type', value: booking.bookingType === 'company' ? `🏢 Company${booking.company ? ` — ${booking.company.name}` : ''}` : '👤 Individual' },
                { label:'Check In',   value: formatDate(booking.checkIn) },
                { label:'Check Out',  value: formatDate(booking.checkOut) },
                { label:'Nights Stay', value: `${nights} nights` },
                { label:'Guests Count', value: `${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}` },
                { label:'Primary Guest', value: booking.guest.fullName },
                { label:'Room Total', value: formatTZS(booking.roomTotal) },
                { label:'Balance Due',value: formatTZS(booking.balanceDue) },
              ].map(item => (
                <div key={item.label} className="bg-subtle/50 rounded-xl px-4 py-2.5 border border-border/30">
                  <p className="text-[10px] text-[#9ca3af] font-medium uppercase tracking-widest">{item.label}</p>
                  <p className="text-[14px] font-bold text-[#111827] mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Registered Guests */}
            {booking.guests && booking.guests.length > 0 && (
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider">Registered Guests</p>
                  <span className="text-[10px] font-bold text-[#8b4530] bg-[#fbf1ea] px-2 py-1 rounded-full border border-[#f5dfce]">
                    {booking.adults} Adults · {booking.children} Children
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {booking.guests.map((g: any, idx: number) => (
                    <div
                      key={g.id || idx}
                      className="bg-white rounded-xl p-4 border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fbf1ea] to-[#f5dfce] text-[#8b4530] flex items-center justify-center font-bold text-sm shrink-0 border border-[#f5dfce]">
                            {g.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13px] font-bold text-[#111827]">{g.fullName}</p>
                              {g.isPrimary && (
                                <span className="text-[9px] font-bold text-[#8b4530] bg-[#fbf1ea] px-1.5 py-0.5 rounded border border-[#f5dfce]">
                                  Primary
                                </span>
                              )}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${g.ageCategory === 'adult' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                {g.ageCategory}
                              </span>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              {g.phone && <p className="text-[11px] text-[#6b7280]">📞 {g.phone}</p>}
                              {g.email && <p className="text-[11px] text-[#6b7280]">✉️ {g.email}</p>}
                              {(g.nationality || g.idType) && (
                                <p className="text-[11px] text-[#6b7280]">
                                  🆔 {g.nationality || '—'}
                                  {g.idType && (
                                    <span className="ml-1.5 text-[#9ca3af]">
                                      · {g.idType.replace(/_/g, ' ')} {g.idNumber ? `· ${g.idNumber}` : ''}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments History */}
            {booking.payments && booking.payments.length > 0 && (
              <div className="border-t border-border/50 pt-4">
                <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider mb-2.5 px-1">Payment History</p>
                <div className="space-y-2">
                  {booking.payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-[12px] bg-subtle/30 p-2.5 px-4 rounded-xl border border-border/20">
                      <span className="text-[#6b7280] font-medium">{p.method.replace('_',' ')}</span>
                      <span className="font-bold text-[#111827]">{formatTZS(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special requests */}
            {booking.specialRequests && (
              <div className="bg-[#fff7ed] border border-orange-100 rounded-xl px-4 py-3">
                <p className="text-[11px] text-orange-600 font-bold uppercase tracking-wider mb-1">Special Requests</p>
                <p className="text-[12px] text-[#4b5563] font-medium leading-relaxed">{booking.specialRequests}</p>
              </div>
            )}

            {/* Cancel confirmation */}
            {confirmCancel && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 space-y-3">
                <p className="text-[13px] font-bold text-red-700">
                  Are you sure you want to cancel this booking?
                </p>
                <div className="flex gap-2">
                  <button onClick={handleCancel} disabled={cancelling}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[12px] font-bold hover:bg-red-700 shadow-sm transition-all">
                    {cancelling ? 'Inafuta...' : 'Yes, Cancel'}
                  </button>
                  <button onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-[12px] font-bold hover:bg-white transition-all">
                    No, keep it
                  </button>
                </div>
              </div>
            )}

            {/* Check-in with balance warning */}
            {confirmCheckIn && Number(booking.balanceDue) > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 space-y-3">
                <p className="text-[13px] font-bold text-amber-700">
                  Mgeni hajalipa {formatTZS(booking.balanceDue)}. Unataka kumcheck in bila malipo?
                </p>
                <div className="flex gap-2">
                  <button onClick={handleCheckIn} disabled={checkingIn}
                    className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-[12px] font-bold hover:bg-amber-700 shadow-sm transition-all">
                    {checkingIn ? 'Inaingiza...' : 'Ndiyo, Check In'}
                  </button>
                  <button onClick={() => { setConfirmCheckIn(false); setShowPaymentModal(true) }}
                    className="flex-1 py-2.5 border border-amber-200 text-amber-600 rounded-xl text-[12px] font-bold hover:bg-white transition-all">
                    Record Payment
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!confirmCancel && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  {booking.status === 'pending' && Number(booking.balanceDue) > 0 && (
                    <button onClick={handleConfirmPayment} disabled={confirmingPayment}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[13px] font-bold transition-all shadow-md shadow-green-100/50 flex items-center justify-center gap-2 min-w-[140px]">
                      <CreditCard size={15} />
                      {confirmingPayment ? 'Processing...' : 'Confirm Payment & Invoice'}
                    </button>
                  )}

                  {Number(booking.balanceDue) > 0 && ['pending','confirmed','checked_in'].includes(booking.status) && (
                    <button onClick={() => setShowPaymentModal(true)}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold transition-all shadow-md shadow-blue-100/50 flex items-center justify-center gap-2 min-w-[120px]">
                      <Wallet size={15} />
                      Record Payment
                    </button>
                  )}

                  {['pending','confirmed'].includes(booking.status) && !confirmCheckIn && (
                    <button onClick={handleCheckIn} disabled={checkingIn}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold transition-all shadow-md shadow-blue-100/50 flex items-center justify-center gap-2 min-w-[100px]">
                      <LogIn size={15} />
                      {checkingIn ? 'Checking in...' : 'Check In'}
                    </button>
                  )}

                  {booking.status === 'checked_in' && (
                    <button onClick={handleCheckOut} disabled={checkingOut}
                      className="flex-1 py-3 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-xl text-[13px] font-bold transition-all shadow-md shadow-blue-100/50 flex items-center justify-center gap-2">
                      <LogOut size={15} />
                      {checkingOut ? 'Checking out...' : 'Check Out'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {['pending','confirmed'].includes(booking.status) && (
                    <button onClick={() => setConfirmCancel(true)}
                      className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-[13px] font-bold hover:bg-red-50 transition-all">
                      Cancel Booking
                    </button>
                  )}

                  <button onClick={onClose}
                    className="flex-1 py-3 border border-border text-[#6b7280] rounded-xl text-[13px] font-bold hover:bg-subtle transition-all">
                    Close
                  </button>
                </div>
              </div>
            )}
              </>)}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <RecordPaymentModal
          booking={booking}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

    </>
  )
}

// ─── Real Sparkline Component ───────────────────────────
function RealSparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-[36px] w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)

  const { data: bookingStats, isLoading: statsLoading } = useBookingStats()
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
    source: activeTab === 'all' ? undefined : (activeTab === 'online' ? 'online_self' : 'direct'),
    search,
    page,
    limit: 10
  })
  const { data: occupancyTrend = [] } = useOccupancyReport(7)

  // Sync selected booking with fresh list data (e.g. after payment)
  useEffect(() => {
    if (selectedBooking && bookingsData?.data) {
      const updated = bookingsData.data.find((b: Booking) => b.id === selectedBooking.id)
      if (updated && (updated.balanceDue !== selectedBooking.balanceDue || updated.paidAmount !== selectedBooking.paidAmount || updated.status !== selectedBooking.status)) {
        setSelectedBooking(updated)
      }
    }
  }, [bookingsData?.data, selectedBooking])

  const bookings = bookingsData?.data || []
  const meta = bookingsData?.meta || { total: 0, totalPages: 1 }
  const trendData = occupancyTrend.map((d: any) => ({ val: d.count }))

  return (
    <div className="space-y-4 font-sans text-left">

      {/* Topbar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
           <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">📅 Reservations</h1>
           <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Manage all guest bookings</p>
        </div>
        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
        >
          <Plus size={16} />
          ➕ New booking
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4">
        {[
          { id: 'all', label: 'All Reservation', icon: '📋', count: bookingStats?.allCount },
          { id: 'online', label: 'Online Reservation', icon: '💻', count: bookingStats?.onlineCount },
          { id: 'direct', label: 'Direct Reservation', icon: '📅', count: bookingStats?.directCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1) }}
            className={cn(
              'px-[14px] py-[7px] rounded-xl text-[12px] font-medium flex items-center gap-2 border border-transparent transition-all',
              activeTab === tab.id
                ? 'bg-[#fbf1ea] text-[#8b4530] border-[#f5dfce]'
                : 'text-[#9ca3af] hover:bg-subtle'
            )}
          >
            <span className="text-[14px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === tab.id ? "bg-[#8b4530] text-white" : "bg-subtle text-[#9ca3af]"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {[
          { label: 'Total Checkin', val: bookingStats?.checkInsToday, icon: '🔔', color: '#22c55e', bg: 'bg-green-50' },
          { label: 'Total Checkout', val: bookingStats?.checkOutsToday, icon: '🔄', color: '#ef4444', bg: 'bg-red-50' },
          { label: 'Total Guest', val: bookingStats?.totalActive, icon: '👤', color: '#8b4530', bg: 'bg-blue-50' },
          { label: 'Occupancy Rate', val: bookingStats ? `${Math.round((bookingStats.totalActive / 50) * 100)}%` : null, icon: '🏠', color: '#f59e0b', bg: 'bg-amber-50' },
        ].map((s: any) => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-5 flex flex-col justify-between min-h-[140px]">
            <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider mb-2">{s.label}</p>
            {statsLoading ? (
              <div className="h-8 w-20 bg-subtle animate-pulse rounded" />
            ) : (
              <div className="text-[26px] font-bold text-[#111827] flex items-center gap-2 leading-none tracking-tight">
                {s.val ?? 0} <span className="text-[13px] opacity-30">{s.icon}</span>
              </div>
            )}
            <p className={cn('text-[9px] px-2 py-0.5 rounded-md font-bold inline-block mt-3 w-fit', s.bg, 'text-gray-500 opacity-80 uppercase tracking-tighter')}>
              Past 7 Days Trend
            </p>
            <RealSparkline data={trendData} color={s.color} />
          </div>
        ))}
      </div>

      {/* ── Booking List Card ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden p-5 border border-border/20">
        <div className="flex items-center justify-between mb-5 px-1">
          <div>
             <h2 className="text-[15px] font-bold text-[#111827] tracking-tight">Booking List</h2>
             <p className="text-[11px] text-[#9ca3af] font-medium mt-0.5">Most recent reservations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 min-w-[200px] focus-within:border-[#8b4530]/50 transition-all">
              <Search size={14} className="text-[#9ca3af]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search guest or ref.."
                className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
              />
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-xl text-[12px] font-semibold text-[#6b7280] hover:bg-subtle transition-all">
              All Floor <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                {[
                  'Full Name', 'Order Ref', 'Room', 'Check In', 'Day',
                  'Guests', 'Origins', 'Status', 'Payment'
                ].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[#9ca3af] uppercase tracking-[0.12em] p-[10px_16px] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {h} <span className="text-[9px] opacity-40">↕</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {bookingsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={9} className="p-4"><div className="h-4 bg-subtle animate-pulse rounded" /></td></tr>
                  ))
                : bookings.map((booking: Booking) => {
                    const status = booking.status
                    const nights = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000)
                    
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="hover:bg-subtle/40 cursor-pointer transition-all group"
                      >
                        <td className="p-[14px_16px] text-[13px] font-bold text-[#111827] group-hover:text-[#8b4530]">
                          <div className="flex flex-col">
                            <span>{booking.guest.fullName}</span>
                            {booking.bookingType === 'company' && booking.company && (
                              <span className="text-[10px] text-blue-600 font-medium">🏢 {booking.company.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#9ca3af] font-medium font-mono">
                          {booking.bookingRef}
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium capitalize">
                          {booking.room.type}
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium whitespace-nowrap">
                          {format(new Date(booking.checkIn), 'dd MMM yyyy')}
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium">
                          {nights}D {nights - 1}N
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium">
                          {booking.adults + booking.children} Guests
                        </td>
                        <td className="p-[14px_16px] text-[12px] text-[#9ca3af] font-medium">
                          {booking.guest.nationality || '—'}
                        </td>
                        <td className="p-[14px_16px]">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm border border-white/20',
                            BOOKING_STATUS_CONFIG[status].bgClass,
                            BOOKING_STATUS_CONFIG[status].textClass
                          )}>
                            {BOOKING_STATUS_CONFIG[status].label}
                          </span>
                        </td>
                        <td className="p-[14px_16px]">
                          {Number(booking.balanceDue) > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm border border-white/20 bg-red-50 text-red-700">
                              Unpaid {formatTZS(booking.balanceDue)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm border border-white/20 bg-green-50 text-green-700">
                              Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
              }
              {!bookingsLoading && bookings.length === 0 && (
                <tr><td colSpan={9} className="py-20 text-center text-[#9ca3af] text-[11px] font-medium uppercase tracking-widest italic">No results found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-5 px-2">
          <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider">
            Showing {bookings.length} of {meta.total} results
          </p>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#8b4530] disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[12px] text-[#6b7280] font-bold">
              {page} <span className="text-border mx-1">/</span> {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#8b4530] disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight size={16} />
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
