import { Room, ROOM_STATUS_CONFIG } from '@/types/room'
import { cn } from '@/lib/utils'
import { User, Wrench, Sparkles } from 'lucide-react'

interface Props {
  room: Room
  onClick: () => void
}

export default function RoomCard({ room, onClick }: Props) {
  const config = ROOM_STATUS_CONFIG[room.status]
  const currentBooking = room.bookings?.[0]
  const guestName = currentBooking?.guest?.fullName

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })

  const isDark = room.status === 'occupied'

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[4/3.5] rounded-xl border p-2.5 text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer group",
        config.bgClass,
        config.borderClass
      )}
    >
      {/* Room number */}
      <div className="flex items-start justify-between mb-1">
        <span className={cn("text-[15px] font-bold", config.textClass)}>
          {room.roomNumber}
        </span>
        {/* Status icon */}
        <span className={cn("transition-opacity", isDark ? "text-white/60" : "text-gray-300 group-hover:text-gray-400")}>
          {room.status === 'occupied' && <User size={14} />}
          {room.status === 'maintenance' && <Wrench size={14} />}
          {(room.status === 'dirty' || room.status === 'cleaning') && <Sparkles size={14} />}
        </span>
      </div>

      {/* Guest info (if occupied/booked) */}
      {currentBooking ? (
        <div className="min-w-0 mt-1">
          <p className={cn("text-[10px] font-bold truncate leading-tight", isDark ? "text-white" : "text-gray-900")}>
            {guestName || 'Occupied'}
          </p>
          <p className={cn("text-[9px] leading-tight mt-0.5", isDark ? "text-white/70" : "text-gray-400")}>
            {formatDate(currentBooking.checkIn)} – {formatDate(currentBooking.checkOut)}
          </p>
          
          {/* Action dots placeholder like template */}
          {isDark && (
            <div className="flex gap-1 mt-2">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px]">🔔</div>
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px]">▶</div>
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px]">👤</div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-auto">
           <p className={cn("text-[10px] font-medium leading-tight", config.textClass)}>
            {config.labelSw}
          </p>
        </div>
      )}
    </button>
  )
}
