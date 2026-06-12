'use client'

import { useState } from 'react'
import { useRooms, useRoomStats, useFloors } from '@/hooks/useRooms'
import RoomGrid from '@/components/rooms/RoomGrid'
import RoomDetailModal from '@/components/rooms/RoomDetailModal'
import RoomFormModal from '@/components/rooms/RoomFormModal'
import { Room, ROOM_STATUS_CONFIG } from '@/types/room'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

// ─── Radar Chart (Room Type Distribution) — pure SVG ─────────
function RoomRadarChart() {
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-[130px] h-[130px] flex-shrink-0">
        {/* Outer hexagons */}
        <polygon points="70,10 110,38 110,102 70,130 30,102 30,38" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        <polygon points="70,28 96,44 96,96 70,112 44,96 44,44" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        <polygon points="70,46 82,54 82,86 70,94 58,86 58,54" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        {/* Data polygon */}
        <polygon
          points="70,10 100,60 85,102 50,102 40,55"
          fill="rgba(37,99,235,0.15)"
          stroke="#2563eb"
          strokeWidth="1.5"
        />
        {/* Labels */}
        <text x="70" y="8" textAnchor="middle" fontSize="8" fill="#6b7280">STANDARD</text>
        <text x="116" y="42" fontSize="8" fill="#6b7280">FAMILY</text>
        <text x="112" y="106" fontSize="8" fill="#6b7280">DELUXE</text>
        <text x="70" y="138" textAnchor="middle" fontSize="8" fill="#6b7280">SUITE</text>
        <text x="0" y="106" fontSize="7" fill="#6b7280">PRESIDENT.</text>
        <text x="0" y="42" fontSize="8" fill="#6b7280">SUPERIOR</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {[
          { label: 'Standard', pct: 80 },
          { label: 'Family', pct: 40 },
          { label: 'Deluxe', pct: 65 },
          { label: 'Suite', pct: 90 },
          { label: 'Presidential', pct: 72 },
          { label: 'Superior', pct: 84 },
        ].map(({ label, pct }) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 min-w-[70px]">{label}</span>
            <strong className="text-gray-900 font-semibold">{pct}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card with trend ─────────────────────────────────────
function RoomStatCard({
  label, value, unit, emoji, up, change
}: {
  label: string; value: string | number; unit?: string; emoji?: string; up: boolean; change: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-4">
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[24px] font-bold text-gray-900">{value}</span>
        {unit && <span className="text-[12px] text-gray-400">{unit}</span>}
        {emoji && <span className="text-[12px]">{emoji}</span>}
      </div>
      <p className={cn(
        'text-[11px] font-semibold flex items-center gap-0.5 mt-1',
        up ? 'text-[#22C55E]' : 'text-[#EF4444]'
      )}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {change} vs last month
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
    <div className="space-y-4 py-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-gray-900">Room Status</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Real-time availability — G4 Homez</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => { setRoomToEdit(null); setIsFormOpen(true) }}
            className="flex items-center gap-2 px-4 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            <Plus size={15} />
            Add Room
          </button>
        )}
      </div>

      {/* ── Top 3-col grid: 2 stat stacks + radar ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left col: 2 stacked stat cards */}
        <div className="flex flex-col gap-4">
          <RoomStatCard
            label="Total Rooms"
            value={stats?.total ?? 126}
            emoji="🚪"
            up
            change="↑ 30%"
          />
          <RoomStatCard
            label="Available Rooms"
            value={stats?.available ?? 64}
            emoji="🚪"
            up
            change="↑ 62%"
          />
        </div>

        {/* Mid col: 2 stacked stat cards */}
        <div className="flex flex-col gap-4">
          <RoomStatCard
            label="Repeat Guests"
            value={60}
            emoji="👤"
            up={false}
            change="↓ 22%"
          />
          <RoomStatCard
            label="Occupied"
            value={stats?.occupied ?? 23}
            emoji="🏠"
            up={false}
            change="↓ 24%"
          />
        </div>

        {/* Right col: Room type radar */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] p-5">
          <p className="text-[14px] font-bold text-gray-900 mb-4">Room Type Distribution</p>
          <RoomRadarChart />
        </div>
      </div>

      {/* ── Room Grid Card ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        {/* Card header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Room Status</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Click any room to view details or update status</p>
          </div>
          <select
            value={selectedFloor ?? ''}
            onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-700 bg-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 w-full sm:w-auto"
          >
            <option value="">All floors</option>
            {floors.map(floor => (
              <option key={floor} value={floor}>Floor {floor}</option>
            ))}
          </select>
        </div>

        {/* Grid body */}
        <div className="p-5">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-gray-50 rounded-xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : (
            <RoomGrid rooms={rooms} onRoomClick={setSelectedRoom} />
          )}
        </div>

        {/* Legend */}
        <div className="px-5 pb-5 flex items-center gap-5 flex-wrap border-t border-gray-50 pt-4">
          {[
            { bg: 'bg-[#1a2b4a]', label: 'Do not disturb' },
            { bg: 'bg-[#BFDBFE]', label: 'Occupied' },
            { bg: 'bg-[#fef3c7]', label: 'Dirty / Needs cleaning' },
            { bg: 'bg-[#e0e7ff]', label: 'Cleaning in progress' },
            { bg: 'bg-[#EFF6FF] border border-blue-100', label: 'Available' },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', bg)} />
              <span className="text-[11px] text-gray-400 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room detail modal */}
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

      {/* Room form modal */}
      {isFormOpen && (
        <RoomFormModal
          room={roomToEdit}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  )
}
