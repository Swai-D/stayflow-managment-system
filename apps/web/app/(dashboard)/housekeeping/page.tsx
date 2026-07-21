'use client'

import { useState } from 'react'
import { useRooms, useUpdateRoomStatus } from '@/hooks/useRooms'
import { useStoreItems, useRecordHousekeepingConsumption } from '@/hooks/useStore'
import { Room, RoomStatus, ROOM_STATUS_CONFIG } from '@/types/room'
import { cn } from '@/lib/utils'
import { 
  Brush, CheckCircle2, Clock, AlertTriangle, 
  Search, LayoutGrid,
  ShieldAlert, Sparkles, Loader2, X,
  ChevronLeft, ChevronRight, MapPin, Package
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// ─── Housekeeping Display Config ────────────────────
const HK_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType; color: string; action: string; btn: string; image: string }> = {
  available:   { 
    label: 'Clean & Ready', 
    bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', icon: CheckCircle2, color: '#10B981', 
    action: 'Maintenance', btn: 'bg-white border-gray-200 text-gray-700',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' 
  },
  dirty:       { 
    label: 'Need Cleaning', 
    bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', icon: AlertTriangle, color: '#F59E0B', 
    action: 'Start Cleaning', btn: 'bg-[#8b4530] text-white shadow-blue-100',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'
  },
  cleaning:    { 
    label: 'In Progress',   
    bg: 'bg-[#f5f3ff]', text: 'text-[#5b21b6]', icon: Brush, color: '#6366F1', 
    action: 'Mark as Clean', btn: 'bg-[#10B981] text-white shadow-emerald-100',
    image: 'https://images.unsplash.com/photo-1584622781564-1d9876a13300?auto=format&fit=crop&w=800&q=80'
  },
  occupied:    { 
    label: 'Occupied',      
    bg: 'bg-[#f8fafc]', text: 'text-[#26120c]', icon: Clock, color: '#26120C', 
    action: 'View Guest', btn: 'bg-gray-100 text-gray-500',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'
  },
  maintenance: { 
    label: 'Maintenance',   
    bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', icon: ShieldAlert, color: '#EF4444', 
    action: 'Fix Completed', btn: 'bg-[#8b4530] text-white',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ec4?auto=format&fit=crop&w=800&q=80'
  },
}

