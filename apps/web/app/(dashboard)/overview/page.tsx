'use client'

import { useDashboardSummary, useRevenueReport, useOccupancyReport } from '@/hooks/useReports'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { BOOKING_STATUS_CONFIG, Booking } from '@/types/booking'
import { ROOM_STATUS_CONFIG, RoomStatus } from '@/types/room'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  DoorOpen, LogIn, LogOut, Banknote, Users,
  MoreHorizontal, TrendingUp, TrendingDown,
  ChevronDown
} from 'lucide-react'

// ─── Sub-components ─────────────────────────────────────────

function StatMini({ label, value, icon, iconBg, change, changeUp, isLoading }: any) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px] flex flex-col justify-between">
      <div className={cn('w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-[10px] text-[14px]', iconBg)}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-[#9ca3af] font-medium mb-[6px]">{label}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-[#f3f4f6] animate-pulse rounded" />
        ) : (
          <div className="text-[26px] font-bold text-[#111827] flex items-baseline gap-[6px]">
            {value}
            {change && (
              <span className={cn(
                'text-[11px] font-medium flex items-center gap-[2px]',
                changeUp ? 'text-[#22c55e]' : 'text-[#ef4444]'
              )}>
                {changeUp ? '↑' : '↓'} {change}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RoomBoxMini({ status, roomNumber }: { status: RoomStatus; roomNumber?: string }) {
  const cfg = ROOM_STATUS_CONFIG[status]
  return (
    <div className={cn(
      'aspect-square rounded-[8px] flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-105',
      status === 'available' ? 'bg-[#eff6ff] text-[#2563eb]' : 
      status === 'occupied' ? 'bg-[#2563eb] text-white' :
      status === 'dirty' ? 'bg-[#fef3c7] text-[#92400e]' :
      status === 'cleaning' ? 'bg-[#e0e7ff] text-[#3730a3]' :
      status === 'blocked' ? 'bg-[#1a2b4a] text-white' : 'bg-[#eff6ff] text-[#2563eb]'
    )}>
      {roomNumber || ''}
    </div>
  )
}

function PlatformChart() {
  return (
    <svg viewBox="0 0 220 100" className="w-full h-[100px]">
      {/* Grid lines */}
      {[20, 45, 70, 95].map(y => (
        <line key={y} x1="10" y1={y} x2="210" y2={y} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {/* Booking.com line */}
      <polyline
        points="20,60 50,40 80,55 110,30 140,50 170,25 200,45"
        fill="none" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.5"
      />
      {[20,50,80,110,140,170,200].map((x, i) => {
        const ys = [60,40,55,30,50,25,45]
        return <circle key={x} cx={x} cy={ys[i]} r="4" fill="#1e3a5f" />
      })}
      {/* Expedia line */}
      <polyline
        points="20,75 50,65 80,80 110,60 140,70 170,55 200,65"
        fill="none" stroke="#c8c8c8" strokeWidth="1.5" opacity="0.5"
      />
      {[20,50,80,110,140,170,200].map((x, i) => {
        const ys = [75,65,80,60,70,55,65]
        return <circle key={x} cx={x} cy={ys[i]} r="3" fill="#c8c8c8" />
      })}
    </svg>
  )
}

// ─── Main Page ───────────────────────────────────────────────

export default function OverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: revenueData } = useRevenueReport(7)
  const { data: recentBookingsData } = useBookings({ limit: 5 })
  const { data: rooms = [] } = useRooms({})

  const recentBookings = recentBookingsData?.data || []
  const miniRooms = rooms.slice(0, 24)

  return (
    <div className="space-y-4">
      
      {/* ── Row 1: Grid (1 : 1.6 : 1.4) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1.4fr] gap-[14px]">
        
        {/* Col 1: Two mini stat cards */}
        <div className="flex flex-col gap-[14px]">
          <StatMini 
            label="Available room" 
            value={summary?.roomStats?.available ?? 126} 
            icon="🚪" 
            iconBg="bg-[#f3f4f6]" 
            change="30%" 
            changeUp 
            isLoading={summaryLoading}
          />
          <StatMini 
            label="Check out" 
            value={summary?.checkOutsToday ?? 36} 
            icon="↩️" 
            iconBg="bg-[#fff7ed]" 
            change="30%" 
            changeUp 
            isLoading={summaryLoading}
          />
        </div>

        {/* Col 2: Check in chart */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px] relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#9ca3af] font-medium">Check in</span>
            <div className="flex gap-1 bg-[#f3f4f6] p-0.5 rounded-[6px]">
              <button className="text-[11px] px-[10px] py-[3px] rounded-[5px] bg-[#2563eb] text-white font-medium">Month</button>
              <button className="text-[11px] px-[10px] py-[3px] rounded-[5px] text-[#9ca3af] font-medium hover:bg-[#e5e7eb]">Year</button>
            </div>
          </div>
          <div className="text-[28px] font-bold text-[#111827] flex items-center gap-2">
            {summary?.checkInsToday ?? 14}
            <span className="text-[12px] text-[#ef4444] font-medium flex items-center gap-0.5">
              ↓ 30%
            </span>
          </div>
          
          <div className="h-[80px] mt-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData || [
                { date: 'Jan', total: 40 }, { date: 'Feb', total: 70 },
                { date: 'Mar', total: 55 }, { date: 'Apr', total: 30 },
              ]} barGap={6}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Bar dataKey="total" fill="#dbeafe" radius={[6, 6, 0, 0]} />
                {/* Active bar highlight */}
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between mt-1 px-1">
             {['Jan', 'Feb', 'Mar', 'Apr'].map(l => (
               <span key={l} className="text-[9px] text-[#9ca3af]">{l}</span>
             ))}
          </div>
        </div>

        {/* Col 3: Booking by Platform */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <div className="flex items-start justify-between mb-0.5">
            <div>
              <p className="text-[14px] font-bold text-[#111827]">Booking by Platform</p>
              <p className="text-[11px] text-[#9ca3af]">Platform booking trends</p>
            </div>
            <button className="text-[#9ca3af] hover:text-[#111827] transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="mt-2">
            <PlatformChart />
          </div>
          <div className="flex gap-[14px] flex-wrap mt-[10px]">
            {[
              { label: 'Booking.com', color: 'bg-[#1e3a5f]' },
              { label: 'Expedia', color: 'bg-[#c8c8c8]' },
              { label: 'Hotels.com', color: 'bg-[#ef4444]' },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-[5px] text-[11px] text-[#6b7280]">
                <div className={cn('w-[8px] h-[8px] rounded-full', p.color)} />
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Staff + Room Status ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[14px]">
        
        {/* Staff Card */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <p className="text-[14px] font-bold text-[#111827]">Staff</p>
              <p className="text-[11px] text-[#9ca3af]">Staff productivity overview</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-[8px] text-[11px] font-medium text-[#6b7280]">
              All staff <ChevronDown size={10} />
            </button>
          </div>

          <div className="flex gap-[12px] mb-[14px]">
            {[
              { label: 'Total 👤', val: 32, unit: 'employee' },
              { label: 'Cleaned 🧹', val: 42, unit: 'rooms' },
              { label: 'Pending ⏱', val: 24, unit: 'rooms' },
            ].map(s => (
              <div key={s.label} className="flex-1">
                <p className="text-[10px] text-[#9ca3af] mb-[2px]">{s.label}</p>
                <p className="text-[18px] font-bold text-[#111827]">
                  {s.val} <span className="text-[11px] font-normal text-[#9ca3af]">{s.unit}</span>
                </p>
              </div>
            ))}
            <div className="flex-1">
              <p className="text-[10px] text-[#9ca3af] mb-[2px]">Progress</p>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#22c55e]">62%</span>
                <div className="h-[4px] bg-[#e5e7eb] rounded-[2px] mt-[4px]">
                  <div className="w-[62%] h-full bg-[#22c55e] rounded-[2px]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-[10px]">
            {[
              { name: 'Guy Hawkins', role: 'Chef', rooms: 28, start: '8:00 AM', end: '8:00 PM', icon: '👨‍🍳', bg: 'bg-[#fde68a]' },
              { name: 'Eleanor Pena', role: 'Receptionist', rooms: 16, start: '8:00 AM', end: '4:00 PM', icon: '👩‍💼', bg: 'bg-[#fce7f3]' },
              { name: 'Robert Fox', role: 'Cleaner', rooms: 20, start: '8:00 AM', end: '6:00 PM', icon: '🧹', bg: 'bg-[#fed7aa]' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-[10px]">
                <div className={cn('w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] flex-shrink-0', s.bg)}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-[#111827]">{s.name}</p>
                  <p className="text-[10px] text-[#9ca3af]">{s.role}</p>
                </div>
                <div className="flex gap-[14px] text-right">
                  <div className="text-[11px] text-[#9ca3af]">
                    <strong className="text-[12px] text-[#111827] block font-semibold">{s.rooms}</strong> Total room
                  </div>
                  <div className="text-[11px] text-[#9ca3af]">
                    <strong className="text-[12px] text-[#111827] block font-semibold">{s.start}</strong> Start work
                  </div>
                  <div className="text-[11px] text-[#9ca3af]">
                    <strong className="text-[12px] text-[#111827] block font-semibold">{s.end}</strong> End work
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Status Mini */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <div className="flex items-center justify-between mb-[10px]">
            <div>
              <p className="text-[14px] font-bold text-[#111827]">Room Status</p>
              <p className="text-[11px] text-[#9ca3af]">View real-time room availability</p>
            </div>
            <button className="text-[#9ca3af] hover:text-[#111827]">⋯</button>
          </div>
          
          <div className="grid grid-cols-6 gap-[6px] mt-[12px]">
            {miniRooms.map((r, i) => (
              <RoomBoxMini key={r.id} status={r.status} roomNumber={r.roomNumber} />
            ))}
            {miniRooms.length === 0 && Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-[8px] bg-[#eff6ff]" />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-[12px] gap-y-1.5 mt-[12px]">
            {[
              { label: 'Do not disturb', color: 'bg-[#1a2b4a]' },
              { label: 'Need cleaning', color: 'bg-[#93c5fd]' },
              { label: 'Booked', color: 'text-[#374151]' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-[5px] text-[11px] text-[#9ca3af]">
                {l.color.startsWith('bg-') && <div className={cn('w-[7px] h-[7px] rounded-full', l.color)} />}
                <span className={!l.color.startsWith('bg-') ? 'font-medium text-[#374151]' : ''}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Radar + Featured Staff + Booking List ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr] gap-[14px]">
        
        {/* Weekly Visitors Radar */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <svg viewBox="0 0 140 140" className="w-[130px] h-[130px] mx-auto mb-[10px]">
            <polygon points="70,10 110,35 110,95 70,120 30,95 30,35" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            <polygon points="70,25 98,42 98,88 70,105 42,88 42,42" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            <polygon points="70,40 86,50 86,80 70,90 54,80 54,50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            <polygon points="70,10 88,55 110,95 70,108 30,95 52,55" fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth="1.5"/>
            <text x="70" y="7" textAnchor="middle" fontSize="8" fill="#9ca3af">Mon</text>
            <text x="117" y="38" fontSize="8" fill="#9ca3af">Tue</text>
            <text x="117" y="96" fontSize="8" fill="#9ca3af">Wed</text>
            <text x="70" y="128" textAnchor="middle" fontSize="8" fill="#9ca3af">Thu</text>
          </svg>
          <p className="text-[10px] font-semibold text-center text-[#6b7280] mb-[6px]">Weekly Visitors</p>
          <p className="text-[22px] font-bold text-center text-[#111827]">
            120 <span className="text-[11px] font-normal text-[#9ca3af]">visitors</span>
          </p>
          <p className="text-[11px] text-[#2563eb] font-semibold text-center mb-[8px]">keep it up! 🏆</p>
          <div className="flex flex-col gap-[4px]">
            {[
              { label: 'New visitors', color: 'bg-[#2563eb]' },
              { label: 'Returning visitors', color: 'bg-[#93c5fd]' },
              { label: 'Non-returning', color: 'bg-[#e5e7eb]' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-[6px] text-[11px] text-[#9ca3af]">
                <div className={cn('w-[7px] h-[7px] rounded-full', l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Staff of the Day */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px] flex gap-[12px] items-start">
          <div className="flex-1">
            <div className="text-[18px] mb-[4px]">🌙</div>
            <p className="text-[14px] font-bold text-[#111827]">Bryan Rawles</p>
            <p className="text-[11px] text-[#9ca3af] mb-[10px]">Receptionist</p>
            <div className="space-y-[4px] mb-[10px]">
              <p className="text-[10px] text-[#9ca3af]">New visitors</p>
              <p className="text-[10px] text-[#9ca3af]">Returning visitors</p>
              <p className="text-[10px] text-[#9ca3af]">Non-returning visitors</p>
            </div>
            <div className="flex gap-[6px]">
              <button className="w-[26px] h-[26px] rounded-full bg-[#f3f4f6] flex items-center justify-center text-[12px]">‹</button>
              <button className="w-[26px] h-[26px] rounded-full bg-[#f3f4f6] flex items-center justify-center text-[12px]">⚙</button>
            </div>
          </div>
          <div className="w-[70px] h-[100px] rounded-[10px] bg-[#f0f2f5] flex items-center justify-center text-[30px] mt-[20px]">
            👨‍💼
          </div>
        </div>

        {/* Booking List Card */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <div className="flex items-center justify-between mb-[12px]">
            <div>
              <p className="text-[14px] font-bold text-[#111827]">Booking List</p>
              <p className="text-[11px] text-[#9ca3af]">All bookings at a glance.</p>
            </div>
            <button className="text-[#9ca3af] hover:text-[#111827]">⋯</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {['Name', 'Room No.', 'Room', 'Check in'].map(h => (
                    <th key={h} className="text-[10px] text-[#9ca3af] font-semibold pb-[8px] border-b border-[#e5e7eb]">
                      <div className="flex items-center gap-[3px]">{h} <span>↕</span></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {recentBookings.map((b: Booking) => (
                  <tr key={b.id}>
                    <td className="text-[12px] py-[10px] font-medium text-[#111827]">{b.guest.fullName}</td>
                    <td className="text-[12px] py-[10px] text-[#6b7280]">{b.room.roomNumber}</td>
                    <td className="text-[12px] py-[10px] text-[#6b7280] capitalize">{b.room.type}</td>
                    <td className="text-[12px] py-[10px] text-[#6b7280] whitespace-nowrap">{format(new Date(b.checkIn), 'd MMM')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
