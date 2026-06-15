'use client'

import { useDashboardSummary, useRevenueReport, useOccupancyReport } from '@/hooks/useReports'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { BOOKING_STATUS_CONFIG, Booking } from '@/types/booking'
import { ROOM_STATUS_CONFIG, Room, RoomStatus } from '@/types/room'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid
} from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  DoorOpen, LogIn, LogOut, Banknote, Users,
  MoreHorizontal, TrendingUp, TrendingDown,
  ChevronDown, Search, Settings, SlidersHorizontal, ChevronRight,
  Calendar
} from 'lucide-react'
import { formatTZS } from '@/lib/formatters'

// ─── Sub-components ─────────────────────────────────────────

function StatMini({ label, value, icon, iconBg, change, changeUp, isLoading }: any) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px] flex flex-col justify-between hover:shadow-md transition-shadow font-sans h-full">
      <div className={cn('w-[32px] h-[32px] rounded-[8px] flex items-center justify-center mb-[10px] text-[16px] shadow-sm', iconBg)}>
        {icon}
      </div>
      <div>
        {/* Label uses Title Case as per template */}
        <p className="text-[11px] text-[#9ca3af] font-medium mb-[4px]">{label}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-[#f3f4f6] animate-pulse rounded" />
        ) : (
          <div className="text-[26px] font-bold text-[#111827] flex items-baseline gap-[6px] leading-tight tracking-tight">
            {value}
          </div>
        )}
        {change && !isLoading && (
          <p className={cn(
            'text-[10px] font-medium mt-1 flex items-center gap-[2px]',
            changeUp ? 'text-[#22c55e]' : 'text-[#ef4444]'
          )}>
            {changeUp ? '↑' : '↓'} {change} <span className="text-[#9ca3af]">vs yesterday</span>
          </p>
        )}
      </div>
    </div>
  )
}

function RoomCardMini({ room, index }: { room: Room; index: number }) {
  const currentBooking = room.bookings?.[0]
  const status = room.status
  
  const occupiedColors = [
    { bg: 'bg-[#1a2b4a]', text: 'text-white', border: 'border-[#1a2b4a]', sub: 'text-[#9ca3af]' }, 
    { bg: 'bg-[#2563eb]', text: 'text-white', border: 'border-[#2563eb]', sub: 'text-blue-100' },  
    { bg: 'bg-[#bfdbfe]', text: 'text-[#1e40af]', border: 'border-[#93c5fd]', sub: 'text-[#1e40af]/60' } 
  ]
  const occ = occupiedColors[index % 3]

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
        <p className="text-[10px] font-semibold truncate leading-tight tracking-tight">
          {currentBooking.guest.fullName}
        </p>
      ) : (
        <p className={cn('text-[9px] font-medium opacity-70', styles.sub)}>
          {status === 'available' ? 'Available' : status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
      )}
    </div>
  )
}

