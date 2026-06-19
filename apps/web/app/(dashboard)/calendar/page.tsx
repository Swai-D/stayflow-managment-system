'use client'

import { useMemo, useState } from 'react'
import { useCalendarReport, CalendarBooking, CalendarRoom } from '@/hooks/useReports'
import { useCreateBooking } from '@/hooks/useBookings'
import { cn } from '@/lib/utils'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isSunday, isSaturday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, BedDouble, Users } from 'lucide-react'
import { toast } from 'sonner'
import NewBookingModal from '@/components/reservations/NewBookingModal'
import { ROOM_TYPE_LABELS } from '@/types/room'

type CellStatus = 'available' | 'occupied' | 'checkin' | 'checkout'

function getCellStatus(date: Date, bookings: CalendarBooking[]): CellStatus {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  for (const b of bookings) {
    const checkIn = parseISO(b.checkIn)
    const checkOut = parseISO(b.checkOut)
    checkIn.setHours(0, 0, 0, 0)
    checkOut.setHours(0, 0, 0, 0)

    if (isSameDay(dayStart, checkIn)) return 'checkin'
    if (isSameDay(dayStart, checkOut)) return 'checkout'
    if (dayStart > checkIn && dayStart < checkOut) return 'occupied'
  }
  return 'available'
}

function getBookingForCell(date: Date, bookings: CalendarBooking[]): CalendarBooking | null {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  return bookings.find(b => {
    const checkIn = parseISO(b.checkIn)
    const checkOut = parseISO(b.checkOut)
    checkIn.setHours(0, 0, 0, 0)
    checkOut.setHours(0, 0, 0, 0)
    return dayStart >= checkIn && dayStart <= checkOut
  }) || null
}

