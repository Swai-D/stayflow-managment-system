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
  ChevronLeft, Plus, Edit, Trash2, ExternalLink, X
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
            {currentBooking ? (
               <div className="bg-[#eff6ff] rounded-2xl p-4 border border-blue-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-100">
                        {currentBooking.guest.fullName.charAt(0)}
                     </div>
                     <div className="overflow-hidden">
                        <p className="text-[13px] font-bold text-[#1A2B4A] truncate">{currentBooking.guest.fullName}</p>
                        <p className="text-[10px] text-[#2563EB] font-bold">{format(new Date(currentBooking.checkIn), 'dd MMM')} – {format(new Date(currentBooking.checkOut), 'dd MMM')}</p>
                     </div>
                  </div>
                  <ChevronRight size={16} className="text-[#2563EB] opacity-40" />
               </div>
            ) : (
               <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-100">
                     <CheckCircle2 size={20} />
                  </div>
                  <div>
                     <p className="text-[12px] font-bold text-emerald-800 uppercase tracking-tight">Ready for Booking</p>
                     <p className="text-[10px] text-emerald-600 font-medium">Chumba kipo wazi kwa sasa</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  )
}

// ─── Detailed Modal Component ────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-[#111827]/40" onClick={onClose} />
      <div className="relative bg-white rounded-[32px] w-full max-w-[540px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header Image */}
        <div className="h-64 relative bg-gray-100">
           <img src={roomImage} className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-transparent to-transparent" />
           <div className="absolute bottom-6 left-8 right-8 text-left">
              <span className="px-3 py-1 bg-[#2563eb] rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3 inline-block text-white shadow-lg shadow-blue-500/20">Room Profile</span>
              <h2 className="text-[32px] font-bold tracking-tighter text-white leading-none">#{room.roomNumber} — {room.name}</h2>
              <div className="flex items-center gap-3 mt-2 text-white/70 text-[12px] font-medium uppercase tracking-widest">
                 <span>{room.type}</span>
                 <span className="w-1 h-1 bg-white/30 rounded-full" />
                 <span>Floor {room.floor}</span>
              </div>
           </div>
           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/20">
              <X size={20} />
           </button>
        </div>

        <div className="p-8 flex flex-col text-left font-sans h-full overflow-y-auto thin-scrollbar">
          <div className="flex justify-between items-center mb-8">
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
                <button onClick={onEdit} className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center hover:bg-[#2563eb] hover:text-white transition-all border border-blue-100 shadow-sm" title="Edit Room">
                   <Edit size={18} />
                </button>
                <button onClick={onDelete} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm" title="Delete Room">
                   <Trash2 size={18} />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.15em] mb-1">Nightly Cost</p>
                <p className="text-[20px] font-bold text-[#111827] tracking-tight">{formatTZS(room.pricePerNight)}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.15em] mb-1">Capacity</p>
                <p className="text-[20px] font-bold text-[#111827] tracking-tight">{room.capacity} Persons</p>
             </div>
          </div>

          <div className="space-y-8 flex-1">
             {currentBooking ? (
                <div>
                   <h4 className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] mb-3">Occupancy Context</h4>
                   <div className="bg-[#eff6ff] rounded-2xl p-5 border border-blue-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">
                            {currentBooking.guest.fullName.charAt(0)}
                         </div>
                         <div>
                            <p className="text-[16px] font-bold text-[#1A2B4A]">{currentBooking.guest.fullName}</p>
                            <p className="text-[11px] font-semibold text-[#2563EB] tracking-wide">
                               REF: {currentBooking.bookingRef}
                            </p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[14px] font-bold text-[#1A2B4A]">{format(new Date(currentBooking.checkIn), 'dd MMM')}</p>
                         <p className="text-[10px] text-[#2563EB] font-bold uppercase tracking-widest">Arrival</p>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4 shadow-sm">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                      <CheckCircle2 size={24} />
                   </div>
                   <div>
                      <p className="text-[15px] font-bold text-emerald-800">Operational Ready</p>
                      <p className="text-[12px] text-emerald-600 font-medium">Chumba kipo wazi kwa ajili ya usajili mpya.</p>
                   </div>
                </div>
             )}

             <div className="bg-[#111827] rounded-[28px] p-6 flex items-center gap-6 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                {qrCode && (
                  <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg relative z-10 transition-transform group-hover:scale-105">
                    <img src={qrCode} alt="Room QR" className="w-20 h-20" />
                  </div>
                )}
                {!qrCode && <div className="w-20 h-20 bg-white/10 rounded-xl animate-pulse shrink-0" />}
                <div className="relative z-10 text-left">
                   <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-[0.15em] text-blue-400 mb-1">
                      <QrCode size={14} /> Guest Digital Pass
                   </div>
                   <p className="text-[12px] text-white font-medium leading-snug">
                      Mgeni anaweza ku-scan hapa kupata maelezo na kufanya booking ya haraka.
                   </p>
                   <a 
                    href={`/book?room=${room.id}`} 
                    target="_blank" 
                    className="mt-2 text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 hover:text-blue-300 transition-colors"
                   >
                     Preview Portal <ExternalLink size={12} />
                   </a>
                </div>
             </div>
          </div>

          <div className="flex gap-4 mt-8">
             <button 
                onClick={onBook}
                className="flex-1 h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-[14px] transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2"
             >
                Reserve Now
             </button>
             <button onClick={onClose} className="px-8 h-14 border border-gray-100 text-[#6b7280] rounded-2xl font-bold text-[14px] hover:bg-gray-50 transition-all">
                Close
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
