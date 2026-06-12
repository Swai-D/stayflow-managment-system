'use client'

import { useState } from 'react'
import { useHousekeepingStatus, useUpdateHousekeeping } from '@/hooks/useHousekeeping'
import { format } from 'date-fns'

type HKStatus = 'clean' | 'dirty' | 'cleaning' | 'inspected'

const HK_STATUS_CONFIG: Record<HKStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  clean:     { label:'Clean',       bg:'bg-[#DCFCE7]', border:'border-[#86EFAC]', text:'text-[#166534]', dot:'bg-[#22C55E]' },
  dirty:     { label:'Dirty',       bg:'bg-[#FEF3C7]', border:'border-[#FDE68A]', text:'text-[#92400E]', dot:'bg-[#F59E0B]' },
  cleaning:  { label:'Cleaning',    bg:'bg-[#E0E7FF]', border:'border-[#C7D2FE]', text:'text-[#3730A3]', dot:'bg-[#6366F1]' },
  inspected: { label:'Inspected',   bg:'bg-[#DBEAFE]', border:'border-[#93C5FD]', text:'text-[#1D4ED8]', dot:'bg-[#2563EB]' },
}

export default function HousekeepingPage() {
  const [activeFilter, setFilter] = useState<HKStatus | 'all'>('all')
  const [selectedRoom, setSelectedRoom] = useState<any>(null)

  const { data: housekeepingData, isLoading } = useHousekeepingStatus()
  const { mutate: updateStatus, isPending: updating } = useUpdateHousekeeping()

  const rooms = housekeepingData || []
  
  const filteredRooms = rooms.filter((r: any) => 
    activeFilter === 'all' || r.status === activeFilter
  )

  const counts = {
    all:      rooms.length,
    dirty:    rooms.filter((r:any)=>r.status==='dirty').length,
    cleaning: rooms.filter((r:any)=>r.status==='cleaning').length,
    clean:    rooms.filter((r:any)=>r.status==='clean').length,
    inspected:rooms.filter((r:any)=>r.status==='inspected').length,
  }

  const handleUpdate = (roomId: string, status: HKStatus) => {
    updateStatus({ roomId, status }, {
      onSuccess: () => setSelectedRoom(null)
    })
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 flex items-center gap-2">
            📅 {format(new Date(), 'EEE, dd MMMM')}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HKStatCard label="Need Cleaning" value={counts.dirty} color="bg-[#F59E0B]" />
        <HKStatCard label="In Progress" value={counts.cleaning} color="bg-[#6366F1]" />
        <HKStatCard label="Clean & Ready" value={counts.clean} color="bg-[#22C55E]" />
        <HKStatCard label="Inspected" value={counts.inspected} color="bg-[#2563EB]" />
      </div>

      {/* ── Main content ────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex gap-1">
            {([['all','All'], ['dirty','Dirty'], ['cleaning','Cleaning'], ['clean','Clean'], ['inspected','Inspected']] as const).map(([val, label]) => (
              <button 
                key={val} 
                onClick={() => setFilter(val)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  activeFilter === val 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label} <span className="ml-1 text-[10px] opacity-60">({counts[val as keyof typeof counts]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-50 rounded-xl animate-pulse" />
            ))
          ) : filteredRooms.map((room: any) => {
            // Map RoomStatus to HKStatus visually if needed
            const status = room.status as HKStatus
            const cfg = HK_STATUS_CONFIG[status] || HK_STATUS_CONFIG['dirty']
            
            return (
              <div 
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`text-xl font-bold ${cfg.text}`}>{room.roomNumber}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-white/70 ${cfg.text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </div>
                
                {/* Last update info if exists */}
                {room.housekeepingLogs?.[0] && (
                  <div className="mt-auto">
                    <p className={`text-[10px] opacity-70 ${cfg.text}`}>
                      Updated: {format(new Date(room.housekeepingLogs[0].updatedAt), 'HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRoom(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Room {selectedRoom.roomNumber}</h3>
              <button 
                onClick={() => setSelectedRoom(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >✕</button>
            </div>

            <div className="space-y-3">
              {selectedRoom.status === 'dirty' && (
                <button 
                  disabled={updating}
                  onClick={() => handleUpdate(selectedRoom.id, 'cleaning')}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  Start Cleaning
                </button>
              )}
              {selectedRoom.status === 'cleaning' && (
                <button 
                  disabled={updating}
                  onClick={() => handleUpdate(selectedRoom.id, 'clean')}
                  className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50"
                >
                  ✓ Mark as Clean
                </button>
              )}
              {selectedRoom.status === 'clean' && (
                <button 
                  disabled={updating}
                  onClick={() => handleUpdate(selectedRoom.id, 'inspected')}
                  className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  Mark as Inspected
                </button>
              )}
              <button 
                onClick={() => setSelectedRoom(null)}
                className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HKStatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
