'use client'

import { useState } from 'react'
import { useRooms, useUpdateRoomStatus } from '@/hooks/useRooms'
import { Room, RoomStatus, ROOM_STATUS_CONFIG } from '@/types/room'
import { cn } from '@/lib/utils'
import { 
  Brush, CheckCircle2, Clock, AlertTriangle, 
  ChevronRight, Search, LayoutGrid, Filter,
  CheckSquare, ShieldAlert, Sparkles, Loader2, X,
  ChevronLeft, MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// ─── Housekeeping Display Config ────────────────────
const HK_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any; color: string; action: string; btn: string; image: string }> = {
  available:   { 
    label: 'Clean & Ready', 
    bg: 'bg-[#f0fdf4]', text: 'text-[#166534]', icon: CheckCircle2, color: '#10B981', 
    action: 'Maintenance', btn: 'bg-white border-gray-200 text-gray-700',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' 
  },
  dirty:       { 
    label: 'Need Cleaning', 
    bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', icon: AlertTriangle, color: '#F59E0B', 
    action: 'Start Cleaning', btn: 'bg-[#2563eb] text-white shadow-blue-100',
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
    bg: 'bg-[#f8fafc]', text: 'text-[#1a2b4a]', icon: Clock, color: '#1A2B4A', 
    action: 'View Guest', btn: 'bg-gray-100 text-gray-500',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'
  },
  maintenance: { 
    label: 'Maintenance',   
    bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', icon: ShieldAlert, color: '#EF4444', 
    action: 'Fix Completed', btn: 'bg-[#2563eb] text-white',
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ec4?auto=format&fit=crop&w=800&q=80'
  },
}

export default function HousekeepingPage() {
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all')
  const [selected, setSelected] = useState<Room | null>(null)
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
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Housekeeping Panel</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Manage room hygiene and service status</p>
        </div>
        
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 min-w-[280px] shadow-sm focus-within:border-[#2563eb]/30 transition-all">
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
        {[
          { key: 'all', label: 'All Units', icon: LayoutGrid },
          { key: 'dirty', label: 'Need Cleaning', icon: AlertTriangle },
          { key: 'cleaning', label: 'In Progress', icon: Brush },
          { key: 'available', label: 'Clean & Ready', icon: CheckCircle2 },
          { key: 'occupied', label: 'Occupied', icon: Clock },
        ].map((s: any) => (
          <button 
            key={s.key}
            onClick={() => { setFilter(s.key as any); setPage(1) }}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap border shadow-sm",
              filter === s.key 
                ? "bg-[#1a2b4a] text-white border-[#1a2b4a] shadow-lg shadow-blue-900/20" 
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
           <div className="w-20 h-20 bg-blue-50 text-[#2563eb] rounded-full flex items-center justify-center mx-auto mb-6">
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
                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-sm">
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
                <div className="p-6 pt-0 mt-auto">
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
                </div>
              </div>
            )
          })}
        </div>
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
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#2563eb] hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
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
                          page === i + 1 ? "bg-[#2563eb] text-white shadow-md shadow-blue-100" : "text-[#9ca3af] hover:bg-gray-50"
                       )}
                    >
                       {i + 1}
                    </button>
                 ))}
              </div>
              <button 
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#2563eb] hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
              >
                 <ChevronRight size={20} />
              </button>
           </div>
        </div>
      )}
    </div>
  )
}
