# ⚠️ DESIGN REFERENCE — READ BEFORE WRITING ANY UI CODE
> Design: YowStay Hotel Management Dashboard
> Link  : https://dribbble.com/shots/25764240-YowStay-Hotel-Management-Dashboard
> Rules : White bg, Blue (#2563EB) only accent, Inter font, NO purple, NO gradients
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# STAYFLOW — PHASE 1, TASK 5: CHECK-IN/CHECK-OUT FLOW + ROOM SYNC
> Tegemea: Task 4 imekamilika (Booking CRUD + Availability)
> Matokeo: End-to-end flow inayoonekana — Book → Check-in → Room inabadilika rangi
>          → Check-out → Room inakuwa Dirty → Housekeeping inaona
>
> HII NI DEMO INAYOMVUTIA CLIENT — onyesha hii wiki hii.

---

## OVERVIEW

```
Lengo: Mtu anayetazama anaona mfumo "unafanya kazi" — si vipande tofauti

Flow itakayoonekana:
1. Reservations page → bonyeza booking → "Check In" button
2. → Rooms page inaonyesha chumba kimebadilika kuwa rangi ya bluu (Occupied)
3. → Reservations page → "Check Out" button
4. → Rooms page: chumba kinakuwa rangi ya amber (Dirty)
5. → Housekeeping page: chumba kinaonekana kwenye "Need Cleaning"
6. → Housekeeping: "Start Cleaning" → "Mark Clean" → Rooms page: chumba kinarudi White (Available)
```

---

## TASK 5A — Wire useCheckIn / useCheckOut Hooks Properly

> Task 4 iliandika placeholder hooks ndani ya BookingDetailModal — tuzifanye real.

### apps/web/hooks/useBookings.ts — Confirm zipo na zinafanya kazi:
```typescript
export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-in`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })       // ← MUHIMU
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
    }
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/check-out`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })       // ← MUHIMU
      queryClient.invalidateQueries({ queryKey: ['rooms', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] })
    }
  })
}
```

---

## TASK 5B — Fix BookingDetailModal (Real Hooks)

### apps/web/app/(dashboard)/reservations/page.tsx — Update BookingDetailModal:

> Task 4 iliandika placeholder functions ndani ya component. Zibadilishe na real hooks.

