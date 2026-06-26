'use client'

import { useState } from 'react'
import { usePublicHotel, usePublicRooms, useCheckPublicAvailability, useCreatePublicBooking } from '@/hooks/usePublic'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { format, differenceInCalendarDays } from 'date-fns'
import { Calendar, User, Phone, Mail, Home, CheckCircle2, ChevronRight, Star, Wifi, Coffee, CreditCard, Smartphone, Copy, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_PAYMENT_NUMBERS = [
  { name: 'Vodacom M-Pesa', number: '0745 123 456', network: 'Vodacom' },
  { name: 'Airtel Money', number: '0689 123 456', network: 'Airtel' },
  { name: 'Mixx by Yas (Tigo Pesa)', number: '0655 123 456', network: 'Tigo' },
]

export default function PublicBookingPage() {
  const slug = 'default'
  const { data: hotel } = usePublicHotel(slug)
  const { data: rooms, isLoading: roomsLoading } = usePublicRooms(slug)
  const { mutate: checkAvailability, isPending: checkingAvailability } = useCheckPublicAvailability(slug)
  const { mutate: createBooking, isPending: isBooking } = useCreatePublicBooking(slug)

  const [step, setStep] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [formData, setFormData] = useState({
    checkIn: format(new Date(), 'yyyy-MM-dd'),
    checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    fullName: '',
    phone: '',
    email: '',
    nationality: '',
    idType: '',
    idNumber: '',
    adults: 2,
    children: 0,
    specialRequests: ''
  })

  const [result, setResult] = useState<any>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const updateDates = (field: 'checkIn' | 'checkOut', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setAvailabilityError(null)
  }

  const paymentNumbers = hotel?.paymentNumbers?.length ? hotel.paymentNumbers : DEFAULT_PAYMENT_NUMBERS

  const nights = selectedRoom
    ? Math.max(1, differenceInCalendarDays(new Date(formData.checkOut), new Date(formData.checkIn)))
    : 0
  const roomTotal = selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.phone) {
      toast.error('Tafadhali jaza jina na namba ya simu')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Tafadhali jaza email yako')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Tafadhali weka email sahihi')
      return
    }
    if (!selectedRoom) return

    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      toast.error('Tarehe ya kuondoka lazima iwe baada ya tarehe ya kuwasili')
      return
    }

    // Check availability for selected dates before preview
    checkAvailability(
      { roomId: selectedRoom.id, checkIn: formData.checkIn, checkOut: formData.checkOut },
      {
        onSuccess: (data) => {
          if (data.available) {
            setAvailabilityError(null)
            setStep(3)
          } else {
            setAvailabilityError(`Room ${selectedRoom.roomNumber} is not available for the selected dates. Please choose different dates or another room.`)
          }
        },
        onError: () => {
          toast.error('Imeshindwa kuangalia upatikanaji. Jaribu tena.')
        }
      }
    )
  }

  const handlePaymentConfirm = () => {
    if (!selectedRoom) return
    const payload = {
      roomId: selectedRoom.id,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      adults: formData.adults,
      children: formData.children,
      specialRequests: formData.specialRequests,
      guestData: {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        nationality: formData.nationality,
        idType: formData.idType,
        idNumber: formData.idNumber,
      }
    }
    createBooking(payload, {
      onSuccess: (data) => {
        setResult(data)
        setStep(5)
        toast.success('Booking imekamilika. OTP imetumwa kwa SMS.')
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kuunda booking. Jaribu tena.')
      }
    })
  }

  const copyNumber = (number: string) => {
    navigator.clipboard.writeText(number)
    toast.success('Namba ya malipo imecopy')
  }

  const canProceedToPayment = step === 3

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
        {step === 5 && result ? (
          <ConfirmationScreen booking={result.booking} hotel={hotel} otp={result.otp} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Side: Forms */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Step Indicators */}
              <div className="flex items-center gap-3 mb-8">
                {[1, 2, 3, 4].map((s, idx) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                      {s}
                    </div>
                    {idx < 3 && <div className="h-0.5 w-8 bg-gray-200" />}
                  </div>
                ))}
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
                <form onSubmit={handleGuestSubmit} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                   <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900">Your details</h1>
                    <p className="text-gray-500">Please provide your information to secure the booking.</p>
                  </div>

                  {availabilityError && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 text-sm font-bold">
                      {availabilityError}
                    </div>
                  )}

                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[10px] text-gray-400 px-1">Inahitajika kwa invoice na guest portal</p>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="your@email.com"
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Check In</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            type="date"
                            required
                            min={format(new Date(), 'yyyy-MM-dd')}
                            value={formData.checkIn}
                            onChange={e => updateDates('checkIn', e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Check Out</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            type="date"
                            required
                            min={formData.checkIn}
                            value={formData.checkOut}
                            onChange={e => updateDates('checkOut', e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Nationality</label>
                        <CountrySelect
                          value={formData.nationality}
                          onChange={value => setFormData({...formData, nationality: value})}
                          placeholder="Select country"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">ID Type</label>
                        <select
                          value={formData.idType}
                          onChange={e => setFormData({...formData, idType: e.target.value})}
                          className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 text-sm appearance-none"
                        >
                          <option value="">Select ID type...</option>
                          <option value="national_id">National ID</option>
                          <option value="passport">Passport</option>
                          <option value="drivers_license">Driving License</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">ID Number</label>
                      <input 
                        value={formData.idNumber}
                        onChange={e => setFormData({...formData, idNumber: e.target.value})}
                        placeholder="Enter your ID number"
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Adults</label>
                        <input 
                          type="number"
                          min={1}
                          value={formData.adults}
                          onChange={e => setFormData({...formData, adults: Math.max(1, Number(e.target.value))})}
                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Children</label>
                        <input 
                          type="number"
                          min={0}
                          value={formData.children}
                          onChange={e => setFormData({...formData, children: Math.max(0, Number(e.target.value))})}
                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm" 
                        />
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
                      disabled={checkingAvailability}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                    >
                      {checkingAvailability ? 'Checking availability...' : <>Preview Details <ChevronRight size={18} /></>}
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900">Preview your details</h1>
                    <p className="text-gray-500">Please confirm everything is correct before proceeding to payment.</p>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
                    <PreviewRow label="Full Name" value={formData.fullName} />
                    <PreviewRow label="Phone" value={formData.phone} />
                    <PreviewRow label="Email" value={formData.email || '—'} />
                    <PreviewRow label="Nationality" value={formData.nationality || '—'} />
                    <PreviewRow label="ID Document" value={formData.idType ? `${formData.idType.replace(/_/g, ' ')} · ${formData.idNumber || '—'}` : '—'} />
                    <PreviewRow label="Check In" value={format(new Date(formData.checkIn), 'EEE, dd MMM yyyy')} />
                    <PreviewRow label="Check Out" value={format(new Date(formData.checkOut), 'EEE, dd MMM yyyy')} />
                    <PreviewRow label="Guests" value={`${formData.adults} adults${formData.children ? `, ${formData.children} children` : ''}`} />
                    <PreviewRow label="Room" value={selectedRoom ? `Room ${selectedRoom.roomNumber} · ${selectedRoom.type}` : '—'} />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setStep(4)}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                    >
                      Proceed to Payment <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900">Make payment</h1>
                    <p className="text-gray-500">Lipa kupitia namba zifuatazo, kisha bonyeza &quot;Nimelipa&quot; kuthibitisha booking yako.</p>
                  </div>

                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 text-amber-600 bg-amber-50 rounded-2xl p-4">
                      <CreditCard size={20} />
                      <p className="text-sm font-bold">Malipo yanapokelewa kwa njia ya cash pekee kupitia mitandao ya simu.</p>
                    </div>

                    <div className="space-y-3">
                      {paymentNumbers.map((method: any) => (
                        <div key={method.name} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-blue-600">
                              <Smartphone size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{method.name}</p>
                              <p className="text-xs text-gray-500">{method.network}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyNumber(method.number)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            <Copy size={14} /> {method.number}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(3)}
                      className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handlePaymentConfirm}
                      disabled={isBooking}
                      className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-xl shadow-green-100 transition-all disabled:opacity-50"
                    >
                      {isBooking ? 'Inashughulikia...' : <>Nimelipa <CheckCircle2 size={18} /></>}
                    </button>
                  </div>
                </div>
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
                          <span className="text-gray-500">{nights} night{s(nights)}</span>
                          <span className="font-bold text-gray-900">TZS {roomTotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Service Fee</span>
                          <span className="font-bold text-gray-900">TZS 0</span>
                       </div>
                       <div className="flex justify-between text-lg pt-4 border-t border-gray-100">
                          <span className="font-extrabold text-gray-900">Total</span>
                          <span className="font-extrabold text-blue-600">TZS {roomTotal.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 text-right">{value}</span>
    </div>
  )
}

function ConfirmationScreen({ booking, hotel, otp }: { booking: any; hotel: any; otp: string }) {
  const copyOtp = () => {
    navigator.clipboard.writeText(otp)
    toast.success('OTP imecopy')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-in zoom-in-50 duration-500">
        <CheckCircle2 size={48} />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-10">
        Asante kwa kuchagua <span className="font-bold text-gray-900">{hotel?.name || 'Buffalo Hotel'}</span>. 
        Ujumbe wa SMS umetumwa kwa namba yako ikiwa na OTP ya kuingia kwenye dashboard yako.
      </p>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl w-full max-w-md mb-8 space-y-6">
         <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</span>
            <span className="text-lg font-mono font-bold text-blue-600 tracking-wider">{booking?.bookingRef}</span>
         </div>
         <div className="space-y-4 text-left border-t border-gray-50 pt-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Check In</span>
              <span className="text-sm font-bold text-gray-900">{booking?.checkIn ? format(new Date(booking.checkIn), 'dd MMM yyyy') : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-bold text-blue-600">TZS {Number(booking?.totalAmount || 0).toLocaleString()}</span>
            </div>
         </div>

         <div className="bg-blue-50 rounded-2xl p-5 text-center">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Your Dashboard OTP</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-black text-blue-700 tracking-[0.2em]">{otp}</span>
              <button onClick={copyOtp} className="p-2 bg-white rounded-xl text-blue-600 hover:bg-blue-100 transition-all">
                <Copy size={18} />
              </button>
            </div>
            <p className="text-xs text-blue-500 mt-2">Usiishare na mtu yeyote.</p>
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

function s(n: number) {
  return n === 1 ? '' : 's'
}