const STATUS_CONFIG: Record<CellStatus, { label: string; bg: string; border: string; text: string }> = {
  available: { label: 'Available', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
  occupied:  { label: 'Occupied',  bg: 'bg-[#1a2b4a]', border: 'border-[#1a2b4a]', text: 'text-white' },
  checkin:   { label: 'Check-in',  bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
  checkout:  { label: 'Check-out', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedCell, setSelectedCell] = useState<{ room: CalendarRoom; date: Date } | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)

  const year = currentMonth.getFullYear()
  const { data: calendarData, isLoading } = useCalendarReport(year)

  const rooms = calendarData?.rooms || []
  const bookings = calendarData?.bookings || []

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {}
    for (const b of bookings) {
      if (!map[b.roomId]) map[b.roomId] = []
      map[b.roomId].push(b)
    }
    return map
  }, [bookings])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const handleCellClick = (room: CalendarRoom, date: Date) => {
    const booking = getBookingForCell(date, bookingsByRoom[room.id] || [])
    if (booking) {
      setSelectedBooking(booking)
      return
    }
    setSelectedCell({ room, date })
  }

  return (
    <div className="space-y-5 font-sans text-left pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Calendar View</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Tazama upatikanaji wa vyumba kwa mwaka mzima</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleToday} className="h-10 px-4 border border-gray-100 bg-white rounded-xl text-[12px] font-bold text-[#6b7280] hover:bg-gray-50 transition-all">
            Leo
          </button>
          <div className="flex items-center bg-white border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={handlePrevMonth} className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 text-[#6b7280]">
              <ChevronLeft size={18} />
            </button>
            <div className="h-10 px-4 flex items-center gap-2 min-w-[160px] justify-center">
              <CalendarIcon size={16} className="text-[#2563eb]" />
              <span className="text-[13px] font-bold text-[#111827]">{format(currentMonth, 'MMMM yyyy')}</span>
            </div>
            <button onClick={handleNextMonth} className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 text-[#6b7280]">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border", cfg.bg, cfg.border)} />
            <span className="text-[11px] font-medium text-[#6b7280]">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="animate-pulse flex items-center gap-3 text-[#9ca3af]">
              <CalendarIcon size={24} /> Inapakia kalenda...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              {/* Days header */}
              <div
                className="grid sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b-2 border-gray-200"
                style={{ gridTemplateColumns: `180px repeat(${days.length}, minmax(44px, 1fr))` }}
              >
                <div className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-r-2 border-gray-200">
                  <BedDouble size={14} /> Room
                </div>
                {days.map(day => {
                  const isWeekend = isSaturday(day) || isSunday(day)
                  const isEndOfWeek = isSunday(day)
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-2 text-center border-r min-w-[44px]",
                        isSameDay(day, new Date()) ? "bg-blue-100" : isWeekend ? "bg-gray-100/70" : "bg-gray-50/50",
                        isEndOfWeek ? "border-r-2 border-r-gray-300" : "border-gray-200"
                      )}
                    >
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        isWeekend ? "text-gray-500" : "text-gray-400"
                      )}>{format(day, 'EEE')}</p>
                      <p className={cn(
                        "text-[13px] font-bold mt-0.5",
                        isSameDay(day, new Date()) ? "text-[#2563eb]" : isWeekend ? "text-gray-700" : "text-[#111827]"
                      )}>{format(day, 'd')}</p>
                    </div>
                  )
                })}
              </div>

              {/* Rooms rows */}
              <div className="border-b-2 border-gray-200">
                {rooms.map((room, roomIdx) => {
                  const roomBookings = bookingsByRoom[room.id] || []
                  return (
                    <div
                      key={room.id}
                      className={cn(
                        "grid transition-colors",
                        roomIdx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                      )}
                      style={{ gridTemplateColumns: `180px repeat(${days.length}, minmax(44px, 1fr))` }}
                    >
                      {/* Room info */}
                      <div className="p-3 border-r-2 border-gray-200 flex flex-col justify-center sticky left-0 z-10 bg-inherit">
                        <p className="text-[14px] font-bold text-[#111827]">Room {room.roomNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                            {ROOM_TYPE_LABELS[room.type as keyof typeof ROOM_TYPE_LABELS] || room.type}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Users size={10} /> {room.capacity}
                          </span>
                        </div>
                      </div>

                      {/* Day cells */}
                      {days.map(day => {
                        const status = getCellStatus(day, roomBookings)
                        const cfg = STATUS_CONFIG[status]
                        const booking = status !== 'available' ? getBookingForCell(day, roomBookings) : null
                        const isToday = isSameDay(day, new Date())
                        const isWeekend = isSaturday(day) || isSunday(day)
                        const isEndOfWeek = isSunday(day)

                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => handleCellClick(room, day)}
                            title={booking ? `${booking.guestName} (${booking.bookingRef})` : `Click to book Room ${room.roomNumber} on ${format(day, 'dd MMM')}`}
                            className={cn(
                              "relative min-h-[52px] border-r p-1 flex items-center justify-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:z-10",
                              status === 'available'
                                ? "hover:bg-emerald-50 cursor-pointer group"
                                : "cursor-pointer",
                              isWeekend && status === 'available' ? "bg-gray-100/40" : "bg-white",
                              cfg.bg,
                              isEndOfWeek ? "border-r-2 border-r-gray-300" : "border-gray-200",
                              isToday && status === 'available' && "ring-1 ring-inset ring-blue-300 bg-blue-50/30"
                            )}
                          >
                            {status !== 'available' && (
                              <div className={cn(
                                "w-full h-full flex items-center justify-center rounded px-1 border",
                                cfg.border,
                                status === 'occupied' ? "bg-[#1a2b4a]" : cfg.bg
                              )}>
                                <span className={cn("text-[10px] font-bold truncate max-w-full", cfg.text)}>
                                  {booking?.guestName.split(' ')[0] || cfg.label}
                                </span>
                              </div>
                            )}
                            {status === 'available' && (
                              <Plus size={16} className="text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && rooms.length === 0 && (
        <div className="text-center py-16 text-[#9ca3af]">
          <CalendarIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-medium">Hakuna vyumba vilivyosajiliwa.</p>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      {/* New Booking Modal - prefill room and check-in from cell */}
      {selectedCell && (
        <NewBookingModal
          onClose={() => setSelectedCell(null)}
          preselectedRoomId={selectedCell.room.id}
          preselectedCheckIn={format(selectedCell.date, 'yyyy-MM-dd')}
        />
      )}
    </div>
  )
}

function BookingDetailModal({ booking, onClose }: { booking: CalendarBooking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-[#111827]">{booking.bookingRef}</h3>
            <p className="text-[12px] text-[#9ca3af] font-medium">Room {booking.roomNumber}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Guest</p>
              <p className="text-[14px] font-bold text-[#111827]">{booking.guestName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Phone</p>
              <p className="text-[14px] font-bold text-[#111827]">{booking.guestPhone || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Check In</p>
              <p className="text-[14px] font-bold text-[#111827]">{format(parseISO(booking.checkIn), 'dd MMM yyyy')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Check Out</p>
              <p className="text-[14px] font-bold text-[#111827]">{format(parseISO(booking.checkOut), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="w-full py-3 bg-[#2563eb] text-white rounded-xl text-[13px] font-bold hover:bg-[#1d4ed8] transition-all">
            Funga
          </button>
        </div>
      </div>
    </div>
  )
}