```typescript
// ─── Booking Detail Modal — UPDATED ───────────────────
function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  // ✅ Tumia real hooks kutoka useBookings.ts — ONDOA placeholder functions za Task 4
  const { mutate: checkIn,  isPending: checkingIn }  = useCheckIn()
  const { mutate: checkOut, isPending: checkingOut } = useCheckOut()
  const { mutate: cancel,   isPending: cancelling }  = useCancelBooking()

  const [confirmCancel, setConfirmCancel] = useState(false)

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  )

  const handleCheckIn = () => {
    checkIn(booking.id, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        alert(err?.response?.data?.error?.message || 'Imeshindwa kufanya check-in')
      }
    })
  }

  const handleCheckOut = () => {
    checkOut(booking.id, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        alert(err?.response?.data?.error?.message || 'Imeshindwa kufanya check-out')
      }
    })
  }

  const handleCancel = () => {
    cancel({ id: booking.id, reason: 'Imefutwa na staff' }, {
      onSuccess: () => onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-[520px] overflow-hidden"
           style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[20px] font-bold text-gray-900">{booking.bookingRef}</h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_CONFIG[booking.status].className}`}>
                {STATUS_CONFIG[booking.status].label}
              </span>
            </div>
            <p className="text-[13px] text-gray-500">
              {booking.guest.fullName} · Room {booking.room.roomNumber}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg mt-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Check In',   value: formatDate(booking.checkIn) },
              { label:'Check Out',  value: formatDate(booking.checkOut) },
              { label:'Nights',     value: `${nights} nights` },
              { label:'Guests',     value: `${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}` },
              { label:'Room Total', value: formatTZS(booking.roomTotal) },
              { label:'Balance Due',value: formatTZS(booking.balanceDue) },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
                <p className="text-[13px] font-semibold text-gray-900 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Actual timestamps — show if checked in/out */}
          {(booking.actualCheckIn || booking.actualCheckOut) && (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 space-y-1">
              {booking.actualCheckIn && (
                <p className="text-[12px] text-blue-700">
                  ✓ Check-in: {new Date(booking.actualCheckIn).toLocaleString('en-GB')}
                </p>
              )}
              {booking.actualCheckOut && (
                <p className="text-[12px] text-blue-700">
                  ✓ Check-out: {new Date(booking.actualCheckOut).toLocaleString('en-GB')}
                </p>
              )}
            </div>
          )}

          {/* Special requests */}
          {booking.specialRequests && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-amber-600 uppercase font-semibold mb-1">Mahitaji Maalum</p>
              <p className="text-[12px] text-gray-700">{booking.specialRequests}</p>
            </div>
          )}

          {/* Cancel confirmation */}
          {confirmCancel && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-[13px] font-semibold text-red-700">
                Una uhakika unataka kufuta booking hii?
              </p>
              <div className="flex gap-2">
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[12px] font-bold hover:bg-red-700">
                  {cancelling ? 'Inafuta...' : 'Ndiyo, Futa'}
                </button>
                <button onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-medium hover:bg-gray-50">
                  Hapana
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!confirmCancel && (
            <div className="flex gap-2 pt-1">
              {/* Check In — only for pending/confirmed */}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <button onClick={handleCheckIn} disabled={checkingIn}
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60">
                  {checkingIn ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inafanya Check-in...
                    </span>
                  ) : '✓ Check In'}
                </button>
              )}

              {/* Check Out — only for checked_in */}
              {booking.status === 'checked_in' && (
                <button onClick={handleCheckOut} disabled={checkingOut}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60">
                  {checkingOut ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inafanya Check-out...
                    </span>
                  ) : 'Check Out'}
                </button>
              )}

              {/* Cancel — only pending/confirmed */}
              {['pending','confirmed'].includes(booking.status) && (
                <button onClick={() => setConfirmCancel(true)}
                  className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-[13px] font-medium hover:bg-red-50 transition-colors">
                  Futa
                </button>
              )}

              {/* Show final state — read only */}
              {['checked_out','cancelled','no_show'].includes(booking.status) && (
                <div className="flex-1 py-2.5 text-center text-[13px] text-gray-400 bg-gray-50 rounded-xl">
                  Booking hii imekamilika
                </div>
              )}

              <button onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors">
                Funga
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Import statement — update at top of reservations/page.tsx:
```typescript
import {
  useBookings, useBookingStats,
  useCheckIn, useCheckOut, useCancelBooking  // ← ongeza hizi
} from '@/hooks/useBookings'
```

---

## TASK 5C — Rooms Page: Use Real API Data

> Task 3 iliandika `rooms/page.tsx` na SAMPLE_ROOMS hardcoded.
> Sasa tubadilishe kutumia `useRooms()` hook ya kweli kutoka Task 3 backend.

### apps/web/app/(dashboard)/rooms/page.tsx — Replace data source:

