'use client'

import { useState, useEffect } from 'react'
import { useRooms, useRoomStats, useFloors, useDeleteRoom } from '@/hooks/useRooms'
import { Room, ROOM_STATUS_CONFIG, RoomStatus } from '@/types/room'
import { formatTZS } from '@/lib/formatters'
import { generateRoomQR } from '@/lib/qr'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Users, Info, LayoutGrid, LayoutList, 
  MapPin, Tag, CheckCircle2, QrCode,
  ChevronRight, Wifi, Tv, Coffee, Wind,
  Calendar, MoreHorizontal, Search,
  ChevronLeft, Plus, Edit, Trash2, ExternalLink, X,
  Wrench, Ban, Sparkles
} from 'lucide-react'
import NewBookingModal from '@/components/reservations/NewBookingModal'
import RoomFormModal from '@/components/rooms/RoomFormModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { toast } from 'sonner'

// ─── Status Styles ───────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string; sub: string; badge: string }> = {
  available:   { bg: 'bg-[#ecfdf5]', text: 'text-[#10b981]', border: 'border-[#d1fae5]', iconBg: 'bg-[#dcfce7]', sub: 'text-[#10b981]/60', badge: 'bg-[#ecfdf5] text-[#10b981] border-[#d1fae5]' },
  dirty:       { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', border: 'border-[#fef3c7]', iconBg: 'bg-[#fef3c7]', sub: 'text-[#d97706]/60', badge: 'bg-[#fffbeb] text-[#d97706] border-[#fef3c7]' },
  maintenance: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', border: 'border-[#fee2e2]', iconBg: 'bg-[#fee2e2]', sub: 'text-[#dc2626]/60', badge: 'bg-[#fef2f2] text-[#dc2626] border-[#fee2e2]' },
  occupied:    { bg: 'bg-[#1a2b4a]', text: 'text-white', border: 'border-[#1a2b4a]', iconBg: 'bg-white/10', sub: 'text-blue-100/50', badge: 'bg-white/10 border-white/20 text-white' },
  cleaning:    { bg: 'bg-[#f5f3ff]', text: 'text-[#5b21b6]', border: 'border-[#ddd6fe]', iconBg: 'bg-[#ede9fe]', sub: 'text-[#5b21b6]/60', badge: 'bg-[#ede9fe] text-[#5b21b6] border-[#ddd6fe]' },
}

// ─── Status Message Helper ─────────────────────────
function RoomStatusBlock({ status, currentBooking, compact = false }: { status: RoomStatus; currentBooking?: any; compact?: boolean }) {
  if (currentBooking) {
    return (
      <div className={cn(
        "rounded-2xl p-4 border flex items-center gap-3",
        compact ? "bg-[#eff6ff] border-blue-50" : "bg-[#eff6ff] border-blue-100"
      )}>
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-100 shrink-0">
          {currentBooking.guest.fullName.charAt(0)}
        </div>
        <div className="overflow-hidden">
          <p className={cn("font-bold text-[#1A2B4A] truncate", compact ? "text-[13px]" : "text-[15px]")}>{currentBooking.guest.fullName}</p>
          <p className="text-[10px] text-[#2563EB] font-bold">{format(new Date(currentBooking.checkIn), 'dd MMM')} – {format(new Date(currentBooking.checkOut), 'dd MMM')}</p>
          {!compact && <p className="text-[9px] text-[#6b7280] mt-0.5">REF: {currentBooking.bookingRef}</p>}
        </div>
      </div>
    )
  }

  const config: Record<RoomStatus, { title: string; subtitle: string; icon: any; bg: string; text: string; border: string; iconBg: string }> = {
    available:   { title: 'Ready for Booking', subtitle: 'Chumba kipo wazi kwa sasa', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100', iconBg: 'bg-emerald-500' },
    occupied:    { title: 'Occupied', subtitle: 'Chumba kimejazwa na mgeni', icon: Users, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100', iconBg: 'bg-[#2563eb]' },
    dirty:       { title: 'Needs Cleaning', subtitle: 'Chumba kinahitaji usafi', icon: Sparkles, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100', iconBg: 'bg-amber-500' },
    cleaning:    { title: 'Cleaning in Progress', subtitle: 'Chumba kinasafishwa', icon: Wind, bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-100', iconBg: 'bg-indigo-500' },
    maintenance: { title: 'Under Maintenance', subtitle: 'Chumba kina matengenezo', icon: Wrench, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-100', iconBg: 'bg-red-500' },
    blocked:     { title: 'Blocked', subtitle: 'Chumba kimezuiwa', icon: Ban, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', iconBg: 'bg-gray-500' },
  }

  const cfg = config[status] || config.available
  const Icon = cfg.icon

  return (
    <div className={cn("rounded-2xl p-4 border flex items-center gap-3", cfg.bg, cfg.border)}>
      <div className={cn("w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0", cfg.iconBg)}>
        <Icon size={20} />
      </div>
      <div>
        <p className={cn("font-bold uppercase tracking-tight", cfg.text, compact ? "text-[12px]" : "text-[14px]")}>{cfg.title}</p>
        <p className={cn("font-medium text-[11px]", cfg.text.replace('800', '600'))}>{cfg.subtitle}</p>
      </div>
    </div>
  )
}

// ─── Room Type Images ──────────────────────────────
const ROOM_IMAGES: Record<string, string> = {
  standard:    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  deluxe:      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  superior:    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  suite:       'https://images.unsplash.com/photo-1578683062331-624344902b97?auto=format&fit=crop&w=800&q=80',
  family:      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=800&q=80',
  conference:  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
  presidential:'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
}

export default function RoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>()
  const [viewType, setViewType] = useState<'grid' | 'cards'>('cards')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [roomForBooking, setRoomToBooking] = useState<Room | null>(null)

  const { data: roomsData, isLoading } = useRooms({ 
    floor: selectedFloor,
    search,
    page,
    limit: 12
  })
  const { data: stats } = useRoomStats()
  const { data: floors = [] } = useFloors()
  const { mutate: deleteRoom } = useDeleteRoom()

  const rooms = roomsData?.rooms || []
  const meta = roomsData?.meta || { total: 0, totalPages: 1 }

  const handleOpenBooking = (room: Room) => {
    setRoomToBooking(room)
    setIsBookingOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setRoomToEdit(room)
    setIsFormOpen(true)
  }

  const handleDeleteRoom = () => {
    if (roomToDelete) {
      deleteRoom(roomToDelete, {
        onSuccess: () => {
          toast.success('Chumba kimefutwa tayari')
          setRoomToDelete(null)
        },
        onError: () => toast.error('Imeshindwa kufuta chumba')
      })
    }
  }

  return (
    <div className="space-y-6 font-sans text-left pb-10">
      {/* Header Section */}
      <div className="px-1 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Room Management</h1>
          <p className="text-[12px] text-[#9ca3af] font-medium mt-[-2px]">Live updates and occupancy control</p>
        </div>
        <button
          onClick={() => { setRoomToEdit(null); setIsFormOpen(true) }}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
        >
          <Plus size={16} />
          Add Room
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total room', value: stats?.total ?? 0, icon: '🚪', bg: 'bg-[#f3f4f6]' },
          { label: 'Available', value: stats?.available ?? 0, icon: '✅', bg: 'bg-[#ecfdf5]' },
          { label: 'Occupied', value: stats?.occupied ?? 0, icon: '🏠', bg: 'bg-[#eff6ff]' },
          { label: 'Need cleaning', value: stats?.dirty ?? 0, icon: '🧹', bg: 'bg-[#fff7ed]' },
        ].map((s: any) => (
          <div key={s.label} className="bg-white rounded-xl p-[16px_18px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-gray-50 flex flex-col justify-between h-[110px]">
            <div className="flex justify-between items-start">
               <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-widest">{s.label}</p>
               <span className="text-[16px]">{s.icon}</span>
            </div>
            <p className="text-[26px] font-bold text-[#111827] tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Controls Row ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 bg-white/40 p-4 rounded-2xl border border-gray-50/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 min-w-[280px] shadow-sm focus-within:border-[#2563eb]/30 transition-all">
            <Search size={16} className="text-[#9ca3af]" />
            <input 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search room number or name..."
              className="bg-transparent text-[13px] font-medium text-[#111827] outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#f3f4f6] p-0.5 rounded-[8px] border border-gray-100 shadow-sm">
              <button 
                onClick={() => setViewType('grid')}
                className={cn(
                  "p-2 rounded-[6px] transition-all",
                  viewType === 'grid' ? "bg-white text-[#2563eb] shadow-sm" : "text-[#9ca3af] hover:text-[#111827]"
                )}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewType('cards')}
                className={cn(
                  "p-2 rounded-[6px] transition-all",
                  viewType === 'cards' ? "bg-white text-[#2563eb] shadow-sm" : "text-[#9ca3af] hover:text-[#111827]"
                )}
              >
                <LayoutList size={16} />
              </button>
            </div>
            
            <select
              value={selectedFloor ?? ''}
              onChange={e => { setSelectedFloor(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
              className="text-[12px] font-bold border border-gray-100 rounded-lg px-4 py-2.5 bg-white focus:outline-none shadow-sm transition-all cursor-pointer text-[#6b7280]"
            >
              <option value="">All Floors</option>
              {floors.map((f: any) => <option key={f} value={f}>Floor {f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main View ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[240px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[24px] border border-dashed border-gray-200">
           <Info className="mx-auto text-gray-300 mb-3" size={40} />
           <p className="text-gray-400 font-bold">No rooms found</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewType === 'grid' 
            ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" 
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        )}>
          {rooms.map((room, i) => (
            viewType === 'grid' 
              ? <CompactRoomItem key={room.id} room={room} onClick={() => setSelectedRoom(room)} index={i} />
              : <HighInfoRoomCard 
                  key={room.id} 
                  room={room} 
                  onClick={() => setSelectedRoom(room)} 
                  onEdit={() => handleEditRoom(room)}
                  index={i} 
                />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-4">
           <p className="text-[11px] text-[#9ca3af] font-bold uppercase tracking-wider">
              Showing page {page} of {meta.totalPages} ({meta.total} rooms)
           </p>
           <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#2563eb] disabled:opacity-30 transition-all shadow-sm"
              >
                 <ChevronLeft size={18} />
              </button>
              <button 
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-[#9ca3af] hover:text-[#2563eb] disabled:opacity-30 transition-all shadow-sm"
              >
                 <ChevronRight size={18} />
              </button>
           </div>
        </div>
      )}

      {selectedRoom && (
        <RoomDetailModalDetailed 
          room={selectedRoom} 
          onClose={() => setSelectedRoom(null)} 
          onEdit={() => {
            setSelectedRoom(null)
            handleEditRoom(selectedRoom)
          }}
          onDelete={() => {
            setRoomToDelete(selectedRoom.id)
            setSelectedRoom(null)
          }}
          onBook={() => {
            setSelectedRoom(null)
            handleOpenBooking(selectedRoom)
          }}
        />
      )}

      {isBookingOpen && roomForBooking && (
        <NewBookingModal 
          onClose={() => {
            setIsBookingOpen(false)
            setRoomToBooking(null)
          }}
          preselectedRoomId={roomForBooking.id}
        />
      )}

      {isFormOpen && (
        <RoomFormModal 
          room={roomToEdit} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}

      <ConfirmModal 
        isOpen={!!roomToDelete}
        title="Futa Chumba"
        description="Je, una uhakika unataka kufuta chumba hiki? Hatua hii haiwezi kurejeshwa."
        confirmText="Ndiyo, Futa"
        cancelText="Hapana"
        onConfirm={handleDeleteRoom}
        onCancel={() => setRoomToDelete(null)}
      />
    </div>
  )
}

// ─── Compact Grid Item ───────────────────────────────
function CompactRoomItem({ room, onClick, index }: { room: Room; onClick: () => void; index: number }) {
  const occupiedShades = ['bg-[#1a2b4a] text-white', 'bg-[#2563eb] text-white', 'bg-[#bfdbfe] text-[#1e40af]']
  const status = room.status
  const isOccupied = status === 'occupied'
  
  const styles = STATUS_STYLES[status] || STATUS_STYLES.available

  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-110 shadow-sm",
        isOccupied ? `${occupiedShades[index % 3]} border-transparent` :
        `${styles.bg} ${styles.text} ${styles.border}`
      )}
    >
      <span className="text-[15px] font-bold">{room.roomNumber}</span>
      <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">
        {ROOM_STATUS_CONFIG[status].labelSw}
      </span>
    </button>
  )
}

// ─── High Information Room Card ─────────────────────
function HighInfoRoomCard({ room, onClick, index, onEdit }: { room: Room; onClick: () => void; index: number; onEdit: () => void }) {
  const [qrCode, setQrCode] = useState('')
  const currentBooking = room.bookings?.[0]
  const status = room.status
  const isOccupied = status === 'occupied'

  // Alternating shades for occupied matching template
  const occupiedColors = [
    { bg: 'bg-[#1a2b4a]', text: 'text-white', sub: 'text-blue-100/50', badge: 'bg-white/10 border-white/20 text-white' },
    { bg: 'bg-[#2563eb]', text: 'text-white', sub: 'text-white/50', badge: 'bg-white/10 border-white/20 text-white' },
    { bg: 'bg-[#bfdbfe]', text: 'text-[#1e40af]', sub: 'text-[#1e40af]/40', badge: 'bg-[#dbeafe] border-[#93c5fd] text-[#1e40af]' }
  ]
  const occ = occupiedColors[index % 3]

  const styles = isOccupied ? occ : (STATUS_STYLES[status] || STATUS_STYLES.available)
  const roomImage = ROOM_IMAGES[room.type] || ROOM_IMAGES.standard

  useEffect(() => {
    generateRoomQR(room.id).then(setQrCode)
  }, [room.id])

  return (
    <div 
      className="bg-white rounded-[32px] shadow-card overflow-hidden flex flex-col group hover:shadow-xl transition-all border border-gray-50 h-full cursor-pointer"
      onClick={onClick}
    >
      {/* 1. Header Visual Section */}
      <div className="h-44 relative overflow-hidden">
         <img 
           src={roomImage} 
           alt={room.roomNumber}
           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-[#111827]/20 to-transparent" />
         
         <div className="absolute top-4 left-4">
            <div className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg border-0 backdrop-blur-md", styles.badge)}>
              {ROOM_STATUS_CONFIG[status].label}
            </div>
         </div>

         <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all border border-white/20"
            >
               <Edit size={16} />
            </button>
         </div>

         <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <h4 className="text-[28px] font-bold text-white tracking-tighter leading-none drop-shadow-md">#{room.roomNumber}</h4>
              <p className="text-[11px] text-white/70 font-medium uppercase tracking-wider mt-1">{room.type}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Per Night</p>
               <p className="text-[16px] font-bold text-white">{formatTZS(room.pricePerNight)}</p>
            </div>
         </div>
      </div>

      {/* 2. Body Section */}
      <div className="p-6 flex-1 flex flex-col space-y-5">
         <div className="flex justify-between items-start">
            <div>
               <h5 className="text-[15px] font-bold text-[#111827] leading-snug">{room.name}</h5>
               <div className="flex items-center gap-3 mt-1.5 opacity-60">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#111827]">
                     <Users size={12} /> {room.capacity} Pax
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#111827]">
                     <MapPin size={12} /> Floor {room.floor}
                  </div>
               </div>
            </div>
            {qrCode && (
               <div className="bg-white p-1.5 rounded-xl shadow-lg border border-gray-100 rotate-3 group-hover:rotate-0 transition-transform">
                  <img src={qrCode} alt="QR" className="w-10 h-10" />
               </div>
            )}
         </div>

         {/* Occupant Info */}
         <div className="pt-4 border-t border-gray-50">
            <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.15em] mb-3">Live Occupancy</p>
            <RoomStatusBlock status={status} currentBooking={currentBooking} compact />
         </div>
      </div>
    </div>
  )
}

// ─── Detailed Room Side Panel ────────────────────────
function RoomDetailModalDetailed({ room, onClose, onBook, onEdit, onDelete }: { room: Room; onClose: () => void; onBook: () => void; onEdit: () => void; onDelete: () => void }) {
  const [qrCode, setQrCode] = useState('')
  const currentBooking = room.bookings?.[0]
  const status = room.status
  const styles = STATUS_STYLES[status] || STATUS_STYLES.available
  const roomImage = ROOM_IMAGES[room.type] || ROOM_IMAGES.standard

  useEffect(() => {
    generateRoomQR(room.id).then(setQrCode)
  }, [room.id])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#111827]/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[420px] h-full shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col overflow-hidden font-sans">

        {/* Compact Header */}
        <div className="h-44 relative shrink-0">
           <img src={roomImage} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-[#111827]/30 to-transparent" />
           <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/20">
              <X size={18} />
           </button>
           <div className="absolute bottom-4 left-5 right-5">
              <span className="px-2.5 py-1 bg-[#2563eb] rounded-lg text-[10px] font-bold uppercase tracking-widest mb-2 inline-block text-white shadow-lg">Room Profile</span>
              <h2 className="text-[24px] font-bold tracking-tighter text-white leading-none">#{room.roomNumber} — {room.name}</h2>
              <div className="flex items-center gap-2 mt-1.5 text-white/70 text-[11px] font-medium uppercase tracking-wider">
                 <span>{room.type}</span>
                 <span className="w-1 h-1 bg-white/30 rounded-full" />
                 <span>Floor {room.floor}</span>
              </div>
           </div>
        </div>

        <div className="p-5 overflow-y-auto thin-scrollbar flex-1">
          {/* Status & Actions */}
          <div className="flex justify-between items-center mb-5">
             <div>
                <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.2em] mb-1">Status</p>
                <span className={cn(
                  "inline-flex px-3 py-1 rounded-lg font-bold text-[11px] uppercase tracking-widest border shadow-sm",
                  styles.bg, styles.text, styles.border
                )}>
                   {ROOM_STATUS_CONFIG[status].label}
                </span>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={onEdit} className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center hover:bg-[#2563eb] hover:text-white transition-all border border-blue-100 shadow-sm" title="Edit Room">
                   <Edit size={16} />
                </button>
                <button onClick={onDelete} className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm" title="Delete Room">
                   <Trash2 size={16} />
                </button>
             </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
             <div className="bg-[#f9fafb] p-3 rounded-xl border border-[#f3f4f6]">
                <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.15em] mb-1">Nightly Cost</p>
                <p className="text-[18px] font-bold text-[#111827] tracking-tight">{formatTZS(room.pricePerNight)}</p>
             </div>
             <div className="bg-[#f9fafb] p-3 rounded-xl border border-[#f3f4f6]">
                <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.15em] mb-1">Capacity</p>
                <p className="text-[18px] font-bold text-[#111827] tracking-tight">{room.capacity} Pax</p>
             </div>
          </div>

          {/* Live Status */}
          <div className="mb-5">
             <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] mb-2">Live Status</p>
             <RoomStatusBlock status={status} currentBooking={currentBooking} />
          </div>

          {/* QR Pass */}
          <div className="bg-[#111827] rounded-2xl p-4 flex items-center gap-4 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-2xl" />
             {qrCode && (
                <div className="bg-white p-1.5 rounded-xl shrink-0 shadow-lg relative z-10">
                   <img src={qrCode} alt="Room QR" className="w-16 h-16" />
                </div>
             )}
             {!qrCode && <div className="w-16 h-16 bg-white/10 rounded-xl animate-pulse shrink-0" />}
             <div className="relative z-10 text-left">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-[0.15em] text-blue-400 mb-1">
                   <QrCode size={12} /> Guest Pass
                </div>
                <p className="text-[11px] text-white/80 font-medium leading-snug">
                   Scan to view room details or book quickly.
                </p>
                <a 
                 href={`/book?room=${room.id}`} 
                 target="_blank" 
                 className="mt-1.5 text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 hover:text-blue-300 transition-colors"
                >
                  Preview <ExternalLink size={10} />
                </a>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#f3f4f6] bg-white shrink-0 flex gap-3">
           <button 
              onClick={onBook}
              className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2"
           >
              Reserve Now
           </button>
           <button onClick={onClose} className="px-6 h-11 border border-[#e5e7eb] text-[#6b7280] rounded-xl font-bold text-[13px] hover:bg-[#f9fafb] transition-all">
              Close
           </button>
        </div>
      </div>
    </div>
  )
}
