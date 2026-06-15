'use client'

import { useState } from 'react'
import { usePublicHotel, usePublicRooms, useCreatePublicBooking } from '@/hooks/usePublic'
import { format } from 'date-fns'
import { Calendar, User, Phone, Mail, Home, CheckCircle2, ChevronRight, Star, Wifi, Coffee } from 'lucide-react'

export default function PublicBookingPage() {
  const slug = 'default' // This would come from URL or subdomain
  const { data: hotel } = usePublicHotel(slug)
  const { data: rooms, isLoading: roomsLoading } = usePublicRooms(slug)
  const { mutate: createBooking, isPending: isBooking } = useCreatePublicBooking(slug)

  const [step, setStep] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [formData, setFormData] = useState({
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    fullName: '',
    phone: '',
    email: '',
    adults: 2,
    children: 0
  })

  const [confirmedBooking, setConfirmedBooking] = useState<any>(null)

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      roomId: selectedRoom.id,
      guestData: {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email
      }
    }
    createBooking(payload, {
      onSuccess: (data) => {
        setConfirmedBooking(data)
        setStep(3)
      }
    })
  }

  if (step === 3) return <ConfirmationScreen booking={confirmedBooking} hotel={hotel} />

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">B</div>
             <span className="text-lg font-bold text-gray-900 tracking-tight">{hotel?.name || 'Buffalo Hotel'}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Self Service Portal</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-10 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Side: Forms */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Step Indicators */}
            <div className="flex items-center gap-4 mb-8">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-500'}`}>1</div>
               <div className="h-0.5 w-10 bg-gray-200" />
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-500'}`}>2</div>
               <div className="h-0.5 w-10 bg-gray-200" />
               <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">3</div>
            </div>

            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-gray-900">Choose your room</h1>
                  <p className="text-gray-500">Select the perfect accommodation for your stay.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {roomsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-40 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                    ))
                  ) : rooms?.map((room: any) => (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`group bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer flex gap-6 ${
                        selectedRoom?.id === room.id ? 'border-blue-600 ring-4 ring-blue-50' : 'border-transparent hover:border-gray-200 shadow-sm'
                      }`}
                    >
                      <div className="w-32 h-32 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden relative">
                         <div className="absolute inset-0 bg-blue-600/5 flex items-center justify-center text-blue-600"><Home size={32} /></div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                             <h3 className="text-lg font-bold text-gray-900 capitalize">{room.type} Room</h3>
                             <span className="text-blue-600 font-bold">TZS {Number(room.pricePerNight).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">/night</span></span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{room.name} · Max {room.capacity} Guests</p>
                          <div className="flex gap-3 mt-3">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Wifi size={12} /> Free Wifi</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest"><Coffee size={12} /> Breakfast</span>
                          </div>
                        </div>
                        {selectedRoom?.id === room.id && <div className="text-blue-600 flex items-center gap-1 text-xs font-bold">Selected <CheckCircle2 size={14} /></div>}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRoom && (
                  <button 
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                  >
                    Continue to Guest Info <ChevronRight size={18} />
                  </button>
                )}
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleBook} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                 <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-gray-900">Your details</h1>
                  <p className="text-gray-500">Please provide your information to secure the booking.</p>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                        placeholder="e.g. John Doe"
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-blue-100 transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          required
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="+255..."
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Email (Optional)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="your@email.com"
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                   <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={isBooking}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                  >
                    {isBooking ? 'Processing...' : 'Complete Booking'}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Right Side: Summary Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden sticky top-28">
               <div className="p-6 border-b border-gray-50 bg-blue-600">
                  <h3 className="text-white font-bold text-lg">Booking Summary</h3>
                  <p className="text-blue-100 text-xs mt-1">Review your selections</p>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check In</p>
                       <p className="text-sm font-bold text-gray-900">{format(new Date(formData.checkIn), 'EEE, dd MMM yyyy')}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check Out</p>
                       <p className="text-sm font-bold text-gray-900">{format(new Date(formData.checkOut), 'EEE, dd MMM yyyy')}</p>
                     </div>
                  </div>

                  <hr className="border-gray-50" />

                  {selectedRoom ? (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {selectedRoom.roomNumber}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 capitalize">{selectedRoom.type} Room</p>
                        <p className="text-xs text-gray-500 mt-0.5">TZS {Number(selectedRoom.pricePerNight).toLocaleString()} per night</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 text-xs font-medium">
                      Select a room to see summary
                    </div>
                  )}

                  <hr className="border-gray-50" />

                  <div className="space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-bold text-gray-900">TZS {selectedRoom ? Number(selectedRoom.pricePerNight).toLocaleString() : 0}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service Fee</span>
                        <span className="font-bold text-gray-900">TZS 0</span>
                     </div>
                     <div className="flex justify-between text-lg pt-4 border-t border-gray-100">
                        <span className="font-extrabold text-gray-900">Total</span>
                        <span className="font-extrabold text-blue-600">TZS {selectedRoom ? Number(selectedRoom.pricePerNight).toLocaleString() : 0}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function ConfirmationScreen({ booking, hotel }: any) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-in zoom-in-50 duration-500">
        <CheckCircle2 size={48} />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-10">Your stay at <span className="font-bold text-gray-900">{hotel?.name}</span> has been secured. We've sent a confirmation to your phone.</p>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl w-full max-w-md mb-8">
         <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</span>
            <span className="text-lg font-mono font-bold text-blue-600 tracking-wider">SF-2026-XXX</span>
         </div>
         <div className="space-y-4 text-left border-t border-gray-50 pt-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Check In</span>
              <span className="text-sm font-bold text-gray-900">13 March, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Paid</span>
              <span className="text-sm font-bold text-green-600">TZS 80,000</span>
            </div>
         </div>
      </div>

      <button 
        onClick={() => window.location.reload()}
        className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl"
      >
        Go to Home
      </button>
    </div>
  )
}
