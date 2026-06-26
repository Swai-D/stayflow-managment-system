'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useGuests, useGuest, useRegisteredGuests, useGuestStats } from '@/hooks/useGuests'
import { format, parseISO } from 'date-fns'
import {
  Search, User, Phone, Mail, Globe, History, ChevronRight, ChevronLeft, Users, BedDouble, Calendar,
  BadgeInfo, Printer, ArrowUpDown, Download, TrendingUp, RotateCcw, MapPin, Hash,
  Baby, Briefcase, Home, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BOOKING_STATUS_CONFIG } from '@/types/booking'

type SortKey = 'fullName' | 'checkIn' | 'checkOut' | 'status' | 'nationality' | 'ageCategory'
type SortDir = 'asc' | 'desc'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b']

export default function GuestsPage() {
  const [search, setSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [selectedRegisteredGuest, setSelectedRegisteredGuest] = useState<any | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('checkIn')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const tableRef = useRef<HTMLDivElement>(null)

  const { data: guests, isLoading: guestsLoading } = useGuests(search)
  const { data: registeredGuests, isLoading: registeredLoading } = useRegisteredGuests(search)
  const { data: guestDetail, isLoading: detailLoading } = useGuest(selectedGuestId || '')
  const { data: stats, isLoading: statsLoading } = useGuestStats()

  const isLoading = guestsLoading || registeredLoading || statsLoading

  // Combine primary guests and registered guests into one master list
  const allGuests = useMemo(() => {
    const primary = (guests || []).map((g: any) => ({
      ...g,
      source: 'primary' as const,
      ageCategory: 'adult',
      isPrimary: true,
      booking: g.bookings?.[0] || null,
    }))
    const registered = (registeredGuests || []).map((g: any) => ({
      ...g,
      source: 'registered' as const,
    }))
    return [...registered, ...primary.filter((p: any) => !registered.some((r: any) => r.phone && r.phone === p.phone))]
  }, [guests, registeredGuests])

  // Filter + sort
  const filteredGuests = useMemo(() => {
    let data = [...allGuests]

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter((g: any) =>
        (g.fullName || '').toLowerCase().includes(q) ||
        (g.phone || '').toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q) ||
        (g.booking?.bookingRef || '').toLowerCase().includes(q) ||
        (g.booking?.room?.roomNumber || '').toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      data = data.filter((g: any) => g.booking?.status === filterStatus)
    }

    if (filterType !== 'all') {
      data = data.filter((g: any) => (g.ageCategory || 'adult') === filterType)
    }

    return data
  }, [allGuests, search, filterStatus, filterType])

  // Pagination
  const totalPages = Math.ceil(filteredGuests.length / pageSize) || 1
  const paginatedGuests = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredGuests.slice(start, start + pageSize)
  }, [filteredGuests, page, pageSize])

  // Reset to first page when filters/search change
  useEffect(() => {
    setPage(1)
  }, [search, filterStatus, filterType, pageSize])

  const sortedGuests = useMemo(() => {
    const data = [...paginatedGuests]
    data.sort((a: any, b: any) => {
      let aVal: any, bVal: any
      switch (sortKey) {
        case 'fullName':
          aVal = (a.fullName || '').toLowerCase()
          bVal = (b.fullName || '').toLowerCase()
          break
        case 'nationality':
          aVal = (a.nationality || 'Unknown').toLowerCase()
          bVal = (b.nationality || 'Unknown').toLowerCase()
          break
        case 'ageCategory':
          aVal = a.ageCategory || 'adult'
          bVal = b.ageCategory || 'adult'
          break
        case 'status':
          aVal = a.booking?.status || ''
          bVal = b.booking?.status || ''
          break
        case 'checkIn':
        case 'checkOut':
        default:
          aVal = a.booking?.[sortKey] ? new Date(a.booking[sortKey]).getTime() : 0
          bVal = b.booking?.[sortKey] ? new Date(b.booking[sortKey]).getTime() : 0
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return data
  }, [paginatedGuests, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const html = `
      <html><head><title>Guest List - Buffalo Hotel</title>
      <style>
        body { font-family: Inter, sans-serif; font-size: 12px; color: #111827; }
        h2 { margin: 0 0 8px; font-size: 16px; }
        p { margin: 0 0 16px; color: #6b7280; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
        th { font-size: 10px; text-transform: uppercase; color: #9ca3af; background: #f9fafb; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
      </style></head><body>
      <h2>Buffalo Hotel — Guest Directory</h2>
      <p>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} · ${filteredGuests.length} guests</p>
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Phone</th><th>Nationality</th><th>Type</th><th>Booking</th><th>Room</th><th>Check In</th><th>Check Out</th><th>Status</th>
        </tr></thead>
        <tbody>
          ${filteredGuests.map((g: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${g.fullName}</td>
              <td>${g.phone || '-'}</td>
              <td>${g.nationality || 'Unknown'}</td>
              <td>${g.ageCategory || 'adult'}</td>
              <td>${g.booking?.bookingRef || '-'}</td>
              <td>${g.booking?.room?.roomNumber || '-'}</td>
              <td>${g.booking?.checkIn ? format(parseISO(g.booking.checkIn), 'dd MMM yyyy') : '-'}</td>
              <td>${g.booking?.checkOut ? format(parseISO(g.booking.checkOut), 'dd MMM yyyy') : '-'}</td>
              <td>${g.booking?.status ? g.booking.status.replace('_', ' ') : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </body></html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  const monthlyChartData = useMemo(() => {
    if (!stats?.monthlyTrend) return []
    return stats.monthlyTrend.map((d: any) => ({
      label: `${MONTH_NAMES[parseISO(d.month + '-01').getMonth()]} ${parseISO(d.month + '-01').getFullYear().toString().slice(2)}`,
      guests: Number(d.count)
    }))
  }, [stats])

  const nationalityChartData = useMemo(() => {
    if (!stats?.nationalityDistribution) return []
    return stats.nationalityDistribution.map((d: any) => ({
      name: d.nationality || 'Unknown',
      value: Number(d.count)
    }))
  }, [stats])

  const ageChartData = useMemo(() => {
    if (!stats?.ageDistribution) return []
    return stats.ageDistribution.map((d: any) => ({
      name: d.ageCategory === 'adult' ? 'Adults' : 'Children',
      value: d._count.ageCategory
    }))
  }, [stats])

  const typeChartData = useMemo(() => {
    if (!stats?.bookingTypeDistribution) return []
    return stats.bookingTypeDistribution.map((d: any) => ({
      name: d.bookingType === 'individual' ? 'Individual' : 'Company',
      value: d._count.bookingType
    }))
  }, [stats])

  const MetricCard = ({ label, value, subtext, icon: Icon, iconBg, trend }: any) => (
    <div className="bg-white rounded-xl shadow-card p-4 flex flex-col justify-between hover:shadow-md transition-all duration-150 h-full">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-white shadow-sm', iconBg)}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[11px] text-[#9ca3af] font-medium mb-1">{label}</p>
        {statsLoading ? (
          <div className="h-7 w-16 bg-[#f3f4f6] animate-pulse rounded" />
        ) : (
          <div className="text-[24px] font-bold text-[#111827] leading-tight">{value}</div>
        )}
        {subtext && !statsLoading && (
          <p className={cn(
            'text-[10px] font-medium mt-1 flex items-center gap-1',
            trend === 'up' ? 'text-[#22c55e]' : trend === 'down' ? 'text-[#ef4444]' : 'text-[#9ca3af]'
          )}>
            {trend === 'up' && <ArrowUpRight size={10} />}
            {trend === 'down' && <ArrowDownRight size={10} />}
            {subtext}
          </p>
        )}
      </div>
    </div>
  )

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyValue)}
      className="flex items-center gap-1 hover:text-[#2563EB] transition-colors"
    >
      {label}
      <ArrowUpDown size={11} className={cn(sortKey === sortKeyValue ? 'text-[#2563EB]' : 'text-[#d1d5db]')} />
    </button>
  )

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">Guests Management</h1>
          <p className="text-[12px] text-[#9ca3af] font-medium mt-0.5">
            Complete directory of every guest who has stayed at Buffalo Hotel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[12px] font-semibold text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827] transition-colors shadow-sm"
          >
            <Printer size={14} /> Print List
          </button>
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterType('all'); setSortKey('checkIn'); setSortDir('desc'); setPage(1); setPageSize(10) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[12px] font-semibold text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827] transition-colors shadow-sm"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Registered Guests"
          value={stats?.totalRegisteredGuests?.toLocaleString() || 0}
          subtext="All-time stays"
          icon={Users}
          iconBg="bg-[#2563eb]"
        />
        <MetricCard
          label="Active Guests Today"
          value={stats?.activeGuestsToday?.toLocaleString() || 0}
          subtext="Currently checked in"
          icon={Home}
          iconBg="bg-[#22c55e]"
        />
        <MetricCard
          label="New This Month"
          value={stats?.newThisMonth?.toLocaleString() || 0}
          subtext={stats && stats.newLastMonth > 0 ? `vs ${stats.newLastMonth} last month` : 'New primary guests'}
          icon={TrendingUp}
          iconBg="bg-[#f59e0b]"
          trend={stats && stats.newThisMonth >= stats.newLastMonth ? 'up' : 'down'}
        />
        <MetricCard
          label="Returning Guests"
          value={stats?.returningGuestsCount?.toLocaleString() || 0}
          subtext="2+ stays"
          icon={History}
          iconBg="bg-[#8b5cf6]"
        />
        <MetricCard
          label="Primary Contacts"
          value={stats?.totalPrimaryGuests?.toLocaleString() || 0}
          subtext="Unique bookers"
          icon={User}
          iconBg="bg-[#1a2b4a]"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-5">
          <h3 className="text-[14px] font-bold text-[#111827] mb-4">Guest Arrivals Trend (Last 12 Months)</h3>
          <div className="h-[220px]">
            {statsLoading ? (
              <div className="h-full w-full bg-[#f3f4f6] animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="guestGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <ReTooltip formatter={(v: any) => [`${v} guests`, '']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="guests" stroke="#2563eb" strokeWidth={2} fill="url(#guestGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="text-[14px] font-bold text-[#111827] mb-4">Guests by Nationality</h3>
          <div className="h-[220px]">
            {statsLoading ? (
              <div className="h-full w-full bg-[#f3f4f6] animate-pulse rounded-lg" />
            ) : nationalityChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#9ca3af] text-xs">No nationality data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nationalityChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {nationalityChartData.map((_d: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <ReTooltip formatter={(v: any, n: any) => [`${v} guests`, n]} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="text-[14px] font-bold text-[#111827] mb-4">Age Category Distribution</h3>
          <div className="h-[180px]">
            {statsLoading ? (
              <div className="h-full w-full bg-[#f3f4f6] animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <ReTooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {ageChartData.map((_d: any, i: number) => <Cell key={i} fill={i === 0 ? '#2563eb' : '#f59e0b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="text-[14px] font-bold text-[#111827] mb-4">Bookings by Type</h3>
          <div className="h-[220px]">
            {statsLoading ? (
              <div className="h-full w-full bg-[#f3f4f6] animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeChartData} cx="50%" cy="45%" outerRadius={65} paddingAngle={3} dataKey="value">
                    {typeChartData.map((_d: any, i: number) => <Cell key={i} fill={i === 0 ? '#2563eb' : '#f59e0b'} />)}
                  </Pie>
                  <ReTooltip />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, booking ref or room..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[13px] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#dbeafe] transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[12px] text-[#6b7280] outline-none focus:border-[#2563EB]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-[#e5e7eb] rounded-lg text-[12px] text-[#6b7280] outline-none focus:border-[#2563EB]"
            >
              <option value="all">All Types</option>
              <option value="adult">Adults</option>
              <option value="child">Children</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guest Table */}
      <div ref={tableRef} className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#111827]">Guest Directory</h3>
          <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full">
            {filteredGuests.length} Total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Name" sortKeyValue="fullName" /></th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap">Contact</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Nationality" sortKeyValue="nationality" /></th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Type" sortKeyValue="ageCategory" /></th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap">Booking</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap">Room</th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Check In" sortKeyValue="checkIn" /></th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Check Out" sortKeyValue="checkOut" /></th>
                <th className="h-10 px-3 text-left font-semibold text-[#9ca3af] uppercase tracking-wider whitespace-nowrap"><SortHeader label="Status" sortKeyValue="status" /></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-24 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-28 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-16 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-12 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-20 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-10 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-16 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-16 animate-pulse" /></td>
                    <td className="p-3"><div className="h-3 bg-[#f3f4f6] rounded w-14 animate-pulse" /></td>
                  </tr>
                ))
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-[#9ca3af]">
                    <User size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No guests found</p>
                  </td>
                </tr>
              ) : (
                sortedGuests.map((guest: any, idx: number) => {
                  const booking = guest.booking
                  const statusConfig = booking?.status ? BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] : null
                  return (
                    <tr
                      key={guest.id + idx}
                      className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors cursor-pointer"
                      onClick={() => {
                        if (guest.source === 'primary') {
                          setSelectedGuestId(guest.id)
                          setSelectedRegisteredGuest(null)
                        } else {
                          setSelectedRegisteredGuest(guest)
                          setSelectedGuestId(null)
                        }
                      }}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0',
                            guest.ageCategory === 'child' ? 'bg-[#f59e0b]' : 'bg-[#2563EB]'
                          )}>
                            {guest.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-[#111827]">{guest.fullName}</p>
                            {guest.isPrimary && (
                              <span className="text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">Primary</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-[#111827]">{guest.phone || '-'}</div>
                        {guest.email && <div className="text-[10px] text-[#9ca3af]">{guest.email}</div>}
                      </td>
                      <td className="p-3 text-[#6b7280]">{guest.nationality || 'Unknown'}</td>
                      <td className="p-3">
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                          guest.ageCategory === 'child' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#dbeafe] text-[#2563eb]'
                        )}>
                          {guest.ageCategory || 'adult'}
                        </span>
                      </td>
                      <td className="p-3 text-[#6b7280]">{booking?.bookingRef || '-'}</td>
                      <td className="p-3 text-[#6b7280]">{booking?.room?.roomNumber || '-'}</td>
                      <td className="p-3 text-[#6b7280]">{booking?.checkIn ? format(parseISO(booking.checkIn), 'dd MMM yyyy') : '-'}</td>
                      <td className="p-3 text-[#6b7280]">{booking?.checkOut ? format(parseISO(booking.checkOut), 'dd MMM yyyy') : '-'}</td>
                      <td className="p-3">
                        {statusConfig ? (
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase', statusConfig.bgClass, statusConfig.textClass)}>
                            {statusConfig.label}
                          </span>
                        ) : (
                          <span className="text-[#9ca3af]">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-[#f3f4f6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f9fafb]">
          <div className="flex items-center gap-2 text-[11px] text-[#6b7280]">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-[#e5e7eb] rounded text-[11px] outline-none focus:border-[#2563EB]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredGuests.length)} of {filteredGuests.length} guests
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-semibold transition-colors',
                    page === pageNum
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {(selectedGuestId || selectedRegisteredGuest) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setSelectedGuestId(null); setSelectedRegisteredGuest(null) }}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedGuestId ? (
              detailLoading ? (
                <div className="p-10 text-center text-[#9ca3af]">Loading...</div>
              ) : guestDetail ? (
                <GuestDetailContent guest={guestDetail} onClose={() => setSelectedGuestId(null)} />
              ) : null
            ) : (
              <RegisteredGuestDetailContent guest={selectedRegisteredGuest} onClose={() => setSelectedRegisteredGuest(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GuestDetailContent({ guest, onClose }: { guest: any; onClose: () => void }) {
  return (
    <>
      <div className="p-6 border-b border-[#f3f4f6] flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-2xl font-bold">
            {guest.fullName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111827]">{guest.fullName}</h2>
            <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider">Primary Guest</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#9ca3af] hover:text-[#111827]">✕</button>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={<Phone size={15} />} label="Phone" value={guest.phone} />
          <InfoItem icon={<Mail size={15} />} label="Email" value={guest.email || 'Not provided'} />
          <InfoItem icon={<Globe size={15} />} label="Nationality" value={guest.nationality || 'Not set'} />
          <InfoItem icon={<Hash size={15} />} label="ID" value={guest.idNumber ? `${guest.idType} · ${guest.idNumber}` : 'Not set'} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider mb-3 flex items-center gap-2">
            <History size={14} /> Booking History ({guest.bookings?.length || 0})
          </h3>
          <div className="space-y-2">
            {guest.bookings?.map((booking: any) => (
              <div key={booking.id} className="p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{booking.bookingRef}</p>
                  <p className="text-[10px] text-[#9ca3af]">Room {booking.room?.roomNumber} · {format(parseISO(booking.checkIn), 'dd MMM')} - {format(parseISO(booking.checkOut), 'dd MMM yyyy')}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                  BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG]?.bgClass,
                  BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG]?.textClass
                )}>
                  {BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function RegisteredGuestDetailContent({ guest, onClose }: { guest: any; onClose: () => void }) {
  const booking = guest.booking
  return (
    <>
      <div className="p-6 border-b border-[#f3f4f6] flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold',
            guest.ageCategory === 'child' ? 'bg-[#f59e0b]' : 'bg-[#2563EB]'
          )}>
            {guest.fullName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#111827]">{guest.fullName}</h2>
            <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider">
              {guest.isPrimary ? 'Primary Guest' : 'Registered Stay Guest'} · {guest.ageCategory}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#9ca3af] hover:text-[#111827]">✕</button>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={<Phone size={15} />} label="Phone" value={guest.phone || 'Not provided'} />
          <InfoItem icon={<Mail size={15} />} label="Email" value={guest.email || 'Not provided'} />
          <InfoItem icon={<Globe size={15} />} label="Nationality" value={guest.nationality || 'Not set'} />
          <InfoItem icon={<Hash size={15} />} label="ID" value={guest.idNumber ? `${guest.idType} · ${guest.idNumber}` : 'Not set'} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider mb-3 flex items-center gap-2">
            <BedDouble size={14} /> Associated Booking
          </h3>
          <div className="p-4 rounded-xl bg-[#f9fafb] border border-[#f3f4f6] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#111827]">{booking?.bookingRef}</span>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                BOOKING_STATUS_CONFIG[booking?.status as keyof typeof BOOKING_STATUS_CONFIG]?.bgClass,
                BOOKING_STATUS_CONFIG[booking?.status as keyof typeof BOOKING_STATUS_CONFIG]?.textClass
              )}>
                {BOOKING_STATUS_CONFIG[booking?.status as keyof typeof BOOKING_STATUS_CONFIG]?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-[#6b7280]">
              <div className="flex items-center gap-1.5"><Calendar size={12} /> Check In: {booking?.checkIn ? format(parseISO(booking.checkIn), 'dd MMM yyyy') : '-'}</div>
              <div className="flex items-center gap-1.5"><Calendar size={12} /> Check Out: {booking?.checkOut ? format(parseISO(booking.checkOut), 'dd MMM yyyy') : '-'}</div>
              <div className="flex items-center gap-1.5"><Home size={12} /> Room: {booking?.room?.roomNumber || '-'}</div>
              <div className="flex items-center gap-1.5"><Briefcase size={12} /> Type: {booking?.bookingType || '-'}</div>
            </div>
            {booking?.company && (
              <div className="pt-2 border-t border-[#f3f4f6] text-[11px] text-[#6b7280]">
                Company: <span className="font-semibold text-[#111827]">{booking.company.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] flex items-center justify-center text-[#9ca3af] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[13px] font-semibold text-[#374151]">{value}</p>
      </div>
    </div>
  )
}