// ─── Record Supplies Modal ───────────────────────────────────────────────────
function SupplyModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const { data: items = [] } = useStoreItems({ category: 'HOTEL', isActive: true })
  const { mutate: record, isPending } = useRecordHousekeepingConsumption()
  const [selected, setSelected] = useState<Record<string, number>>({})

  const toggleItem = (itemId: string, qty: number) => {
    setSelected(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[itemId]
      else next[itemId] = qty
      return next
    })
  }

  const handleSave = () => {
    const entries = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }))

    if (entries.length === 0) {
      toast.error('Chagua item angalau moja')
      return
    }

    record({ roomNumber: room.roomNumber, items: entries }, {
      onSuccess: () => {
        toast.success('Vifaa vimetumika vimehifadhiwa')
        onClose()
      },
      onError: () => toast.error('Imeshindwa kuhifadhi vifaa')
    })
  }

  const hasSelection = Object.values(selected).some(q => q > 0)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[28px] w-full max-w-[440px] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[18px] font-bold text-[#111827]">Record Supplies</h3>
            <p className="text-[12px] text-[#9ca3af] font-medium">Room {room.roomNumber} · {room.type}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-[13px] text-[#9ca3af] text-center py-6">No hotel inventory items found.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#111827] truncate">{item.name}</p>
                <p className="text-[11px] text-[#9ca3af]">Stock: {item.currentStock} {item.unit.toLowerCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleItem(item.id, (selected[item.id] || 0) - 1)}
                  disabled={(selected[item.id] || 0) <= 0}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-6 text-center text-[13px] font-bold text-[#111827]">{selected[item.id] || 0}</span>
                <button
                  onClick={() => toggleItem(item.id, (selected[item.id] || 0) + 1)}
                  disabled={item.currentStock <= (selected[item.id] || 0)}
                  className="w-7 h-7 rounded-lg bg-[#fbf1ea] hover:bg-[#f5dfce] flex items-center justify-center text-[#8b4530] disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-11 border border-gray-200 rounded-2xl text-[13px] font-bold text-[#6b7280] hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasSelection || isPending}
            className="flex-[1.5] h-11 bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-2xl text-[13px] font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Save Consumption
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HousekeepingPage() {
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all')
  const [supplyRoom, setSupplyRoom] = useState<Room | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: roomsData, isLoading } = useRooms({ 
    status: filter === 'all' ? undefined : filter,
    search,
    page,
    limit: 8 
  })
  
  const rooms = roomsData?.rooms || []
  const meta = roomsData?.meta || { total: 0, totalPages: 1 }
  const { mutate: updateStatus, isPending } = useUpdateRoomStatus()

  const handleStatusChange = (room: Room) => {
    let nextStatus: RoomStatus | null = null
    if (room.status === 'dirty') nextStatus = 'cleaning'
    else if (room.status === 'cleaning') nextStatus = 'available'
    else if (room.status === 'maintenance') nextStatus = 'available'
    else if (room.status === 'available') nextStatus = 'maintenance'

    if (nextStatus) {
      updateStatus({ id: room.id, status: nextStatus }, {
        onSuccess: () => toast.success('Hali ya chumba imesasishwa'),
        onError: () => toast.error('Imeshindwa kusasisha hali')
      })
    }
  }

  return (
    <div className="space-y-6 font-sans text-left pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">🧹 Housekeeping Panel</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Manage room hygiene and service status</p>
        </div>
        
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 min-w-[280px] shadow-sm focus-within:border-[#8b4530]/30 transition-all">
          <Search size={16} className="text-[#9ca3af]" />
          <input 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search room number..."
            className="bg-transparent text-[13px] font-medium text-[#111827] outline-none w-full"
          />
        </div>
      </div>

      {/* ── Status Pills (Horizontal) ─────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {([
          { key: 'all', label: 'All Units', icon: LayoutGrid },
          { key: 'dirty', label: 'Need Cleaning', icon: AlertTriangle },
          { key: 'cleaning', label: 'In Progress', icon: Brush },
          { key: 'available', label: 'Clean & Ready', icon: CheckCircle2 },
          { key: 'occupied', label: 'Occupied', icon: Clock },
        ] as { key: RoomStatus | 'all'; label: string; icon: React.ElementType }[]).map((s) => (
          <button 
            key={s.key}
            onClick={() => { setFilter(s.key); setPage(1) }}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap border shadow-sm",
              filter === s.key 
                ? "bg-[#26120c] text-white border-[#26120c] shadow-lg shadow-blue-900/20" 
                : "bg-white text-[#6b7280] border-gray-100 hover:border-blue-200"
            )}
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Room Cards Grid (Modern Layout) ────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[380px] bg-gray-50 animate-pulse rounded-[32px] border border-gray-100" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
           <div className="w-20 h-20 bg-blue-50 text-[#8b4530] rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} />
           </div>
           <h3 className="text-xl font-bold text-[#111827]">Usimamizi Umekamilika</h3>
           <p className="text-[#9ca3af] font-medium mt-2">Hakuna vyumba vinavyohitaji usafishaji kwa sasa.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map(room => {
            const cfg = HK_CONFIG[room.status] || HK_CONFIG.available
            const currentBooking = room.bookings?.[0]

            return (
              <div 
                key={room.id}
                className="bg-white rounded-[32px] shadow-card overflow-hidden flex flex-col group hover:shadow-xl transition-all border border-gray-50 h-full"
              >
                {/* 1. Header Image Section — Dynamic based on status */}
                <div className="h-44 relative overflow-hidden">
                   <img 
                     src={cfg.image} 
                     alt={room.roomNumber}
                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-[#111827]/20 to-transparent" />
                   
                   <div className="absolute top-4 left-4">
                      <div className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg border-0 backdrop-blur-md", cfg.bg, cfg.text)}>
                        <cfg.icon size={12} />
                        {cfg.label}
                      </div>
                   </div>
                   <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <h4 className="text-[28px] font-bold text-white tracking-tighter leading-none drop-shadow-md">#{room.roomNumber}</h4>
                      <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold text-white shadow-sm border border-white/20">
                         <MapPin size={10} /> L{room.floor}
                      </div>
                   </div>
                </div>

                {/* 2. Body Section */}
                <div className="p-6 flex-1 flex flex-col space-y-4">
                   <div>
                      <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-1">Room Profile</p>
                      <h5 className="text-[15px] font-bold text-[#111827] leading-snug">{room.name}</h5>
                      <p className="text-[12px] text-[#6b7280] font-medium">{ROOM_STATUS_CONFIG[room.status].labelSw} · {room.type}</p>
                   </div>

                   <div className="pt-4 border-t border-gray-50 flex-1">
                      <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-2">Occupant Context</p>
                      {currentBooking ? (
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#8b4530] flex items-center justify-center font-bold text-sm">
                              {currentBooking.guest.fullName.charAt(0)}
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-[13px] font-bold text-[#111827] truncate">{currentBooking.guest.fullName}</p>
                              <p className="text-[10px] text-[#9ca3af] font-semibold">Ends {format(new Date(currentBooking.checkOut), 'dd MMM')}</p>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                           </div>
                           <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Chumba Kipo Wazi</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* 3. Action Section */}
                <div className="p-6 pt-0 mt-auto space-y-2">
                   <button 
                     onClick={() => handleStatusChange(room)}
                     disabled={isPending || room.status === 'occupied'}
                     className={cn(
                       "w-full h-12 rounded-2xl font-bold text-[13px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95",
                       cfg.btn,
                       isPending && "opacity-50"
                     )}
                   >
                     {isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                     {cfg.action}
                   </button>
                   <button
                     onClick={() => setSupplyRoom(room)}
                     className="w-full h-10 rounded-2xl font-semibold text-[12px] text-[#8b4530] bg-[#fbf1ea] hover:bg-[#f5dfce] transition-all flex items-center justify-center gap-2"
                   >
                     <Package size={14} /> Record Supplies
                   </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Record Supplies Modal ─────────────────────────── */}
      {supplyRoom && (
        <SupplyModal
          room={supplyRoom}
          onClose={() => setSupplyRoom(null)}
        />
      )}

      {/* ── Pagination Section ────────────────────────────── */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-8 border-t border-gray-100">
           <div className="text-[11px] text-[#9ca3af] font-bold uppercase tracking-wider">
              Showing <span className="text-[#111827]">{rooms.length}</span> units on page <span className="text-[#111827]">{page}</span> of {meta.totalPages}
           </div>
           <div className="flex items-center gap-3">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#8b4530] hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
              >
                 <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1.5">
                 {Array.from({ length: meta.totalPages }).map((_, i) => (
                    <button 
                       key={i}
                       onClick={() => setPage(i + 1)}
                       className={cn(
                          "w-8 h-8 rounded-lg text-[12px] font-bold transition-all",
                          page === i + 1 ? "bg-[#8b4530] text-white shadow-md shadow-blue-100" : "text-[#9ca3af] hover:bg-gray-50"
                       )}
                    >
                       {i + 1}
                    </button>
                 ))}
              </div>
              <button 
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#8b4530] hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
              >
                 <ChevronRight size={20} />
              </button>
           </div>
        </div>
      )}
    </div>
  )
}
