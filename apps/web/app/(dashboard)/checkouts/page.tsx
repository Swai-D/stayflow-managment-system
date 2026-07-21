'use client'

import { useState } from 'react'
import { useTodayCheckouts, useCheckOutBooking, useExtendStay } from '@/hooks/useCheckouts'
import { format, parseISO, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  LogOut, AlertCircle, CheckCircle, Clock, Calendar, BedDouble,
  CreditCard, Mail, ChevronRight, ChevronLeft, RotateCcw,
  ArrowRightLeft, User, Phone, Plus, X, FileText, Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'

const TABS = [
  { key: 'due', label: 'Due Today', icon: Clock, color: 'bg-[#8b4530]' },
  { key: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'bg-[#ef4444]' },
  { key: 'done', label: 'Checked Out', icon: CheckCircle, color: 'bg-[#22c55e]' },
]

export default function CheckoutsPage() {
  const [activeTab, setActiveTab] = useState<'due' | 'overdue' | 'done'>('due')
  const [search, setSearch] = useState('')
  const [extendModal, setExtendModal] = useState<any>(null)
  const [extraNights, setExtraNights] = useState(1)
  const [extendReason, setExtendReason] = useState('')

  const { data, isLoading, refetch } = useTodayCheckouts()
  const checkOutMutation = useCheckOutBooking()
  const extendMutation = useExtendStay()

  const summary = data?.summary || { dueTodayCount: 0, overdueCount: 0, checkedOutTodayCount: 0, pendingInvoiceCount: 0 }
  const list = activeTab === 'due' ? (data?.dueToday || []) :
               activeTab === 'overdue' ? (data?.overdue || []) :
               (data?.checkedOutToday || [])

  const filtered = list.filter((b: any) =>
    (b.guest?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.bookingRef || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.room?.roomNumber || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCheckOut = async (id: string) => {
    try {
      await checkOutMutation.mutateAsync({ id, sendInvoice: true })
      toast.success('Check-out completed and invoice generated')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Check-out failed')
    }
  }

  const handleExtend = async () => {
    if (!extendModal) return
    try {
      await extendMutation.mutateAsync({
        id: extendModal.id,
        extraNights: Number(extraNights),
        reason: extendReason
      })
      toast.success(`Stay extended by ${extraNights} night(s)`)
      setExtendModal(null)
      setExtraNights(1)
      setExtendReason('')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Extension failed')
    }
  }

  const StatCard = ({ label, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-4 hover:shadow-md transition-all">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm', color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider">{label}</p>
        {isLoading ? (
          <div className="h-6 w-12 bg-[#f3f4f6] animate-pulse rounded mt-1" />
        ) : (
          <p className="text-[22px] font-bold text-[#111827] leading-tight">{value}</p>
        )}
        {sub && <p className="text-[10px] text-[#6b7280] mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">🧳 Checkout Management</h1>
          <p className="text-[12px] text-[#9ca3af] font-medium mt-0.5">
            Track today’s checkouts, overdue guests, invoices and extensions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[12px] font-semibold text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
          >
            <RotateCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Due Today" value={summary.dueTodayCount} icon={Clock} color="bg-[#8b4530]" />
        <StatCard label="Overdue" value={summary.overdueCount} icon={AlertCircle} color="bg-[#ef4444]" />
        <StatCard label="Checked Out" value={summary.checkedOutTodayCount} icon={CheckCircle} color="bg-[#22c55e]" />
        <StatCard label="Pending Invoices" value={summary.pendingInvoiceCount} icon={FileText} color="bg-[#f59e0b]" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-card p-1.5 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'due' ? summary.dueTodayCount :
                        tab.key === 'overdue' ? summary.overdueCount :
                        summary.checkedOutTodayCount
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all',
                activeTab === tab.key
                  ? 'bg-[#FBF1EA] text-[#8B4530]'
                  : 'text-[#6b7280] hover:bg-[#f9fafb]'
              )}
            >
              <Icon size={15} />
              {tab.label}
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-[#8B4530] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="relative w-full md:w-96">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, booking ref or room..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[13px] outline-none focus:border-[#8B4530] focus:ring-[3px] focus:ring-[#f5dfce] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Guest</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Room</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Check Out</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Nights</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Total / Balance</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Invoice</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Status</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-20 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#9ca3af]">
                    <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No {activeTab} checkouts</p>
                  </td>
                </tr>
              ) : (
                filtered.map((booking: any) => (
                  <CheckoutRow
                    key={booking.id}
                    booking={booking}
                    activeTab={activeTab}
                    onCheckOut={handleCheckOut}
                    onExtend={setExtendModal}
                    isCheckingOut={checkOutMutation.isPending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Modal */}
      {extendModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExtendModal(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-[#111827]">Extend Stay</h3>
              <button onClick={() => setExtendModal(null)} className="text-[#9ca3af] hover:text-[#111827]"><X size={18} /></button>
            </div>
            <p className="text-[12px] text-[#6b7280] mb-4">
              Extend stay for <span className="font-semibold text-[#111827]">{extendModal.guest?.fullName}</span> in room{' '}
              <span className="font-semibold text-[#111827]">{extendModal.room?.roomNumber}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Extra Nights</label>
                <input
                  type="number"
                  min={1}
                  value={extraNights}
                  onChange={(e) => setExtraNights(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-[13px] outline-none focus:border-[#8B4530] focus:ring-[3px] focus:ring-[#f5dfce]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5 block">Reason (optional)</label>
                <textarea
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-[13px] outline-none focus:border-[#8B4530] focus:ring-[3px] focus:ring-[#f5dfce] resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setExtendModal(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleExtend} disabled={extendMutation.isPending}>
                  {extendMutation.isPending ? 'Extending...' : 'Extend Stay'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckoutRow({ booking, activeTab, onCheckOut, onExtend, isCheckingOut }: any) {
  const invoice = booking.invoices?.[0]
  const total = Number(booking.totalAmount || 0)
  const paid = Number(booking.paidAmount || 0)
  const balance = Number(booking.balanceDue || 0)
  const nights = differenceInDays(parseISO(booking.checkOut), parseISO(booking.checkIn))

  const statusBadge = () => {
    if (booking.status === 'checked_out') return <Badge variant="success">Checked Out</Badge>
    if (booking.status === 'late_checkout') return <Badge variant="destructive">Late Checkout</Badge>
    return <Badge variant="info">Checked In</Badge>
  }

  return (
    <tr className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B4530] flex items-center justify-center text-white text-[11px] font-bold">
            {booking.guest?.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-semibold text-[#111827]">{booking.guest?.fullName}</p>
            <p className="text-[10px] text-[#9ca3af]">{booking.bookingRef}</p>
          </div>
        </div>
      </td>
      <td className="p-3 text-[#6b7280]">{booking.room?.roomNumber}</td>
      <td className="p-3 text-[#6b7280]">{format(parseISO(booking.checkOut), 'dd MMM yyyy')}</td>
      <td className="p-3 text-[#6b7280]">{nights}</td>
      <td className="p-3">
        <div className="text-[#111827] font-medium">TZS {total.toLocaleString()}</div>
        {balance > 0 && <div className="text-[10px] text-[#ef4444] font-semibold">Due: TZS {balance.toLocaleString()}</div>}
        {balance <= 0 && <div className="text-[10px] text-[#22c55e] font-semibold">Paid</div>}
      </td>
      <td className="p-3">
        {invoice ? (
          <div>
            <Badge
              variant={invoice.status === 'paid' ? 'success' : invoice.status === 'sent' ? 'warning' : 'secondary'}
            >
              {invoice.status}
            </Badge>
            <p className="text-[10px] text-[#9ca3af] mt-0.5">{invoice.invoiceNumber}</p>
          </div>
        ) : (
          <span className="text-[#9ca3af]">-</span>
        )}
      </td>
      <td className="p-3">{statusBadge()}</td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          {activeTab !== 'done' && (
            <>
              <button
                onClick={() => onCheckOut(booking.id)}
                disabled={isCheckingOut}
                className="px-2.5 py-1.5 bg-[#8B4530] text-white rounded-lg text-[11px] font-semibold hover:bg-[#6e3323] transition-colors disabled:opacity-50"
              >
                Check Out
              </button>
              <button
                onClick={() => onExtend(booking)}
                className="px-2.5 py-1.5 bg-white border border-[#e5e7eb] text-[#6b7280] rounded-lg text-[11px] font-semibold hover:bg-[#f9fafb] hover:text-[#111827] transition-colors"
              >
                Extend
              </button>
            </>
          )}
          {invoice && (
            <Link
              href={`/invoices?search=${invoice.invoiceNumber}`}
              className="px-2.5 py-1.5 bg-[#FBF1EA] text-[#8B4530] rounded-lg text-[11px] font-semibold hover:bg-[#f5dfce] transition-colors"
            >
              Invoice
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}