```typescript
'use client'

import { useState } from 'react'
import { useRooms, useRoomStats, useFloors } from '@/hooks/useRooms'
import { Room, ROOM_STATUS_CONFIG } from '@/types/room'

// ─── Status → Grid color mapping (YowStay style) ──────
const GRID_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  available:   { bg:'#EFF6FF', border:'#BFDBFE', text:'#1e40af' },
  occupied:    { bg:'#1A2B4A', border:'#1A2B4A', text:'#ffffff' },
  dirty:       { bg:'#FEF3C7', border:'#FDE68A', text:'#92400e' },
  cleaning:    { bg:'#E0E7FF', border:'#C7D2FE', text:'#3730a3' },
  maintenance: { bg:'#FEE2E2', border:'#FECACA', text:'#991b1b' },
  blocked:     { bg:'#F3F4F6', border:'#E5E7EB', text:'#6B7280' },
}

export default function RoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>()
  const [selectedRoom, setSelectedRoom]   = useState<Room | null>(null)

  const { data: rooms = [], isLoading } = useRooms({ floor: selectedFloor })
  const { data: stats }  = useRoomStats()
  const { data: floors = [] } = useFloors()

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-gray-900">Room Status</h1>

      {/* Stats row — from real API */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total rooms',     value: stats?.total ?? '—' },
          { label:'Available',       value: stats?.available ?? '—' },
          { label:'Occupied',         value: stats?.occupied ?? '—' },
          { label:'Occupancy Rate',   value: stats ? `${stats.occupancyRate}%` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl px-5 py-4"
               style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-2">{s.label}</p>
            <p className="text-[28px] font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Room grid card */}
      <div className="bg-white rounded-xl" style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">Room Status</h2>
          <select
            value={selectedFloor ?? ''}
            onChange={e => setSelectedFloor(e.target.value ? Number(e.target.value) : undefined)}
            className="text-[12px] border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 bg-white focus:outline-none">
            <option value="">All floors</option>
            {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(6, 1fr)' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-gray-400">Hakuna vyumba</p>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(6, 1fr)' }}>
              {rooms.map(room => {
                const colors = GRID_COLORS[room.status] || GRID_COLORS.available
                const currentBooking = room.bookings?.[0]

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="rounded-xl p-2.5 text-left transition-all hover:scale-[1.03] hover:shadow-md cursor-pointer"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                  >
                    <p className="text-[15px] font-bold leading-tight mb-1">{room.roomNumber}</p>

                    {currentBooking && (
                      <div>
                        <p className="text-[10px] font-semibold leading-tight truncate">
                          {currentBooking.guest.fullName}
                        </p>
                        <p className="text-[9px] opacity-70 leading-tight mt-0.5">
                          {new Date(currentBooking.checkIn).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit'})}
                          {' – '}
                          {new Date(currentBooking.checkOut).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit'})}
                        </p>
                      </div>
                    )}

                    {!currentBooking && room.status !== 'available' && (
                      <p className="text-[10px] font-semibold leading-tight">
                        {ROOM_STATUS_CONFIG[room.status]?.labelSw}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            {[
              { color:'#1A2B4A', label:'Occupied' },
              { color:'#FEF3C7', label:'Need cleaning' },
              { color:'#E0E7FF', label:'Cleaning' },
              { color:'#EFF6FF', label:'Available', border:'#BFDBFE' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full"
                     style={{ background:l.color, border: l.border ? `1px solid ${l.border}` : undefined }} />
                <span className="text-[11px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room Detail Modal — kutoka Task 3, reuse RoomDetailModal component */}
      {selectedRoom && (
        <RoomDetailModalReal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  )
}

// ─── Real Room Detail Modal — connects to actual booking data ─────
function RoomDetailModalReal({ room, onClose }: { room: Room; onClose: () => void }) {
  const currentBooking = room.bookings?.[0]
  const colors = GRID_COLORS[room.status] || GRID_COLORS.available

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-[480px] overflow-hidden"
           style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[22px] font-bold text-gray-900">Room {room.roomNumber}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: colors.bg, color: colors.text, border:`1px solid ${colors.border}` }}>
                {ROOM_STATUS_CONFIG[room.status]?.label}
              </span>
            </div>
            <p className="text-[13px] text-gray-500">
              {room.name} · Floor {room.floor} · TZS {Number(room.pricePerNight).toLocaleString()}/usiku
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Current guest */}
          {currentBooking ? (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-blue-600 uppercase mb-2">Mgeni wa Sasa</p>
              <p className="text-[15px] font-bold text-gray-900">{currentBooking.guest.fullName}</p>
              <p className="text-[12px] text-gray-500 mt-1">
                {new Date(currentBooking.checkIn).toLocaleDateString('en-GB')} → {new Date(currentBooking.checkOut).toLocaleDateString('en-GB')}
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-1">Ref: {currentBooking.bookingRef}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-[13px] text-gray-400">Hakuna mgeni — chumba {room.status === 'available' ? 'kinapatikana' : ROOM_STATUS_CONFIG[room.status]?.labelSw}</p>
            </div>
          )}

          {/* Amenities */}
          {room.amenities?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-700 mb-2">Vifaa</p>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map((a: string) => (
                  <span key={a} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[13px] font-bold transition-colors">
            Funga
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## TASK 5D — Housekeeping Page: Real Data + Status Actions

> Task 3 iliandika `housekeeping/page.tsx` na ROOMS hardcoded.
> Sasa tuiunganishe na `useRooms()` + `useUpdateRoomStatus()`.

### apps/web/app/(dashboard)/housekeeping/page.tsx — Replace:

```typescript
'use client'

import { useState } from 'react'
import { useRooms, useUpdateRoomStatus } from '@/hooks/useRooms'
import { Room, RoomStatus } from '@/types/room'

