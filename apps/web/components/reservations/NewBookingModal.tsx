'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCreateBooking } from '@/hooks/useBookings'
import { useHotelSettings } from '@/hooks/useSettings'
import { useCompanies } from '@/hooks/useCompanies'
import { Room, ROOM_TYPE_LABELS } from '@/types/room'
import { Company } from '@/types/company'
import { CountrySelect } from '@/components/ui/CountrySelect'
import api from '@/lib/api'
import {
  X, Calendar, User, Phone, Users, Mail, CheckCircle2,
  CreditCard, Smartphone, Copy, Search, BedDouble,
  ArrowRight, Building2, UserCircle2
} from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'

const DEFAULT_PAYMENT_NUMBERS = [
  { name: 'Vodacom M-Pesa', number: '0745 123 456', network: 'Vodacom' },
  { name: 'Airtel Money', number: '0689 123 456', network: 'Airtel' },
  { name: 'Mixx by Yas (Tigo Pesa)', number: '0655 123 456', network: 'Tigo' },
]

interface Props {
  onClose: () => void
  preselectedRoomId?: string
  preselectedCheckIn?: string
  preselectedCheckOut?: string
}

export default function NewBookingModal({ onClose, preselectedRoomId, preselectedCheckIn, preselectedCheckOut }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')

  const [step, setStep] = useState(1)
  const [dates, setDates] = useState({
    checkIn: preselectedCheckIn || today,
    checkOut: preselectedCheckOut || tomorrow
  })
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [search, setSearch] = useState('')
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [bookingType, setBookingType] = useState<'individual' | 'company'>('individual')
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('existing')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tinNumber: '',
    contactPerson: '',
    notes: ''
  })
  const [specialRequests, setSpecialRequests] = useState('')

  // Modern guest registry: each person is registered individually
  type GuestForm = { fullName: string; phone: string; email: string; nationality: string; idType: string; idNumber: string; ageCategory: 'adult' | 'child' }
  const emptyGuest: GuestForm = { fullName: '', phone: '', email: '', nationality: '', idType: '', idNumber: '', ageCategory: 'adult' }
  const [guests, setGuests] = useState<GuestForm[]>([{ ...emptyGuest }])

  const [result, setResult] = useState<any>(null)

  const { data: hotel } = useHotelSettings()
  const { mutate: createBooking, isPending: isCreating } = useCreateBooking()
  const { data: companies = [] } = useCompanies()

  const paymentNumbers = hotel?.paymentNumbers?.length ? hotel.paymentNumbers : DEFAULT_PAYMENT_NUMBERS

  // Fetch rooms that are truly available for selected dates
  const { data: availableRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['bookings', 'availability', dates.checkIn, dates.checkOut],
    queryFn: async () => {
      const res = await api.get('/bookings/availability', {
        params: { checkIn: dates.checkIn, checkOut: dates.checkOut }
      })
      return res.data.data as Room[]
    },
    enabled: !!dates.checkIn && !!dates.checkOut && new Date(dates.checkOut) > new Date(dates.checkIn),
    staleTime: 0
  })

  // Auto-select preselected room once availability list loads
  useEffect(() => {
    if (preselectedRoomId && availableRooms) {
      const room = availableRooms.find((r) => r.id === preselectedRoomId)
      if (room) setSelectedRoom(room)
    }
  }, [preselectedRoomId, availableRooms])

  const filteredRooms = useMemo(() => {
    if (!availableRooms) return []
    const term = search.trim().toLowerCase()
    if (!term) return availableRooms
    return availableRooms.filter(r =>
      r.roomNumber.toLowerCase().includes(term) ||
      r.name.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term)
    )
  }, [availableRooms, search])

  const nights = useMemo(() => {
    return Math.max(1, differenceInCalendarDays(new Date(dates.checkOut), new Date(dates.checkIn)))
  }, [dates])

  const roomTotal = useMemo(() => {
    return selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0
  }, [selectedRoom, nights])

  const adults = useMemo(() => guests.filter(g => g.ageCategory === 'adult').length, [guests])
  const children = useMemo(() => guests.filter(g => g.ageCategory === 'child').length, [guests])
  const totalGuests = guests.length

  const addGuest = () => setGuests(prev => [...prev, { ...emptyGuest }])
  const removeGuest = (idx: number) => setGuests(prev => prev.filter((_, i) => i !== idx))
  const updateGuest = (idx: number, field: string, value: string) => {
    setGuests(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g))
  }
  const toggleAgeCategory = (idx: number) => {
    setGuests(prev => prev.map((g, i) => i === idx ? { ...g, ageCategory: g.ageCategory === 'adult' ? 'child' : 'adult' } : g))
  }

  const updateDate = (field: 'checkIn' | 'checkOut', value: string) => {
    setDates(prev => {
      const next = { ...prev, [field]: value }
      const checkInDate = new Date(next.checkIn)
      const checkOutDate = new Date(next.checkOut)
      if (checkOutDate <= checkInDate) {
        next.checkOut = format(new Date(checkInDate.getTime() + 86400000), 'yyyy-MM-dd')
      }
      return next
    })
    setSelectedRoom(null)
    setAvailabilityError(null)
  }

  const canGoToGuest = selectedRoom && dates.checkIn && dates.checkOut && new Date(dates.checkOut) > new Date(dates.checkIn)

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (guests.length === 0) {
      toast.error('Tafadhali sajili angalau mgeni mmoja')
      return
    }

    const primary = guests[0]
    if (!primary.fullName.trim() || !primary.phone.trim()) {
      toast.error('Tafadhali jaza jina na namba ya simu ya mgeni mkuu')
      return
    }
    if (!primary.email.trim()) {
      toast.error('Tafadhali jaza email ya mgeni mkuu')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(primary.email.trim())) {
      toast.error('Tafadhali weka email sahihi ya mgeni mkuu')
      return
    }

    for (let i = 0; i < guests.length; i++) {
      if (!guests[i].fullName.trim()) {
        toast.error(`Tafadhali jaza jina la mgeni wa ${i + 1}`)
        return
      }
    }

    if (selectedRoom && selectedRoom.capacity && totalGuests > selectedRoom.capacity) {
      toast.error(`Jumla ya wageni (${totalGuests}) imeshinda uwezo wa chumba (${selectedRoom.capacity})`)
      return
    }

    if (bookingType === 'company') {
      if (companyMode === 'existing' && !selectedCompanyId) {
        toast.error('Tafadhali chagua kampuni')
        return
      }
      if (companyMode === 'new' && !companyData.name.trim()) {
        toast.error('Tafadhali jaza jina la kampuni')
        return
      }
    }
    if (!selectedRoom) return
    if (new Date(dates.checkOut) <= new Date(dates.checkIn)) {
      toast.error('Tarehe ya kuondoka lazima iwe baada ya tarehe ya kuwasili')
      return
    }
    setAvailabilityError(null)
    setStep(3)
  }

  const handlePaymentConfirm = () => {
    if (!selectedRoom) return
    const payload: any = {
      roomId: selectedRoom.id,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      specialRequests,
      source: 'staff_entry',
      bookingType,
      guests: guests.map(g => ({
        fullName: g.fullName.trim(),
        phone: g.phone.trim(),
        email: g.email.trim(),
        nationality: g.nationality.trim(),
        idType: g.idType.trim(),
        idNumber: g.idNumber.trim(),
        ageCategory: g.ageCategory
      })),
      sendConfirmationSms: true
    }

    if (bookingType === 'company') {
      if (companyMode === 'existing' && selectedCompanyId) {
        payload.companyId = selectedCompanyId
      } else if (companyMode === 'new') {
        payload.companyData = {
          ...companyData,
          email: companyData.email || undefined
        }
      }
    }

    createBooking(payload, {
      onSuccess: (data) => {
        setResult(data)
        setStep(5)
        toast.success('Booking imekamilika. Activation email na OTP zimetumwa.')
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

  const copyOtp = () => {
    if (result?.otp) {
      navigator.clipboard.writeText(result.otp)
      toast.success('OTP imecopy')
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3, 4].map((s, idx) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-400'
          }`}>
            {s}
          </div>
          {idx < 3 && <div className={`h-0.5 w-6 ${step > s ? 'bg-blue-600' : 'bg-gray-100'}`} />}
        </div>
      ))}
    </div>
  )

  const renderSummary = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 bg-blue-600">
        <h3 className="text-white font-bold">Booking Summary</h3>
        <p className="text-blue-100 text-xs">Review selections</p>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check In</p>
            <p className="text-sm font-bold text-gray-900">{dates.checkIn ? format(new Date(dates.checkIn), 'EEE, dd MMM yyyy') : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check Out</p>
            <p className="text-sm font-bold text-gray-900">{dates.checkOut ? format(new Date(dates.checkOut), 'EEE, dd MMM yyyy') : '—'}</p>
          </div>
        </div>

        <hr className="border-gray-50" />

        {selectedRoom ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
              {selectedRoom.roomNumber}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{ROOM_TYPE_LABELS[selectedRoom.type] || selectedRoom.type} Room</p>
              <p className="text-xs text-gray-500">TZS {Number(selectedRoom.pricePerNight).toLocaleString()} per night</p>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-xs font-medium">
            Select a room
          </div>
        )}

        <hr className="border-gray-50" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{nights} night{s(nights)}</span>
            <span className="font-bold text-gray-900">TZS {roomTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service Fee</span>
            <span className="font-bold text-gray-900">TZS 0</span>
          </div>
          <div className="flex justify-between text-base pt-3 border-t border-gray-100">
            <span className="font-extrabold text-gray-900">Total</span>
            <span className="font-extrabold text-blue-600">TZS {roomTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBookingTypeSelector = (showLabel = true) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      {showLabel && (
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Type</label>
      )}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setBookingType('individual')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
            bookingType === 'individual'
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-transparent bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <UserCircle2 size={24} className={bookingType === 'individual' ? 'text-blue-600' : 'text-gray-400'} />
          <div className="text-left">
            <p className={`text-sm font-bold ${bookingType === 'individual' ? 'text-blue-700' : 'text-gray-700'}`}>Individual</p>
            <p className="text-[10px] text-gray-400">Mtu binafsi</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setBookingType('company')}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
            bookingType === 'company'
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-transparent bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <Building2 size={24} className={bookingType === 'company' ? 'text-blue-600' : 'text-gray-400'} />
          <div className="text-left">
            <p className={`text-sm font-bold ${bookingType === 'company' ? 'text-blue-700' : 'text-gray-700'}`}>Company</p>
            <p className="text-[10px] text-gray-400">Kampuni</p>
          </div>
        </button>
      </div>
    </div>
  )

  // Step 1: Room Selection
  const renderRoomSelection = () => (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-200">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">Choose Room</h2>
        <p className="text-sm text-gray-500">Select booking type, dates and an available room for the guest.</p>
      </div>

      {renderBookingTypeSelector()}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Check In</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              min={today}
              value={dates.checkIn}
              onChange={e => updateDate('checkIn', e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-3 py-3 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Check Out</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="date"
              min={dates.checkIn}
              value={dates.checkOut}
              onChange={e => updateDate('checkOut', e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-3 py-3 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by room number, name or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-3 py-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1">
        {roomsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-50 rounded-2xl animate-pulse" />
          ))
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-400 text-sm">
            No rooms available for selected dates.
          </div>
        ) : (
          filteredRooms.map(room => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`group cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                selectedRoom?.id === room.id
                  ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50'
                  : 'border-transparent bg-white hover:border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Room {room.roomNumber}</p>
                  <h3 className="font-bold text-gray-900">{ROOM_TYPE_LABELS[room.type] || room.type}</h3>
                </div>
                <span className="text-sm font-bold text-gray-900">TZS {Number(room.pricePerNight).toLocaleString()}</span>
              </div>

              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{room.name}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 rounded-lg px-2 py-1">
                  <BedDouble size={10} /> {room.beds || 1} beds
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 rounded-lg px-2 py-1">
                  <Users size={10} /> max {room.capacity}
                </span>
                {room.amenities?.slice(0, 2).map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 rounded-lg px-2 py-1">
                    {a}
                  </span>
                ))}
              </div>

              {selectedRoom?.id === room.id && (
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                  Selected <CheckCircle2 size={14} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {canGoToGuest && (
        <button
          onClick={() => setStep(2)}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
        >
          Continue to Guest Info <ArrowRight size={18} />
        </button>
      )}
    </div>
  )

  // Step 2: Guest Details
  const renderGuestDetails = () => (
    <form onSubmit={handleGuestSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-200">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">Guest & Booking Type</h2>
        <p className="text-sm text-gray-500">Choose booking type and enter guest information.</p>
      </div>

      {renderBookingTypeSelector()}

      {bookingType === 'company' && (
          <div className="space-y-4 pt-2 border-t border-gray-50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCompanyMode('existing')}
                className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  companyMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Existing Company
              </button>
              <button
                type="button"
                onClick={() => setCompanyMode('new')}
                className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  companyMode === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                New Company
              </button>
            </div>

            {companyMode === 'existing' ? (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full mt-1 h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-blue-500"
                >
                  <option value="">Select company...</option>
                  {companies.map((c: Company) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Company Name *</label>
                  <input
                    value={companyData.name}
                    onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="e.g. ABC Limited"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Person</label>
                  <input
                    value={companyData.contactPerson}
                    onChange={e => setCompanyData({ ...companyData, contactPerson: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                  <input
                    value={companyData.phone}
                    onChange={e => setCompanyData({ ...companyData, phone: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="+255..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                  <input
                    value={companyData.email}
                    onChange={e => setCompanyData({ ...companyData, email: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="company@email.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <input
                    value={companyData.address}
                    onChange={e => setCompanyData({ ...companyData, address: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Physical address"
                  />
                </div>
              </div>
            )}
          </div>
        )}

      {availabilityError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-700 text-sm font-bold">
          {availabilityError}
        </div>
      )}

      {/* Guest Registry */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Guest Registry</h3>
            <p className="text-[10px] text-gray-400">Sajili kila mtu aliyeingia</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-blue-600">{adults} Adults · {children} Children</p>
            <p className="text-[9px] text-gray-400">Capacity: {selectedRoom?.capacity || '—'}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {guests.map((guest, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <span className="text-xs font-bold text-gray-700">{idx === 0 ? 'Primary Guest' : 'Guest'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAgeCategory(idx)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      guest.ageCategory === 'adult'
                        ? 'bg-blue-600 text-white'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {guest.ageCategory === 'adult' ? 'Adult' : 'Child'}
                  </button>
                  {guests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGuest(idx)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <input
                    value={guest.fullName}
                    onChange={e => updateGuest(idx, 'fullName', e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <input
                    value={guest.phone}
                    onChange={e => updateGuest(idx, 'phone', e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={guest.email}
                    onChange={e => updateGuest(idx, 'email', e.target.value)}
                    placeholder={idx === 0 ? 'Email (required for invoice)' : 'Email'}
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <CountrySelect
                    value={guest.nationality}
                    onChange={value => updateGuest(idx, 'nationality', value)}
                    placeholder="Nationality"
                  />
                </div>
                <div>
                  <select
                    value={guest.idType}
                    onChange={e => updateGuest(idx, 'idType', e.target.value)}
                    className="w-full h-10 bg-gray-50 border-none rounded-xl px-3 text-[13px] appearance-none outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">ID Type</option>
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driving License</option>
                    <option value="voter_id">Voter ID</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    value={guest.idNumber}
                    onChange={e => updateGuest(idx, 'idNumber', e.target.value)}
                    placeholder="ID Number"
                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addGuest}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
        >
          + Add Guest
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Special Requests</label>
        <textarea
          value={specialRequests}
          onChange={e => setSpecialRequests(e.target.value)}
          placeholder="Any special requests..."
          rows={2}
          className="w-full bg-gray-50 border-none rounded-xl px-3 py-3 text-sm resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-6 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
        >
          Preview Details <ArrowRight size={18} />
        </button>
      </div>
    </form>
  )

  // Step 3: Preview
  const renderPreview = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">Preview</h2>
        <p className="text-sm text-gray-500">Confirm details before payment.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <PreviewRow label="Booking Type" value={bookingType === 'company' ? '🏢 Company' : '👤 Individual'} />
        {bookingType === 'company' && (
          <PreviewRow
            label="Company"
            value={
              companyMode === 'existing'
                ? (companies.find((c: Company) => c.id === selectedCompanyId)?.name || '—')
                : companyData.name
            }
          />
        )}
        <PreviewRow label="Check In" value={format(new Date(dates.checkIn), 'EEE, dd MMM yyyy')} />
        <PreviewRow label="Check Out" value={format(new Date(dates.checkOut), 'EEE, dd MMM yyyy')} />
        <PreviewRow label="Guests" value={`${adults} adults${children ? `, ${children} children` : ''} (${totalGuests} total)`} />
        <PreviewRow label="Room" value={selectedRoom ? `Room ${selectedRoom.roomNumber} · ${ROOM_TYPE_LABELS[selectedRoom.type] || selectedRoom.type}` : '—'} />
        {specialRequests && <PreviewRow label="Requests" value={specialRequests} />}

        <div className="pt-2 border-t border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Registered Guests</p>
          <div className="space-y-1.5">
            {guests.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{idx + 1}. {g.fullName || '—'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.ageCategory === 'adult' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {g.ageCategory}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(2)}
          className="px-6 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          Back
        </button>
        <button
          onClick={() => setStep(4)}
          className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
        >
          Proceed to Payment <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )

  // Step 4: Payment
  const renderPayment = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <p className="text-sm text-gray-500">Guest pays via displayed MNO numbers, then click Nimelipa.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-xl p-4">
          <CreditCard size={18} />
          <p className="text-xs font-bold">Payments accepted via mobile money. Confirm receipt before proceeding.</p>
        </div>

        <div className="space-y-3">
          {paymentNumbers.map((method: any) => (
            <div key={method.name} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-blue-600">
                  <Smartphone size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-500">{method.network}</p>
                </div>
              </div>
              <button
                onClick={() => copyNumber(method.number)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Copy size={12} /> {method.number}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(3)}
          className="px-6 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          Back
        </button>
        <button
          onClick={handlePaymentConfirm}
          disabled={isCreating}
          className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-100 transition-all disabled:opacity-50"
        >
          {isCreating ? 'Processing...' : <>Nimelipa <CheckCircle2 size={18} /></>}
        </button>
      </div>
    </div>
  )

  // Step 5: Confirmation
  const renderConfirmation = () => {
    const booking = result?.booking || result
    const otp = result?.otp
    return (
      <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 max-w-md mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="text-sm text-gray-500">
            Booking for <span className="font-bold text-gray-900">{guests[0]?.fullName}</span> has been created.
            {otp ? ' An activation email and SMS with OTP have been sent.' : ''}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</span>
            <span className="text-lg font-mono font-bold text-blue-600 tracking-wider">{booking?.bookingRef}</span>
          </div>
          <div className="border-t border-gray-50 pt-4 space-y-3">
            <PreviewRow label="Check In" value={booking?.checkIn ? format(new Date(booking.checkIn), 'dd MMM yyyy') : '—'} />
            <PreviewRow label="Check Out" value={booking?.checkOut ? format(new Date(booking.checkOut), 'dd MMM yyyy') : '—'} />
            <PreviewRow label="Total" value={`TZS ${Number(booking?.totalAmount || 0).toLocaleString()}`} />
          </div>

          {otp && (
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Guest Dashboard OTP</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-black text-blue-700 tracking-[0.2em]">{otp}</span>
                <button onClick={copyOtp} className="p-2 bg-white rounded-lg text-blue-600 hover:bg-blue-100 transition-all">
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs text-blue-500 mt-2">Do not share with anyone.</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Booking</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {Math.min(step, 4)} of 4</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {step === 5 ? (
            renderConfirmation()
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                {renderStepIndicator()}
                {step === 1 && renderRoomSelection()}
                {step === 2 && renderGuestDetails()}
                {step === 3 && renderPreview()}
                {step === 4 && renderPayment()}
              </div>
              <div className="lg:col-span-5">
                <div className="lg:sticky lg:top-24">
                  {renderSummary()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 text-right">{value}</span>
    </div>
  )
}

function s(n: number) {
  return n === 1 ? '' : 's'
}
