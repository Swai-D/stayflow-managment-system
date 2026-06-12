'use client'

import { Room, RoomStatus, ROOM_STATUS_CONFIG, ROOM_TYPE_LABELS } from '@/types/room'
import { useUpdateRoomStatus } from '@/hooks/useRooms'
import { X, User, Calendar, Clock, Wifi, Check, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface Props {
  room: Room
  onClose: () => void
  onEdit?: () => void
}

// Default housekeeping checklist
const DEFAULT_CHECKLIST = [
  'Tupa takataka na kubadilisha mfuko',
  'Fua au piga utupu sakafu',
  'Weka tishu, sabuni na vifaa vya bafu',
  'Futa na safisha nyuso zote (meza, taa, rafu)',
  'Safisha choo, sinki na bafu/shower',
  'Badilisha taulo zilizotumika',
]

export default function RoomDetailModal({ room, onClose, onEdit }: Props) {
  const config = ROOM_STATUS_CONFIG[room.status]
  const { mutate: updateStatus, isPending } = useUpdateRoomStatus()
  const currentBooking = room.bookings?.[0]
  const { user } = useAuthStore()

  const handleStatusChange = (status: RoomStatus) => {
    updateStatus({ id: room.id, status }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-[560px] max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">
                Room {room.roomNumber}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                config.bgClass, config.textClass
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {room.name} · Floor {room.floor} ·{' '}
              {ROOM_TYPE_LABELS[room.type]} ·{' '}
              Watu {room.capacity}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {user?.role === 'admin' && onEdit && (
              <button
                onClick={onEdit}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                title="Hariri Chumba"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Current guest */}
          {currentBooking && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Mgeni wa Sasa</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {currentBooking.guest.fullName}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(currentBooking.checkIn).toLocaleDateString('en-GB')}
                  {' → '}
                  {new Date(currentBooking.checkOut).toLocaleDateString('en-GB')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Ref: {currentBooking.bookingRef}
                </span>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between py-3 border-y border-gray-100">
            <span className="text-sm text-gray-500">Bei kwa usiku</span>
            <span className="text-sm font-semibold text-gray-900">
              TZS {room.pricePerNight.toLocaleString()}
            </span>
          </div>

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={14} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Vifaa vya Chumba</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map(a => (
                  <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Housekeeping checklist */}
          {(room.status === 'dirty' || room.status === 'cleaning') && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Kazi za Usafi</p>
              <div className="space-y-2">
                {DEFAULT_CHECKLIST.map((task, i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5 group-hover:border-primary transition-colors" />
                    <span className="text-sm text-gray-600">{task}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status actions */}
          <div className="space-y-2 pt-2">
            {room.status === 'dirty' && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                onClick={() => handleStatusChange('cleaning')}
                disabled={isPending}
              >
                Anza Kusafisha
              </Button>
            )}
            {room.status === 'cleaning' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={() => handleStatusChange('available')}
                disabled={isPending}
              >
                <Check size={15} className="mr-1.5" />
                Imekamilika — Chumba Safi
              </Button>
            )}
            {room.status === 'available' && (
              <Button
                variant="outline"
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => handleStatusChange('maintenance')}
                disabled={isPending}
              >
                Weka Matengenezo
              </Button>
            )}
            {room.status === 'maintenance' && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white"
                onClick={() => handleStatusChange('available')}
                disabled={isPending}
              >
                Matengenezo Yamekamilika
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
