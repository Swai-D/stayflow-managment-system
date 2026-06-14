import { useState, useEffect } from 'react'
import { useCreateBooking } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { Room } from '@/types/room'
import { X, Calendar, User, Phone, Globe, Home, Users } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  preselectedRoomId?: string
}

export default function NewBookingModal({ onClose, preselectedRoomId }: Props) {
  const { mutate: createBooking, isPending } = useCreateBooking()
  const { data: roomsData } = useRooms({ status: 'available', limit: 100 })
  const availableRooms = roomsData?.rooms || []

  const [formData, setFormData] = useState({
    guestData: {
      fullName: '',
      phone: '',
      email: '',
      nationality: ''
    },
    roomId: preselectedRoomId || '',
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    adults: 1,
    children: 0,
    specialRequests: '',
    source: 'staff_entry'
  })

  // Update roomId if preselectedRoomId changes
  useEffect(() => {
    if (preselectedRoomId) {
      setFormData(prev => ({ ...prev, roomId: preselectedRoomId }))
    }
  }, [preselectedRoomId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createBooking(formData, {
      onSuccess: () => {
        toast.success('Booking mpya imefanikiwa kuundwa')
        onClose()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kuunda booking. Jaribu tena.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Booking</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            {/* Guest Information */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Guest Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Full Name</label>
                  <input 
                    required
                    value={formData.guestData.fullName}
                    onChange={e => setFormData({...formData, guestData: {...formData.guestData, fullName: e.target.value}})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100" 
                    placeholder="Enter guest's full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Phone</label>
                    <input 
                      required
                      value={formData.guestData.phone}
                      onChange={e => setFormData({...formData, guestData: {...formData.guestData, phone: e.target.value}})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                      placeholder="+255..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Nationality</label>
                    <input 
                      value={formData.guestData.nationality}
                      onChange={e => setFormData({...formData, guestData: {...formData.guestData, nationality: e.target.value}})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                      placeholder="Tanzanian"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Email Address</label>
                  <input 
                    type="email"
                    value={formData.guestData.email}
                    onChange={e => setFormData({...formData, guestData: {...formData.guestData, email: e.target.value}})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                    placeholder="guest@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Stay Information */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Home size={14} /> Stay Details
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Check In</label>
                    <input 
                      type="date"
                      required
                      value={formData.checkIn}
                      onChange={e => setFormData({...formData, checkIn: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Check Out</label>
                    <input 
                      type="date"
                      required
                      value={formData.checkOut}
                      onChange={e => setFormData({...formData, checkOut: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Available Room</label>
                  <select 
                    required
                    value={formData.roomId}
                    onChange={e => setFormData({...formData, roomId: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm appearance-none"
                  >
                    <option value="">Select a room...</option>
                    {availableRooms?.map((room: Room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} - {room.type} (TZS {Number(room.pricePerNight).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Adults</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.adults}
                      onChange={e => setFormData({...formData, adults: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Children</label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.children}
                      onChange={e => setFormData({...formData, children: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isPending}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
