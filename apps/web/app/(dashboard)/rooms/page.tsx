'use client'

import { useState } from 'react'
import { useRooms, useRoomStats, useFloors } from '@/hooks/useRooms'
import RoomGrid from '@/components/rooms/RoomGrid'
import RoomDetailModal from '@/components/rooms/RoomDetailModal'
import RoomFormModal from '@/components/rooms/RoomFormModal'
import { Room, ROOM_STATUS_CONFIG } from '@/types/room'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'

// ─── Radar Chart (Room Type Distribution) — pure SVG ─────────
function RoomRadarChart() {
  return (
    <div className="flex items-center gap-[20px]">
      <svg viewBox="0 0 140 140" className="w-[130px] h-[130px] flex-shrink-0">
        <polygon points="70,10 110,38 110,102 70,130 30,102 30,38" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        <polygon points="70,28 96,44 96,96 70,112 44,96 44,44" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        <polygon points="70,46 82,54 82,86 70,94 58,86 58,54" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        <polygon
          points="70,10 100,60 85,102 50,102 40,55"
          fill="rgba(37,99,235,0.2)"
          stroke="#2563eb"
          strokeWidth="1.5"
        />
        <text x="70" y="8" textAnchor="middle" fontSize="8" fill="#6b7280">STANDARD</text>
        <text x="116" y="42" fontSize="8" fill="#6b7280">FAMILY</text>
        <text x="112" y="106" fontSize="8" fill="#6b7280">DELUXE</text>
        <text x="70" y="138" textAnchor="middle" fontSize="8" fill="#6b7280">SUITE</text>
        <text x="0" y="106" fontSize="8" fill="#6b7280">PRESIDENTIAL</text>
        <text x="0" y="42" fontSize="8" fill="#6b7280">SUPERIOR</text>
      </svg>
      <div className="flex flex-col gap-[6px] text-[11px]">
        {[
          { label: 'Standard', pct: 80 },
          { label: 'Family', pct: 40 },
          { label: 'Deluxe', pct: 65 },
          { label: 'Suite', pct: 90 },
          { label: 'Presidential', pct: 72 },
          { label: 'Superior', pct: 84 },
        ].map(({ label, pct }) => (
          <div key={label} className="flex items-center justify-between gap-[20px] text-[#6b7280]">
            <span>{label}</span>
            <strong className="text-[#111827] font-semibold">{pct}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card small ──────────────────────────────────────────
function RoomStatSmall({ label, value, emoji, up, change }: any) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[14px_16px]">
      <p className="text-[11px] text-[#9ca3af] font-medium mb-[8px] uppercase tracking-wider">{label}</p>
      <div className="text-[24px] font-bold text-[#111827] flex items-center gap-[8px]">
        {value} <span className="text-[12px] text-[#6b7280] font-normal">{emoji}</span>
      </div>
      <p className={cn(
        'text-[11px] font-semibold mt-[4px]',
        up ? 'text-[#22c55e]' : 'text-[#ef4444]'
      )}>
        {up ? '↑' : '↓'} {change} vs last month
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function RoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null)

  const { data: rooms = [], isLoading } = useRooms({ floor: selectedFloor })
  const { data: stats } = useRoomStats()
  const { data: floors = [] } = useFloors()
  const { user } = useAuthStore()

  const handleEditRoom = (room: Room) => {
    setRoomToEdit(room)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-[14px]">

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr] gap-[14px]">
        {/* Left col */}
        <div className="flex flex-col gap-[10px]">
          <RoomStatSmall label="Total rooms" value={stats?.total ?? 126} emoji="🚪" up change="30%" />
          <RoomStatSmall label="Available rooms" value={stats?.available ?? 64} emoji="🚪" up change="62%" />
        </div>

        {/* Mid col */}
        <div className="flex flex-col gap-[10px]">
          <RoomStatSmall label="Repeat guests" value={60} emoji="👤" up={false} change="22%" />
          <RoomStatSmall label="Occupied" value={stats?.occupied ?? 23} emoji="🏠" up={false} change="24%" />
        </div>

        {/* Right col: Radar chart */}
        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
          <p className="text-[14px] font-bold text-[#111827] mb-[14px]">Room</p>
          <RoomRadarChart />
        </div>
      </div>

      {/* ── Room Grid Card ────────────────────────────────── */}
      <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-[16px]">
        <div className="flex items-center justify-between mb-[14px]">
          <h2 className="text-[18px] font-bold text-[#111827]">Room Status</h2>
          <div className="flex items-center gap-[10px]">
            {user?.role === 'admin' && (
              <button
                onClick={() => { setRoomToEdit(null); setIsFormOpen(true) }}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] px-[16px] py-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors mr-2"
              >
                <Plus size={14} /> Add Room
              </button>
            )}
            <button className="flex items-center gap-1.5 px-[12px] py-[7px] bg-white border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium text-[#6b7280]">
              4th floor <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[10px] mt-[14px]">
          {isLoading ? (
            Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-[#f3f4f6] rounded-[10px] animate-pulse" />
            ))
          ) : (
            rooms.map((room: Room) => {
               const status = room.status
               const isDark = status === 'occupied' || status === 'blocked'
               return (
                 <div 
                   key={room.id}
                   onClick={() => setSelectedRoom(room)}
                   className={cn(
                     "rounded-[10px] p-[10px] cursor-pointer transition-all hover:-translate-y-[1px] hover:shadow-md min-h-[90px] relative",
                     status === 'available' ? 'bg-[#f3f4f6]' :
                     status === 'occupied' ? 'bg-[#2563eb] text-white' :
                     status === 'dirty' ? 'bg-[#fef3c7]' :
                     status === 'cleaning' ? 'bg-[#e0e7ff] text-[#3730a3]' :
                     status === 'maintenance' ? 'bg-[#fee2e2] text-[#ef4444]' :
                     status === 'blocked' ? 'bg-[#1a2b4a] text-white' : 'bg-[#f3f4f6]'
                   )}
                 >
                   <div className={cn("text-[15px] font-bold", isDark ? "text-white" : "text-[#111827]")}>
                     {room.roomNumber}
                   </div>
                   <div className={cn("text-[9px] mt-[2px] opacity-70", isDark ? "text-white" : "text-[#6b7280]")}>
                     {room.type}
                   </div>
                   {room.status === 'occupied' && (
                     <div className="absolute bottom-[8px] right-[8px] w-[22px] h-[22px] rounded-full bg-white/20 flex items-center justify-center text-[11px] text-inherit">
                       👤
                     </div>
                   )}
                 </div>
               )
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-[16px] mt-[14px]">
          {[
            { label: 'Do not disturb', color: 'bg-[#1a2b4a]' },
            { label: 'Need cleaning', color: 'bg-[#93c5fd]' },
            { label: 'Booked', color: 'text-[#374151]' },
            { label: 'Available room', color: 'text-[#9ca3af]' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-[5px] text-[11px] text-[#9ca3af]">
              {l.color.startsWith('bg-') && <div className={cn('w-[7px] h-[7px] rounded-full', l.color)} />}
              <span className={!l.color.startsWith('bg-') ? 'font-medium text-[#374151]' : ''}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onEdit={() => {
            setSelectedRoom(null)
            handleEditRoom(selectedRoom)
          }}
        />
      )}

      {isFormOpen && (
        <RoomFormModal
          room={roomToEdit}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  )
}
