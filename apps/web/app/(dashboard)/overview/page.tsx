'use client'

import {
  useDashboardSummary, useRevenueReport, useOccupancyReport,
  useFinancialReport, useBusinessAdvice
} from '@/hooks/useReports'
import { useStoreDashboard } from '@/hooks/useStore'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { Booking, BOOKING_STATUS_CONFIG } from '@/types/booking'
import { Room, ROOM_STATUS_CONFIG } from '@/types/room'
import { format } from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Calendar, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Users, DoorOpen, Package, Lightbulb,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { formatTZS } from '@/lib/formatters'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function KPICard({ label, value, subtext, icon: Icon, iconBg, isLoading, trend }: any) {
  return (
    <div className="bg-white rounded-xl shadow-card p-[16px] flex flex-col justify-between hover:shadow-md transition-all duration-150 font-sans h-full">
      <div className={cn('w-[32px] h-[32px] rounded-lg flex items-center justify-center mb-[10px] text-white shadow-sm', iconBg)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[11px] text-[#9ca3af] font-medium mb-[4px]">{label}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-[#f3f4f6] animate-pulse rounded" />
        ) : (
          <div className="text-[26px] font-bold text-[#111827] leading-tight tracking-tight">
            {value}
          </div>
        )}
        {subtext && !isLoading && (
          <p className={cn(
            'text-[10px] font-medium mt-1 flex items-center gap-[2px]',
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
}

function SectionCard({ title, subtitle, children, action }: any) {
  return (
    <div className="bg-white rounded-xl shadow-card p-[20px] font-sans h-full flex flex-col hover:shadow-md transition-all duration-150">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-bold text-[#111827] tracking-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-[#9ca3af] font-medium mt-[-2px]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function WeeklyVisitorsPie({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  const chartData = data.map(d => ({ name: format(new Date(d.date), 'EEE'), value: d.count }))
  if (isLoading) return <div className="h-[200px] bg-[#f3f4f6] animate-pulse rounded-xl" />
  if (chartData.every(d => d.value === 0)) {
    return <div className="h-[200px] flex items-center justify-center text-[#9ca3af] text-xs">No visitor data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <ReTooltip formatter={(v: any) => [`${v} guests`, '']} />
        <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function RevenueTrendChart({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  const chartData = data.map(d => ({ name: format(new Date(d.date), 'EEE'), total: d.total }))
  if (isLoading) return <div className="h-[200px] bg-[#f3f4f6] animate-pulse rounded-xl" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis hide />
        <ReTooltip formatter={(v: any) => [formatTZS(v), 'Revenue']} />
        <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function StoreTopUsedChart({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="h-[140px] bg-[#f3f4f6] animate-pulse rounded-xl" />
  if (!data.length) return <div className="h-[140px] flex items-center justify-center text-[#9ca3af] text-xs">No usage data</div>
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <ReTooltip />
        <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function RoomCardMini({ room, index }: { room: Room; index: number }) {
  const currentBooking = room.bookings?.[0]
  const status = room.status
  const occColors = [
    { bg: 'bg-[#1a2b4a]', text: 'text-white', border: 'border-[#1a2b4a]', sub: 'text-[#9ca3af]' },
    { bg: 'bg-[#2563eb]', text: 'text-white', border: 'border-[#2563eb]', sub: 'text-blue-100' },
    { bg: 'bg-[#bfdbfe]', text: 'text-[#1e40af]', border: 'border-[#93c5fd]', sub: 'text-[#1e40af]/60' }
  ]
  const occ = occColors[index % 3]
  const styles = status === 'available' ? { bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]', border: 'border-[#d1fae5]', sub: 'text-[#10b981]/60' } :
                 status === 'occupied'  ? occ :
                 status === 'dirty'     ? { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', border: 'border-[#fef3c7]', sub: 'text-[#d97706]/60' } :
                 status === 'cleaning'  ? { bg: 'bg-[#e0e7ff]', text: 'text-[#3730a3]', border: 'border-[#c7d2fe]', sub: 'text-[#3730a3]/60' } :
                 status === 'maintenance' ? { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', border: 'border-[#fee2e2]', sub: 'text-[#dc2626]/60' } :
                 { bg: 'bg-[#f3f4f6]', text: 'text-[#6b7280]', border: 'border-[#e5e7eb]', sub: 'text-[#9ca3af]' }

  return (
    <div className={cn(
      'rounded-[10px] p-2.5 text-left transition-all hover:scale-105 shadow-sm border min-h-[92px] flex flex-col justify-between cursor-pointer font-sans',
      styles.bg, styles.text, styles.border
    )}>
      <div>
        <p className="text-[14px] font-bold leading-none">{room.roomNumber}</p>
        {currentBooking && (
          <p className={cn('text-[9px] font-medium mt-1 tracking-tighter truncate', styles.sub)}>
            {format(new Date(currentBooking.checkIn), 'dd/MM')} – {format(new Date(currentBooking.checkOut), 'dd/MM')}
          </p>
        )}
      </div>
      {currentBooking ? (
        <p className="text-[10px] font-semibold truncate leading-tight tracking-tight">{currentBooking.guest.fullName}</p>
      ) : (
        <p className={cn('text-[9px] font-medium opacity-70', styles.sub)}>
          {status === 'available' ? 'Available' : status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
      )}
    </div>
  )
}

function StatMini({ label, value, isLoading }: any) {
  return (
    <div className="bg-[#f9fafb] rounded-[10px] p-3 border border-[#f3f4f6]">
      <p className="text-[10px] text-[#9ca3af] font-medium uppercase tracking-wider">{label}</p>
      {isLoading ? <div className="h-5 w-16 bg-[#f3f4f6] animate-pulse rounded mt-1" /> : (
        <p className="text-[18px] font-bold text-[#111827] mt-0.5">{value}</p>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: occupancyData = [], isLoading: occupancyLoading } = useOccupancyReport(7)
  const { data: revenueData = [], isLoading: revenueLoading } = useRevenueReport(7)
  const { data: financial, isLoading: financialLoading } = useFinancialReport(30)
  const { data: store, isLoading: storeLoading } = useStoreDashboard()
  const { data: adviceData, isLoading: adviceLoading } = useBusinessAdvice('MONTHLY')
  const { data: recentBookingsData } = useBookings({ limit: 5 })
  const { data: roomsData } = useRooms({ limit: 12 })

  const recentBookings = recentBookingsData?.data || []
  const roomsList = roomsData?.rooms || []
  const miniRooms = roomsList.slice(0, 12)

  const totalRooms = Object.values(summary?.roomStats || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  const occupiedRooms = summary?.roomStats?.occupied || 0
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const topUsed = (store?.topUsedItems || []).map((t: any) => ({ name: t.item?.name?.slice(0, 12) || 'Item', value: Number(t.totalUsed) }))

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
           <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Dashboard</h1>
           <p className="text-[12px] text-[#9ca3af] font-medium mt-[-2px]">Business overview at a glance</p>
        </div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2 text-[12px] font-semibold text-[#6b7280] flex items-center gap-2">
           <Calendar size={14} className="text-[#2563eb]" />
           {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </div>
      </div>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[14px]">
        <KPICard label="Revenue Today" value={formatTZS(summary?.revenueToday ?? 0)} icon={Wallet} iconBg="bg-[#2563eb]" isLoading={summaryLoading} subtext="Payments received" />
        <KPICard label="Occupancy Rate" value={`${occupancyRate}%`} icon={Users} iconBg="bg-[#10b981]" isLoading={summaryLoading} subtext={`${occupiedRooms} of ${totalRooms} rooms`} />
        <KPICard label="Active Guests" value={summary?.totalActive ?? 0} icon={DoorOpen} iconBg="bg-[#f59e0b]" isLoading={summaryLoading} subtext="Confirmed / checked in" />
        <KPICard label="Net Profit (30d)" value={formatTZS(financial?.netProfit ?? 0)} icon={TrendingUp} iconBg="bg-[#8b5cf6]" isLoading={financialLoading} subtext={`${Math.round(financial?.expenseRatio || 0)}% expense ratio`} trend={financial?.netProfit >= 0 ? 'up' : 'down'} />
        <KPICard label="Store Alerts" value={(store?.lowStockCount || 0) + (store?.outOfStockCount || 0)} icon={Package} iconBg="bg-[#ef4444]" isLoading={storeLoading} subtext={`${store?.pendingPOs || 0} pending POs`} trend="down" />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        <SectionCard title="Weekly Visitors" subtitle="Guests per day this week">
          <WeeklyVisitorsPie data={occupancyData} isLoading={occupancyLoading} />
        </SectionCard>
        <SectionCard title="Revenue Trend" subtitle="Last 7 days payments" action={
          <Link href="/accounting/revenue" className="text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">Details <ChevronRight size={12} /></Link>
        }>
          <RevenueTrendChart data={revenueData} isLoading={revenueLoading} />
        </SectionCard>
      </div>

      {/* Row 3: Financial Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatMini label="Total Revenue (30d)" value={formatTZS(financial?.totalRevenue ?? 0)} isLoading={financialLoading} />
        <StatMini label="Total Expenses (30d)" value={formatTZS(financial?.totalExpenses ?? 0)} isLoading={financialLoading} />
        <StatMini label="ADR" value={formatTZS(financial?.adr ?? 0)} isLoading={financialLoading} />
        <StatMini label="RevPAR" value={formatTZS(financial?.revpar ?? 0)} isLoading={financialLoading} />
      </div>

      {/* Row 4: Store & Inventory + Business Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-[14px]">
        <SectionCard title="Store & Inventory" subtitle="Stock health and usage" action={
          <Link href="/store" className="text-[11px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">Manage <ChevronRight size={12} /></Link>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatMini label="Total Items" value={store?.totalItems ?? 0} isLoading={storeLoading} />
            <StatMini label="Low Stock" value={store?.lowStockCount ?? 0} isLoading={storeLoading} />
            <StatMini label="Out of Stock" value={store?.outOfStockCount ?? 0} isLoading={storeLoading} />
            <StatMini label="Monthly Spend" value={formatTZS(store?.monthlySpend ?? 0)} isLoading={storeLoading} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">Low Stock Alerts</p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto thin-scrollbar">
                {storeLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-[#f3f4f6] animate-pulse rounded-lg" />) :
                  (store?.lowStockItems || []).length === 0 ? <p className="text-xs text-[#9ca3af]">All stock levels healthy</p> :
                  (store?.lowStockItems || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-[#fffbeb] border border-[#fef3c7] rounded-lg">
                      <span className="text-xs font-bold text-[#92400e] truncate">{item.name}</span>
                      <span className="text-[10px] font-bold text-[#d97706]">{item.currentStock} / {item.minimumStock}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">Top Used Items</p>
              <StoreTopUsedChart data={topUsed} isLoading={storeLoading} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Business Advisor" subtitle="AI-powered insights">
          <div className="space-y-3">
            {adviceLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#f3f4f6] animate-pulse rounded-xl" />) :
              (adviceData?.advice || []).slice(0, 4).map((tip: any, i: number) => (
                <div key={i} className={cn(
                  'p-3 rounded-xl border text-left',
                  tip.type === 'danger' ? 'bg-red-50 border-red-100' :
                  tip.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                  tip.type === 'success' ? 'bg-green-50 border-green-100' :
                  'bg-blue-50 border-blue-100'
                )}>
                  <div className="flex items-start gap-2">
                    <Lightbulb size={14} className={cn(
                      'mt-0.5 shrink-0',
                      tip.type === 'danger' ? 'text-red-500' :
                      tip.type === 'warning' ? 'text-amber-500' :
                      tip.type === 'success' ? 'text-green-500' :
                      'text-blue-500'
                    )} />
                    <div>
                      <p className="text-xs font-bold text-[#111827]">{tip.title}</p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5 line-clamp-2">{tip.message}</p>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </SectionCard>
      </div>

      {/* Row 5: Room Status Pulse + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[14px]">
        <SectionCard title="Room Status Pulse" subtitle="Live availability" action={
          <Link href="/rooms"><button className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] transition-all text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 border border-[#dbeafe]">Full Map <ChevronRight size={14} /></button></Link>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {miniRooms.map((r, i) => <RoomCardMini key={r.id} room={r} index={i} />)}
            {miniRooms.length === 0 && Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[92px] rounded-[10px] bg-[#f3f4f6] animate-pulse border border-[#e5e7eb]" />)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[#f3f4f6]">
            {Object.entries(ROOM_STATUS_CONFIG).map(([key, cfg]: [string, any]) => (
              <div key={key} className="flex items-center gap-[6px] text-[10px] text-[#6b7280] font-semibold">
                <div className={cn('w-[8px] h-[8px] rounded-full border shadow-sm', cfg.bgClass, cfg.borderClass)} />
                {cfg.label}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Latest bookings">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <tbody>
                {recentBookings.map((b: Booking) => (
                  <tr key={b.id} className="group cursor-pointer">
                    <td className="py-[10px] bg-[#f9fafb] rounded-l-xl px-3 border-l-2 border-transparent group-hover:border-[#2563eb] group-hover:bg-[#eff6ff]/30 transition-all">
                       <p className="text-[13px] font-bold text-[#111827] group-hover:text-[#2563eb]">{b.guest.fullName}</p>
                       <p className="text-[9px] font-medium text-[#9ca3af]">{b.bookingRef}</p>
                    </td>
                    <td className="text-[11px] py-[10px] bg-[#f9fafb] px-2 font-bold text-[#6b7280] group-hover:bg-[#eff6ff]/30 transition-all">#{b.room.roomNumber}</td>
                    <td className="text-[10px] py-[10px] bg-[#f9fafb] rounded-r-xl px-3 font-bold text-[#9ca3af] whitespace-nowrap group-hover:bg-[#eff6ff]/30 transition-all">
                       {format(new Date(b.checkIn), 'dd MMM')} – {format(new Date(b.checkOut), 'dd MMM')}
                    </td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                   <tr><td colSpan={3} className="py-12 text-center text-[#9ca3af] text-[10px] font-medium italic">No recent bookings</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Row 6: Booking Ledger */}
      <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden border border-[#f3f4f6]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6] bg-white">
           <div>
             <h2 className="text-[16px] font-bold text-[#111827] tracking-tight">Booking Ledger</h2>
             <p className="text-[11px] text-[#9ca3af] font-medium">Reservations & settlements</p>
           </div>
           <Link href="/reservations">
             <button className="flex items-center gap-2 text-[11px] font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-lg shadow-blue-200/50 px-5 py-2.5 rounded-2xl transition-all">
               Manage Bookings <ChevronRight size={16} />
             </button>
           </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                {['Guest Profile','Assignment','Stay Period','Financial Ledger','Status'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] text-[#9ca3af] font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {recentBookings.map((b: Booking, idx: number) => {
                const statusCfg = BOOKING_STATUS_CONFIG[b.status]
                return (
                  <tr key={b.id} className="hover:bg-[#eff6ff]/10 transition-all cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-sm transition-all shadow-sm border border-white", idx % 2 === 0 ? "bg-[#eff6ff] text-[#2563eb]" : "bg-[#ecfdf5] text-[#10b981]")}>
                          {b.guest.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#111827] group-hover:text-[#2563eb]">{b.guest.fullName}</p>
                          <p className="text-[9px] text-[#9ca3af] font-medium font-mono">{b.bookingRef}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] font-bold text-[#6b7280]">Room {b.room.roomNumber}</p>
                      <p className="text-[10px] text-[#9ca3af] font-medium">{b.room.type}</p>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#6b7280] font-semibold whitespace-nowrap">
                      <span className="bg-[#f3f4f6] px-2 py-0.5 rounded-md border border-[#e5e7eb]">{format(new Date(b.checkIn), 'dd MMM')}</span>
                      <span className="mx-2 text-[#e5e7eb]">→</span>
                      <span className="bg-[#f3f4f6] px-2 py-0.5 rounded-md border border-[#e5e7eb]">{format(new Date(b.checkOut), 'dd MMM')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-[#111827] leading-none">{formatTZS(b.totalAmount)}</p>
                      <p className={cn('text-[10px] font-semibold mt-1', b.balanceDue <= 0 ? 'text-[#10b981]' : 'text-[#f97316]')}>
                        {b.balanceDue <= 0 ? '✓ Paid' : `Outstanding: ${formatTZS(b.balanceDue)}`}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-3 py-1 rounded-2xl text-[10px] font-bold shadow-sm border border-white/20', statusCfg?.bgClass, statusCfg?.textClass)}>
                        {statusCfg?.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