function WeeklyVisitorsRadar({ data = [] }: { data: any[] }) {
  const points = data.length >= 6 ? data.slice(0, 6).map((d, i) => {
    const radius = 10 + (d.rate / 100) * 60
    return `${i === 0 || i === 3 ? 70 : (i < 3 ? 70 + radius : 70 - radius)},${i === 0 ? 70 - radius : (i === 3 ? 70 + radius : 70)}`
  }).join(' ') : "70,10 110,60 85,102 50,102 40,55"

  return (
    <div className="flex flex-col items-center font-sans">
      <svg viewBox="0 0 140 140" className="w-[110px] h-[110px] mb-3">
        <polygon points="70,10 110,35 110,95 70,120 30,95 30,35" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
        <polygon points="70,25 98,42 98,88 70,105 42,88 42,42" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
        <polygon points={points} fill="rgba(37,99,235,0.12)" stroke="#2563eb" strokeWidth="2"/>
        <text x="70" y="7" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">Mon</text>
        <text x="117" y="38" fontSize="8" fill="#9ca3af" fontWeight="600">Tue</text>
        <text x="117" y="96" fontSize="8" fill="#9ca3af" fontWeight="600">Wed</text>
        <text x="70" y="128" textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">Thu</text>
      </svg>
      <div className="flex gap-3 flex-wrap justify-center">
        {[
          { label: 'Occupancy', color: 'bg-[#2563eb]' },
          { label: 'Trend', color: 'bg-[#93c5fd]' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 text-[9px] font-medium text-[#9ca3af]">
            <div className={cn('w-1.5 h-1.5 rounded-full', l.color)} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export default function OverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: occupancyData = [] } = useOccupancyReport(7)
  const { data: recentBookingsData } = useBookings({ limit: 5 })
  const { data: roomsData } = useRooms({ limit: 20 })

  const recentBookings = recentBookingsData?.data || []
  const roomsList = roomsData?.rooms || []
  const miniRooms = roomsList.slice(0, 12)

  const barChartData = occupancyData.map((d: any) => ({
    date: format(new Date(d.date), 'EEE'),
    total: d.count
  }))

  return (
    <div className="space-y-4 font-sans">
      
      {/* Topbar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
           <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Dashboard</h1>
           <p className="text-[12px] text-[#9ca3af] font-medium mt-[-2px]">Daily performance Muhtasari</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2 text-[12px] font-semibold text-[#6b7280] flex items-center gap-2">
             <Calendar size={14} className="text-[#2563eb]" />
             {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </div>
        </div>
      </div>

      {/* ── Row 1: Grid (1 : 1.6 : 1.4) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1.4fr] gap-[14px]">
        
        {/* Col 1: Two mini stat cards */}
        <div className="flex flex-col gap-[14px]">
          <StatMini 
            label="Available room" 
            value={summary?.roomStats?.available ?? 0} 
            icon="🚪" 
            iconBg="bg-[#ecfdf5]" 
            isLoading={summaryLoading}
          />
          <StatMini 
            label="Check out" 
            value={summary?.checkOutsToday ?? 0} 
            icon="↩️" 
            iconBg="bg-[#fff7ed]" 
            isLoading={summaryLoading}
          />
        </div>

        {/* Col 2: Check in chart */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[20px] relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#9ca3af] font-medium">Check in</span>
            <div className="flex gap-1 bg-[#f3f4f6] p-0.5 rounded-[8px] border border-gray-100">
              <button className="text-[10px] px-3 py-1 rounded-md bg-[#2563eb] text-white font-semibold shadow-sm transition-all">Month</button>
              <button className="text-[10px] px-3 py-1 rounded-md text-[#9ca3af] font-semibold hover:bg-white transition-all">Year</button>
            </div>
          </div>
          <div>
             <div className="text-[28px] font-bold text-[#111827] flex items-center gap-2 leading-none tracking-tight">
               {summary?.checkInsToday ?? 0}
               <span className="text-[12px] text-[#ef4444] font-medium flex items-center gap-0.5">
                 ↓ 30%
               </span>
             </div>
          </div>
          
          <div className="h-[90px] mt-[14px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData.length > 0 ? barChartData : [
                { date: 'Mon', total: 0 }, { date: 'Tue', total: 0 },
                { date: 'Wed', total: 0 }, { date: 'Thu', total: 0 },
                { date: 'Fri', total: 0 }, { date: 'Sat', total: 0 },
              ]} barGap={6}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Bar dataKey="total" fill="#dbeafe" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between mt-2 px-1">
             {barChartData.map((d: any, i: number) => (
               <span key={i} className="text-[9px] text-[#9ca3af] font-medium uppercase">{d.date}</span>
             ))}
          </div>
        </div>

        {/* Col 3: Weekly Visitors Radar */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[20px] flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[14px] font-bold text-[#111827] tracking-tight">Weekly Visitors</p>
              <p className="text-[11px] text-[#9ca3af] font-medium mt-[-2px]">Attendance patterns</p>
            </div>
            <button className="text-[#9ca3af] hover:text-[#111827] transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
             <WeeklyVisitorsRadar data={occupancyData} />
          </div>
          <div className="text-center mt-4">
             <p className="text-[22px] font-bold text-[#111827] tracking-tight">{summary?.totalActive ?? 0} <span className="text-[11px] font-medium text-[#9ca3af]">Total</span></p>
             <p className="text-[11px] text-[#2563eb] font-semibold mt-[-2px]">keep it up! 🏆</p>
          </div>
        </div>
      </div>

      {/* ── Row 2: Room Status Pulse + Today's Activity ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[14px]">
        
        {/* Room Status Overview */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[24px]">
          <div className="flex items-center justify-between mb-[18px]">
            <div>
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Room Status Pulse</p>
              <p className="text-[11px] text-[#9ca3af] font-medium mt-[-2px]">Live Availability & Guest Info</p>
            </div>
            <Link href="/rooms">
               <button className="bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] transition-all text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 border border-[#dbeafe]">
                 Full Map <ChevronRight size={14} />
               </button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mt-[12px]">
            {miniRooms.map((r, i) => (
              <RoomCardMini key={r.id} room={r} index={i} />
            ))}
            {miniRooms.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[92px] rounded-[10px] bg-[#f3f4f6] animate-pulse border border-[#e5e7eb]" />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-[20px] gap-y-2 mt-[24px] pt-5 border-t border-[#f3f4f6]">
            {[
              { label: 'Available', color: 'bg-[#ecfdf5] border-[#d1fae5]' },
              { label: 'Occupied', color: 'bg-[#1a2b4a]' },
              { label: 'Dirty', color: 'bg-[#fffbeb] border-[#fef3c7]' },
              { label: 'Cleaning', color: 'bg-[#e0e7ff] border-[#c7d2fe]' },
              { label: 'Maintenance', color: 'bg-[#fef2f2] border-[#fee2e2]' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-[6px] text-[10px] text-[#6b7280] font-semibold">
                <div className={cn('w-[8px] h-[8px] rounded-full border shadow-sm', l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <div>
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Recent Activity</p>
              <p className="text-[11px] text-[#9ca3af] font-medium mt-[-2px]">Arrivals and Departures</p>
            </div>
            <button className="text-[#9ca3af] hover:text-[#111827]">⋯</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  {['Guest', 'Room', 'Schedule'].map(h => (
                    <th key={h} className="text-[10px] text-[#9ca3af] font-bold pb-[8px] px-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b: Booking) => (
                  <tr key={b.id} className="group cursor-pointer">
                    <td className="py-[12px] bg-[#f9fafb] rounded-l-xl px-3 border-l-2 border-transparent group-hover:border-[#2563eb] group-hover:bg-[#eff6ff]/30 transition-all">
                       <p className="text-[13px] font-bold text-[#111827] group-hover:text-[#2563eb]">{b.guest.fullName}</p>
                       <p className="text-[9px] font-medium text-[#9ca3af]">{b.bookingRef}</p>
                    </td>
                    <td className="text-[12px] py-[12px] bg-[#f9fafb] px-2 font-bold text-[#6b7280] group-hover:bg-[#eff6ff]/30 transition-all">
                       #{b.room.roomNumber}
                    </td>
                    <td className="text-[10px] py-[12px] bg-[#f9fafb] rounded-r-xl px-3 font-bold text-[#9ca3af] whitespace-nowrap group-hover:bg-[#eff6ff]/30 transition-all">
                       {format(new Date(b.checkIn), 'dd MMM')} – {format(new Date(b.checkOut), 'dd MMM')}
                    </td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                   <tr><td colSpan={3} className="py-16 text-center text-[#9ca3af] text-[10px] font-medium italic">No activity recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 3: Transaction Ledger ────────────────── */}
       <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden mt-2 border border-[#f3f4f6]">
         <div className="flex items-center justify-between px-8 py-5 border-b border-[#f3f4f6] bg-white">
           <div>
             <h2 className="text-[16px] font-bold text-[#111827] tracking-tight">Full Transaction Ledger</h2>
             <p className="text-[11px] text-[#9ca3af] font-medium">Pipeline Management</p>
           </div>
           <Link href="/reservations">
             <button className="flex items-center gap-2 text-[11px] font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-lg shadow-blue-200/50 px-6 py-3 rounded-2xl transition-all">
               Manage Bookings <ChevronRight size={16} />
             </button>
           </Link>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full min-w-[800px]">
             <thead>
               <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                 {['Guest Profile','Assignment','Stay Period','Financial Ledger','Status'].map(h => (
                   <th key={h} className="text-left px-8 py-4 text-[10px] text-[#9ca3af] font-bold whitespace-nowrap">
                     {h}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-[#f3f4f6]">
               {recentBookings.map((b: Booking, idx: number) => {
                 const statusCfg = BOOKING_STATUS_CONFIG[b.status]
                 return (
                   <tr key={b.id} className="hover:bg-[#eff6ff]/10 transition-all cursor-pointer group">
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-sm transition-all shadow-sm border border-white",
                           idx % 2 === 0 ? "bg-[#eff6ff] text-[#2563eb]" : "bg-[#ecfdf5] text-[#10b981]"
                         )}>
                           {b.guest.fullName.charAt(0)}
                         </div>
                         <div>
                           <p className="text-[14px] font-bold text-[#111827] group-hover:text-[#2563eb] transition-colors">{b.guest.fullName}</p>
                           <p className="text-[10px] text-[#9ca3af] font-medium font-mono">{b.bookingRef}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                       <p className="text-[13px] font-bold text-[#6b7280]">Room {b.room.roomNumber}</p>
                       <p className="text-[10px] text-[#9ca3af] font-medium">{b.room.type}</p>
                     </td>
                     <td className="px-8 py-5 text-[12px] text-[#6b7280] font-semibold whitespace-nowrap">
                       <span className="bg-[#f3f4f6] px-2 py-0.5 rounded-md border border-[#e5e7eb]">{format(new Date(b.checkIn), 'dd MMM')}</span>
                       <span className="mx-2 text-[#e5e7eb]">→</span>
                       <span className="bg-[#f3f4f6] px-2 py-0.5 rounded-md border border-[#e5e7eb]">{format(new Date(b.checkOut), 'dd MMM')}</span>
                     </td>
                     <td className="px-8 py-5">
                       <p className="text-[14px] font-bold text-[#111827] leading-none">{formatTZS(b.totalAmount)}</p>
                       <p className={cn(
                         'text-[10px] font-semibold mt-1.5',
                         b.balanceDue <= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                       )}>
                         {b.balanceDue <= 0 ? '✓ Settlement Final' : `Outstanding: ${formatTZS(b.balanceDue)}`}
                       </p>
                     </td>
                     <td className="px-8 py-5">
                       <span className={cn(
                         'inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-bold shadow-sm border border-white/20',
                         statusCfg?.bgClass, statusCfg?.textClass
                       )}>
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
