'use client'

import { useState, useRef, useMemo } from 'react'
import { useAllPayments, usePaymentStats, Payment } from '@/hooks/usePayments'
import { formatDate, formatTZS } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  Search, ChevronLeft, ChevronRight, Banknote, CreditCard, Smartphone,
  Wallet, Printer, Calendar, TrendingUp, TrendingDown, Clock, AlertCircle,
  RotateCcw, Download, PieChart as PieChartIcon
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns'

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Wallet size={14} />,
  mpesa: <Smartphone size={14} />,
  tigo_pesa: <Smartphone size={14} />,
  airtel_money: <Smartphone size={14} />,
  halo_pesa: <Smartphone size={14} />,
  bank_transfer: <Banknote size={14} />,
  visa: <CreditCard size={14} />,
  mastercard: <CreditCard size={14} />,
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-100',
  completed:'bg-green-50 text-green-700 border-green-100',
  failed:   'bg-red-50 text-red-700 border-red-100',
  refunded: 'bg-gray-100 text-gray-600 border-gray-200',
  partial:  'bg-blue-50 text-blue-700 border-blue-100'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
  partial: 'Partial'
}

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

export default function PaymentsPage() {
  const printRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | ''>('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const activeFilters = useMemo(() => {
    const base: any = { status: status || undefined, search: search || undefined, page, limit: 15 }
    if (period === 'custom') {
      base.dateFrom = dateFrom || undefined
      base.dateTo = dateTo || undefined
    } else {
      base.period = period || undefined
    }
    return base
  }, [status, search, page, period, dateFrom, dateTo])

  const statsFilters = useMemo(() => {
    if (period === 'custom') {
      return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    }
    return { period: period || undefined }
  }, [period, dateFrom, dateTo])

  const { data, isLoading } = useAllPayments(activeFilters)
  const { data: stats, isLoading: statsLoading } = usePaymentStats(statsFilters)

  const payments = data?.data || []
  const meta = data?.meta || { total: 0, totalPages: 1 }

  const handlePeriodChange = (p: 'today' | 'week' | 'month' | 'year' | 'custom') => {
    setPeriod(p)
    setPage(1)
    if (p === 'custom') {
      const today = format(new Date(), 'yyyy-MM-dd')
      setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
      setDateTo(today)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const methodChartData = useMemo(() => {
    if (!stats?.methodBreakdown) return []
    return Object.entries(stats.methodBreakdown).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').toUpperCase(),
      value: Number(value)
    }))
  }, [stats])

  const trendData = useMemo(() => {
    if (!stats?.trend) return []
    return stats.trend.map((d: any) => ({
      date: format(new Date(d.date), 'dd MMM'),
      amount: Number(d.amount)
    }))
  }, [stats])

  const kpis = [
    {
      label: 'Total Collected',
      value: stats?.completedAmount ?? 0,
      count: stats?.completedCount ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100'
    },
    {
      label: 'Pending Payments',
      value: stats?.pendingAmount ?? 0,
      count: stats?.pendingCount ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    {
      label: 'Failed Payments',
      value: stats?.failedAmount ?? 0,
      count: stats?.failedCount ?? 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100'
    },
    {
      label: 'Refunded',
      value: stats?.refundedAmount ?? 0,
      count: stats?.refundedCount ?? 0,
      icon: RotateCcw,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      border: 'border-gray-200'
    },
    {
      label: 'Total Transactions',
      value: stats?.totalAmount ?? 0,
      count: stats?.totalTransactions ?? 0,
      icon: Banknote,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    }
  ]

  return (
    <div className="space-y-5 font-sans text-left print:p-0" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 no-print">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Payments</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Track, filter and analyze all payments</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold transition-all shadow-lg shadow-gray-200"
        >
          <Printer size={16} /> Print Report
        </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payments Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Period: {period === 'custom' ? `${dateFrom} - ${dateTo}` : period || 'All time'}
        </p>
        <p className="text-sm text-gray-500">Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              'bg-white rounded-xl p-4 border shadow-sm transition-all hover:shadow-md',
              kpi.border
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', kpi.bg, kpi.color)}>
                <kpi.icon size={18} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                {kpi.count} txns
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</p>
            {statsLoading ? (
              <div className="h-7 w-24 bg-gray-100 animate-pulse rounded mt-1" />
            ) : (
              <p className={cn('text-[20px] font-bold mt-1 tracking-tight', kpi.color)}>
                {formatTZS(kpi.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 no-print">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#111827]">Payment Trend</h3>
              <p className="text-[11px] text-[#9ca3af] font-medium">Daily collected amount</p>
            </div>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="h-[240px]">
            {statsLoading ? (
              <div className="h-full bg-gray-50 animate-pulse rounded-xl" />
            ) : trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No payment data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: any) => [formatTZS(v), 'Amount']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#111827]">Payment Methods</h3>
              <p className="text-[11px] text-[#9ca3af] font-medium">By amount</p>
            </div>
            <PieChartIcon size={16} className="text-blue-600" />
          </div>
          <div className="h-[240px]">
            {statsLoading ? (
              <div className="h-full bg-gray-50 animate-pulse rounded-xl" />
            ) : methodChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {methodChartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Tooltip formatter={(v: any) => [formatTZS(v), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4 border border-border/20 flex flex-col lg:flex-row gap-3 no-print">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-[12px] font-bold transition-all border',
                period === p.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="bg-subtle/50 border border-border rounded-xl px-3 py-2 text-[12px] font-medium text-[#6b7280] outline-none focus:border-[#2563eb]/50"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="bg-subtle/50 border border-border rounded-xl px-3 py-2 text-[12px] font-medium text-[#6b7280] outline-none focus:border-[#2563eb]/50"
            />
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 min-w-[200px] focus-within:border-[#2563eb]/50 transition-all">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search ref, guest, company..."
            className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="bg-subtle/50 border border-border rounded-xl px-4 py-2 text-[12px] font-medium text-[#6b7280] outline-none focus:border-[#2563eb]/50"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-border/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50 bg-gray-50/50">
                {['Date', 'Booking Ref', 'Guest / Company', 'Method', 'Received By', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.12em] p-[12px_16px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-4"><div className="h-4 bg-subtle animate-pulse rounded" /></td></tr>
                  ))
                : payments.map((payment: Payment) => (
                    <tr key={payment.id} className="hover:bg-subtle/40 transition-all group">
                      <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium whitespace-nowrap">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="p-[14px_16px] text-[12px] text-[#9ca3af] font-mono font-medium">
                        {payment.booking?.bookingRef}
                      </td>
                      <td className="p-[14px_16px] text-[13px] font-bold text-[#111827]">
                        {payment.booking?.bookingType === 'company' && payment.booking?.company
                          ? <span className="text-blue-600">🏢 {payment.booking.company.name}</span>
                          : payment.booking?.guest?.fullName
                        }
                      </td>
                      <td className="p-[14px_16px]">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6b7280] capitalize">
                          {METHOD_ICONS[payment.method] || <Wallet size={14} />}
                          {payment.method.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium">
                        {payment.receivedBy?.fullName || '—'}
                      </td>
                      <td className="p-[14px_16px] text-[13px] font-bold text-[#111827]">
                        {formatTZS(payment.amount)}
                      </td>
                      <td className="p-[14px_16px]">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border',
                          STATUS_STYLES[payment.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                        )}>
                          {STATUS_LABELS[payment.status] || payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              {!isLoading && payments.length === 0 && (
                <tr><td colSpan={7} className="py-20 text-center text-[#9ca3af] text-[11px] font-medium uppercase tracking-widest italic">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border/50 no-print">
          <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider">
            Showing {payments.length} of {meta.total} results
          </p>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#2563eb] disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[12px] text-[#6b7280] font-bold">
              {page} <span className="text-border mx-1">/</span> {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#2563eb] disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-8 border-t">
        <p>StayFlow Hotel Management System</p>
        <p>End of Report</p>
      </div>
    </div>
  )
}