const HK_DISPLAY: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  available:   { label:'Clean & Ready', bg:'#DCFCE7', border:'#86EFAC', text:'#166534', dot:'#22C55E' },
  dirty:       { label:'Need Cleaning', bg:'#FEF3C7', border:'#FDE68A', text:'#92400E', dot:'#F59E0B' },
  cleaning:    { label:'In Progress',   bg:'#E0E7FF', border:'#C7D2FE', text:'#3730A3', dot:'#6366F1' },
  occupied:    { label:'Occupied',      bg:'#DBEAFE', border:'#93C5FD', text:'#1D4ED8', dot:'#2563EB' },
  maintenance: { label:'Maintenance',   bg:'#FEE2E2', border:'#FECACA', text:'#991B1B', dot:'#EF4444' },
  blocked:     { label:'Blocked',       bg:'#F3F4F6', border:'#E5E7EB', text:'#6B7280', dot:'#9CA3AF' },
}

export default function HousekeepingPage() {
  const [floor, setFloor]   = useState<number | undefined>()
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all')
  const [selected, setSelected] = useState<Room | null>(null)

  const { data: allRooms = [], isLoading } = useRooms({ floor })
  const { mutate: updateStatus, isPending } = useUpdateRoomStatus()

  const rooms = allRooms.filter(r => filter === 'all' || r.status === filter)

  const counts = {
    all:      allRooms.length,
    dirty:    allRooms.filter(r=>r.status==='dirty').length,
    cleaning: allRooms.filter(r=>r.status==='cleaning').length,
    available:allRooms.filter(r=>r.status==='available').length,
    occupied: allRooms.filter(r=>r.status==='occupied').length,
  }

  const handleStatusChange = (roomId: string, newStatus: RoomStatus) => {
    updateStatus({ id: roomId, status: newStatus }, {
      onSuccess: () => setSelected(null)
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-gray-900">Housekeeping</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key:'dirty',     label:'Need Cleaning', color:'#F59E0B', bg:'#FFFBEB' },
          { key:'cleaning',  label:'In Progress',   color:'#6366F1', bg:'#EEF2FF' },
          { key:'available', label:'Clean & Ready', color:'#22C55E', bg:'#F0FDF4' },
          { key:'occupied',  label:'Occupied',      color:'#2563EB', bg:'#EFF6FF' },
        ].map(s => (
          <div key={s.key} className="bg-white rounded-xl px-5 py-4"
               style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background:s.color }} />
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
            <p className="text-[28px] font-bold text-gray-900">{counts[s.key as keyof typeof counts]}</p>
          </div>
        ))}
      </div>

      {/* Room cards */}
      <div className="bg-white rounded-xl" style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex gap-1">
            {([['all','All'],['dirty','Dirty'],['cleaning','Cleaning'],['available','Clean']] as const).map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  filter===val ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {label} {val !== 'all' && `(${counts[val as keyof typeof counts]})`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 grid gap-3" style={{ gridTemplateColumns:'repeat(3, 1fr)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">
              {filter === 'dirty' ? '🎉 Hakuna chumba kinachohitaji kusafishwa!' : 'Hakuna vyumba'}
            </p>
          </div>
        ) : (
          <div className="p-5 grid gap-3" style={{ gridTemplateColumns:'repeat(3, 1fr)' }}>
            {rooms.map(room => {
              const cfg = HK_DISPLAY[room.status] || HK_DISPLAY.available
              const currentBooking = room.bookings?.[0]

              return (
                <div key={room.id}
                  onClick={() => setSelected(room)}
                  className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
                  style={{ background:cfg.bg, border:`1px solid ${cfg.border}` }}>

                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[18px] font-bold" style={{ color:cfg.text }}>{room.roomNumber}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">{room.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold"
                         style={{ background:'rgba(255,255,255,0.7)', color:cfg.text }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background:cfg.dot }} />
                      {cfg.label}
                    </div>
                  </div>

                  {currentBooking && (
                    <p className="text-[11px] font-semibold text-gray-700">{currentBooking.guest.fullName}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Action modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-[400px] p-6"
               style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-gray-900">Room {selected.roomNumber}</h3>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <p className="text-[13px] text-gray-500 mb-1">{selected.name}</p>
            <p className="text-[12px] mb-5">
              Hali ya sasa: <span className="font-semibold">{HK_DISPLAY[selected.status]?.label}</span>
            </p>

            <div className="space-y-2">
              {selected.status === 'dirty' && (
                <button onClick={() => handleStatusChange(selected.id, 'cleaning')} disabled={isPending}
                  className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl text-[13px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60">
                  {isPending ? 'Inasasisha...' : 'Anza Kusafisha'}
                </button>
              )}
              {selected.status === 'cleaning' && (
                <button onClick={() => handleStatusChange(selected.id, 'available')} disabled={isPending}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl text-[13px] font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
                  {isPending ? 'Inasasisha...' : '✓ Imekamilika — Chumba Safi'}
                </button>
              )}
              {selected.status === 'available' && (
                <button onClick={() => handleStatusChange(selected.id, 'maintenance')} disabled={isPending}
                  className="w-full py-2.5 border border-amber-200 text-amber-700 rounded-xl text-[13px] font-medium hover:bg-amber-50 transition-colors disabled:opacity-60">
                  Weka Matengenezo
                </button>
              )}
              {selected.status === 'maintenance' && (
                <button onClick={() => handleStatusChange(selected.id, 'available')} disabled={isPending}
                  className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl text-[13px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60">
                  Matengenezo Yamekamilika
                </button>
              )}
              {selected.status === 'occupied' && (
                <div className="text-center py-2 text-[12px] text-gray-400">
                  Chumba kina mgeni — subiri check-out
                </div>
              )}

              <button onClick={() => setSelected(null)}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-colors">
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## CHECKPOINT — Verify Task 5 (END-TO-END DEMO)

> Hii ndiyo demo utakayomwonyesha client. Fanya hatua hizi kwa mpangilio:

### Demo Script (kwa client mwishoni mwa wiki):

```
1. Fungua /reservations
   → Onyesha bookings zilizopo (kutoka Task 4)

2. Bonyeza booking yenye status "Confirmed" au "Pending"
   → Modal inafunguka, bonyeza "✓ Check In"
   → Modal inafunga, status inabadilika kuwa "Checked in"

3. Fungua /rooms
   → ONYESHA: chumba kile sasa kina rangi YA BLUU YA GIZA (#1A2B4A) — Occupied
   → Hii ndiyo "wow moment" — booking imebadilisha room status moja kwa moja

4. Rudi /reservations, fungua booking ile ile (sasa "Checked in")
   → Bonyeza "Check Out"
   → Status inabadilika kuwa "Checked out"

5. Fungua /rooms tena
   → ONYESHA: chumba sasa kina rangi YA AMBER (#FEF3C7) — Dirty

6. Fungua /housekeeping
   → ONYESHA: chumba kile kiko kwenye "Need Cleaning"
   → Bonyeza chumba → "Anza Kusafisha" → status: Cleaning (rangi ya indigo)
   → Bonyeza tena → "Imekamilika — Chumba Safi" → status: Available

7. Rudi /rooms
   → ONYESHA: chumba kimerudi rangi NYEUPE/BLUU LIGHT (#EFF6FF) — Available

   ✅ FULL CYCLE IMEKAMILIKA — hii inaonyesha mfumo "una akili"
```

### Technical Checklist:
- [ ] Check-in kutoka reservations → room color inabadilika kwenye /rooms (bila refresh manual)
- [ ] Check-out → room inakuwa dirty (amber)
- [ ] Housekeeping → status actions zinafanya kazi (dirty → cleaning → available)
- [ ] Stats cards kwenye /rooms zinasasishwa baada ya kila mabadiliko
- [ ] React Query invalidation inafanya kazi — HAKUNA manual page refresh inayohitajika
- [ ] Cancel booking → room haibadiliki kama haikuwa occupied
- [ ] Loading states zinaonekana wakati wa mutations (spinner kwenye buttons)

---

## KUMBUKA KWA GEMINI/AI AGENT

1. **Hii ni demo task — UI flow ndiyo muhimu zaidi**, si features mpya
2. **React Query invalidation** ndiyo "siri" ya real-time feel — angalia kila mutation ina `invalidateQueries(['rooms'])`
3. **Usiongeze features mpya** — lengo ni kuunganisha vipande vilivyopo vya Task 3 + 4
4. **Test manually** — fanya full cycle kabla ya kuripoti "done"
5. **Design**: rangi za room status zibaki kama Task 3 — `#1A2B4A` occupied, `#FEF3C7` dirty, `#EFF6FF` available

---

*StayFlow Phase 1 Task 5 — End-to-End Check-in/Check-out Demo*
*Next: Phase 2 Task 1 — Payments (Snippe) + PDF Receipts*
