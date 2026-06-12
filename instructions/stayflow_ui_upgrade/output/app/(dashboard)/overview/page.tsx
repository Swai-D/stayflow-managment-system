'use client'

import { useDashboardSummary, useRevenueReport, useOccupancyReport } from '@/hooks/useReports'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { BOOKING_STATUS_CONFIG } from '@/types/booking'
import { ROOM_STATUS_CONFIG, RoomStatus } from '@/types/room'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  DoorOpen, LogIn, LogOut, Banknote, Users,
  MoreHorizontal, TrendingUp, TrendingDown
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  change?: string
  changeUp?: boolean
  isLoading?: boolean
}

// ─── Formatters ─────────────────────────────────────────────
function formatTZS(amount: number): string {
  return `TZS ${Math.round(amount).toLocaleString()}`
}

// ─── Sub-components ─────────────────────────────────────────
function StatCard({ label, value, icon, iconBg, change, changeUp, isLoading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
      <div className={cn('w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-3', iconBg)}>
        {icon}
      </div>
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">{label}</p>
      {isLoading ? (
        <div className="h-7 w-20 bg-gray-100 animate-pulse rounded" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-bold text-gray-900 leading-none">{value}</span>
          {change && (
            <span className={cn(
              'text-[11px] font-semibold flex items-center gap-0.5',
              changeUp ? 'text-[#22C55E]' : 'text-[#EF4444]'
            )}>
              {changeUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Mini room box for room status grid
function RoomBox({ status, roomNumber }: { status: RoomStatus; roomNumber?: string }) {
  const cfg = ROOM_STATUS_CONFIG[status]
  return (
    <div className={cn(
      'aspect-square rounded-[8px] flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 border',
      cfg.bgClass, cfg.textClass, cfg.borderClass
    )}>
      {roomNumber || ''}
    </div>
  )
}

// ─── Platform Line Mini Chart (SVG, no recharts) ─────────────
function PlatformChart() {
  return (
    <svg viewBox="0 0 220 100" className="w-full" style={{ height: 100 }}>
      {/* Grid lines */}
      {[15, 35, 55, 75, 95].map(y => (
        <line key={y} x1="10" y1={y} x2="210" y2={y} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {/* Booking.com line */}
      <polyline
        points="20,60 50,38 80,52 110,28 140,46 170,22 200,42"
        fill="none" stroke="#1a2b4a" strokeWidth="1.5" opacity="0.8"
      />
      {[20,50,80,110,140,170,200].map((x, i) => {
        const ys = [60,38,52,28,46,22,42]
        return <circle key={x} cx={x} cy={ys[i]} r="3.5" fill="#1a2b4a" />
      })}
      {/* Direct line */}
      <polyline
        points="20,72 50,62 80,76 110,55 140,67 170,50 200,62"
        fill="none" stroke="#c8c8c8" strokeWidth="1.5" opacity="0.8"
      />
      {[20,50,80,110,140,170,200].map((x, i) => {
        const ys = [72,62,76,55,67,50,62]
        return <circle key={x} cx={x} cy={ys[i]} r="3" fill="#c8c8c8" />
      })}
    </svg>
  )
}

// ─── Sparkline for booking stats ─────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const upPoints = "0,28 20,18 40,22 60,10 80,16 100,8"
  const downPoints = "0,8 20,16 40,12 60,22 80,18 100,28"
  return (
    <svg viewBox="0 0 100 36" className="mt-2 w-full" style={{ height: 36 }}>
      <polyline
        points={up ? upPoints : downPoints}
        fill="none"
        stroke={up ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function OverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: revenueData } = useRevenueReport(7)
  const { data: occupancyData } = useOccupancyReport(7)
  const { data: recentBookingsData } = useBookings({ limit: 5 })
  const { data: rooms = [] } = useRooms({})
  // TODO: replace with useRooms() hook — Gemini connects API

  const recentBookings = recentBookingsData?.data || []

  // Mini room grid — show up to 24 rooms
  const miniRooms = rooms.slice(0, 24)

  return (
    <div className="space-y-4 py-5">

      {/* ── Row 1: 3-col top grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left col: 2 stat cards stacked */}
        <div className="flex flex-col gap-4">
          <StatCard
            label="Available Rooms"
            value={summary?.roomStats?.available ?? 0}
            icon={<DoorOpen size={14} className="text-gray-500" />}
            iconBg="bg-gray-100"
            change="30%"
            changeUp
            isLoading={summaryLoading}
          />
          <StatCard
            label="Check Outs Today"
            value={summary?.checkOutsToday ?? 0}
            icon={<LogOut size={14} className="text-orange-500" />}
            iconBg="bg-orange-50"
            change="30%"
            changeUp
            isLoading={summaryLoading}
          />
        </div>

        {/* Mid col: Check-in bar chart */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Check In</p>
            <div className="flex gap-1">
              <button className="text-[11px] px-2.5 py-0.5 rounded-[6px] bg-[#2563EB] text-white font-semibold">Month</button>
              <button className="text-[11px] px-2.5 py-0.5 rounded-[6px] text-gray-400 font-semibold hover:bg-gray-100">Year</button>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[28px] font-bold text-gray-900 leading-none">
              {summaryLoading ? '–' : (summary?.checkInsToday ?? 0)}
            </span>
            <span className="text-[12px] text-[#EF4444] font-semibold flex items-center gap-0.5">
              <TrendingDown size={10} /> 30%
            </span>
          </div>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData || [
                { date: 'Jan', total: 40 }, { date: 'Feb', total: 70 },
                { date: 'Mar', total: 55 }, { date: 'Apr', total: 30 },
              ]} barSize={22}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }}
                  formatter={(val: number) => [val, 'Check-ins']}
                />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right col: Booking by Platform */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-4">
          <div className="flex items-start justify-between mb-0.5">
            <div>
              <p className="text-[14px] font-bold text-gray-900">Booking by Platform</p>
              <p className="text-[11px] text-gray-400">Platform booking trends</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <PlatformChart />
          <div className="flex gap-4 flex-wrap mt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-[#1a2b4a]" />
              Booking.com
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-[#c8c8c8]" />
              Direct / Walk-in
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
              Other OTAs
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Revenue Chart (wide) + Booking Mini Stats ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Trends — 8 cols */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-gray-900">Revenue Trends</p>
              <p className="text-[11px] text-gray-400">Last 7 days — G4 Homez</p>
            </div>
            <span className="text-[10px] text-[#2563EB] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded">LIVE</span>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData || []} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(str) => { try { return format(new Date(str), 'dd MMM') } catch { return str } }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }}
                  formatter={(val: number) => [formatTZS(val), 'Revenue']}
                />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4 mini booking stats — 4 cols */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Total Check-in', value: summary?.checkInsToday ?? 32, up: true, icon: <LogIn size={11} className="text-green-500" /> },
            { label: 'Total Check-out', value: summary?.checkOutsToday ?? 24, up: false, icon: <LogOut size={11} className="text-red-500" /> },
            { label: 'Total Guests', value: 24, up: true, icon: <Users size={11} className="text-green-500" /> },
            { label: 'Revenue Today', value: summary?.revenueToday ?? 0, up: true, icon: <Banknote size={11} className="text-blue-500" />, isCurrency: true },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[18px] font-bold text-gray-900 truncate">
                  {(s as any).isCurrency
                    ? (summaryLoading ? '–' : `${Math.round(Number(s.value) / 1000)}K`)
                    : (summaryLoading ? '–' : s.value)
                  }
                </span>
                {s.icon}
              </div>
              <Sparkline up={s.up} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Staff + Room Status Mini ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Staff card — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-gray-900">Staff</p>
              <p className="text-[11px] text-gray-400">Staff productivity overview</p>
            </div>
            <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 outline-none focus:border-[#2563EB]">
              <option>All staff</option>
            </select>
          </div>

          {/* Staff stats row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: 32, unit: 'employee', icon: '👤' },
              { label: 'Cleaned', value: 42, unit: 'rooms', icon: '🧹' },
              { label: 'Pending', value: 24, unit: 'rooms', icon: '⏱' },
              { label: 'Progress', value: '62%', unit: '', icon: '', isProgress: true },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
                  {s.icon && <span>{s.icon}</span>} {s.label}
                </p>
                {(s as any).isProgress ? (
                  <div>
                    <span className="text-[13px] font-bold text-[#22C55E]">{s.value}</span>
                    <div className="h-1 bg-gray-100 rounded mt-1">
                      <div className="h-full w-[62%] bg-[#22C55E] rounded" />
                    </div>
                  </div>
                ) : (
                  <p className="text-[18px] font-bold text-gray-900">
                    {s.value}{' '}
                    <span className="text-[11px] font-normal text-gray-400">{s.unit}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Staff list */}
          <div className="space-y-3">
            {[
              { name: 'Guy Hawkins', role: 'Chef', rooms: 28, start: '8:00 AM', end: '8:00 PM', bg: 'bg-amber-100', emoji: '👨‍🍳' },
              { name: 'Eleanor Pena', role: 'Receptionist', rooms: 16, start: '8:00 AM', end: '4:00 PM', bg: 'bg-pink-100', emoji: '👩‍💼' },
              { name: 'Robert Fox', role: 'Cleaner', rooms: 20, start: '8:00 AM', end: '6:00 PM', bg: 'bg-orange-100', emoji: '🧹' },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className={cn('w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm flex-shrink-0', s.bg)}>
                  {s.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.role}</p>
                </div>
                <div className="flex gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-gray-900">{s.rooms}</p>
                    <p className="text-[10px] text-gray-400">rooms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-gray-900">{s.start}</p>
                    <p className="text-[10px] text-gray-400">start</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold text-gray-900">{s.end}</p>
                    <p className="text-[10px] text-gray-400">end</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room status mini — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[14px] font-bold text-gray-900">Room Status</p>
              <p className="text-[11px] text-gray-400">Real-time availability</p>
            </div>
            <Link href="/rooms" className="text-[11px] text-[#2563EB] font-semibold hover:underline">
              View all
            </Link>
          </div>

          {/* Room grid */}
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {miniRooms.length > 0
              ? miniRooms.map((room) => (
                  <RoomBox key={room.id} status={room.status} />
                ))
              : Array.from({ length: 24 }, (_, i) => {
                  // Mock pattern for skeleton display
                  const statuses: RoomStatus[] = ['available','occupied','dirty','cleaning','available','available']
                  return <RoomBox key={i} status={statuses[i % 6]} />
                })
            }
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
            {[
              { label: 'Do not disturb', bg: 'bg-[#1a2b4a]' },
              { label: 'Cleaning', bg: 'bg-[#e0e7ff]' },
              { label: 'Dirty', bg: 'bg-[#fef3c7]' },
              { label: 'Available', bg: 'bg-[#eff6ff]' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', l.bg)} />
                <span className="text-[10px] text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Booking List ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[14px] font-bold text-gray-900">Booking List</p>
            <p className="text-[11px] text-gray-400">All bookings at a glance.</p>
          </div>
          <Link href="/reservations" className="text-[11px] text-[#2563EB] font-semibold hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Guest', 'Room No.', 'Room Type', 'Check In', 'Check Out', 'Status'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{booking.guest.fullName}</td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600">{booking.room.roomNumber}</td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600 capitalize">{booking.room.type}</td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                    {format(new Date(booking.checkIn), 'EEE, dd MMMM')}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                    {format(new Date(booking.checkOut), 'EEE, dd MMMM')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-semibold',
                      BOOKING_STATUS_CONFIG[booking.status].bgClass,
                      BOOKING_STATUS_CONFIG[booking.status].textClass
                    )}>
                      {BOOKING_STATUS_CONFIG[booking.status].label}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-gray-400">
                    No recent bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
