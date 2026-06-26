'use client'

import { useState } from 'react'
import { useGuests, useGuest, useRegisteredGuests } from '@/hooks/useGuests'
import { format } from 'date-fns'
import { Search, User, Phone, Mail, Globe, History, ChevronRight, Users, BedDouble, Calendar, BadgeInfo } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'primary' | 'registered'

export default function GuestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('primary')
  const [search, setSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  const [selectedRegisteredGuest, setSelectedRegisteredGuest] = useState<any | null>(null)

  const { data: guests, isLoading: guestsLoading } = useGuests(activeTab === 'primary' ? search : '')
  const { data: registeredGuests, isLoading: registeredLoading } = useRegisteredGuests(activeTab === 'registered' ? search : '')
  const { data: guestDetail, isLoading: detailLoading } = useGuest(selectedGuestId || '')

  const isLoading = activeTab === 'primary' ? guestsLoading : registeredLoading
  const items = activeTab === 'primary' ? guests : registeredGuests

  return (
    <div className="space-y-6 pt-4 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guests Management</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Primary contacts & registered stay guests</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or ref..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => {
            setActiveTab('primary')
            setSelectedGuestId(null)
            setSelectedRegisteredGuest(null)
          }}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border',
            activeTab === 'primary'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <User size={14} /> Primary Guests
        </button>
        <button
          onClick={() => {
            setActiveTab('registered')
            setSelectedGuestId(null)
            setSelectedRegisteredGuest(null)
          }}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border',
            activeTab === 'registered'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <Users size={14} /> Registered Guests
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* List */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {activeTab === 'primary' ? 'Guest Directory' : 'Registered Stay Guests'}
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{items?.length ?? 0} Total</span>
          </div>
          <div className="overflow-y-auto flex-1 thin-scrollbar">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-50 animate-pulse flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-2 bg-gray-50 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : activeTab === 'primary' ? (
              guests?.map((guest: any) => (
                <div
                  key={guest.id}
                  onClick={() => {
                    setSelectedGuestId(guest.id)
                    setSelectedRegisteredGuest(null)
                  }}
                  className={cn(
                    'p-4 border-b border-gray-50 flex items-center gap-4 cursor-pointer transition-all hover:bg-blue-50/30',
                    selectedGuestId === guest.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm">
                    {guest.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{guest.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{guest.phone}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              ))
            ) : (
              registeredGuests?.map((guest: any, idx: number) => (
                <div
                  key={guest.id || idx}
                  onClick={() => {
                    setSelectedRegisteredGuest(guest)
                    setSelectedGuestId(null)
                  }}
                  className={cn(
                    'p-4 border-b border-gray-50 flex items-center gap-4 cursor-pointer transition-all hover:bg-blue-50/30',
                    selectedRegisteredGuest?.id === guest.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                    guest.ageCategory === 'child' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  )}>
                    {guest.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{guest.fullName}</p>
                      {guest.isPrimary && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">Primary</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {guest.booking?.bookingRef} · Room {guest.booking?.room?.roomNumber}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase',
                    guest.ageCategory === 'adult' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {guest.ageCategory}
                  </span>
                </div>
              ))
            )}
            {(!items || items.length === 0) && !isLoading && (
              <div className="py-20 text-center text-gray-400">
                <User size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No guests found</p>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {selectedGuestId ? (
            detailLoading ? (
              <div className="p-10 text-center animate-pulse text-gray-400">Loading profile...</div>
            ) : (
              <div className="flex-1 overflow-y-auto thin-scrollbar p-8">
                <div className="flex items-start gap-6 mb-10">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-100">
                    {guestDetail.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{guestDetail.fullName}</h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                      <Globe size={14} /> {guestDetail.nationality || 'Tanzanian'}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all">Edit Profile</button>
                      <button className="px-4 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all">New Booking</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                  <InfoItem icon={<Phone size={16} />} label="Phone" value={guestDetail.phone} />
                  <InfoItem icon={<Mail size={16} />} label="Email" value={guestDetail.email || 'No email provided'} />
                  <InfoItem icon={<User size={16} />} label="ID Type" value={guestDetail.idType || 'Not set'} />
                  <InfoItem icon={<User size={16} />} label="ID Number" value={guestDetail.idNumber || 'Not set'} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History size={16} /> Booking History
                  </h3>
                  <div className="space-y-3">
                    {guestDetail.bookings?.map((booking: any) => (
                      <div key={booking.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-between hover:bg-white hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-bold text-blue-600 text-xs">
                            {booking.room?.roomNumber}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{booking.bookingRef}</p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {format(new Date(booking.checkIn), 'dd MMM')} - {format(new Date(booking.checkOut), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          booking.status === 'checked_out' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                        )}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {(!guestDetail.bookings || guestDetail.bookings.length === 0) && (
                      <p className="text-center py-6 text-sm text-gray-400">No previous bookings</p>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : selectedRegisteredGuest ? (
            <div className="flex-1 overflow-y-auto thin-scrollbar p-8">
              <div className="flex items-start gap-6 mb-8">
                <div className={cn(
                  'w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-xl shrink-0',
                  selectedRegisteredGuest.ageCategory === 'child' ? 'bg-amber-500 shadow-amber-100' : 'bg-blue-600 shadow-blue-100'
                )}>
                  {selectedRegisteredGuest.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedRegisteredGuest.fullName}</h2>
                    {selectedRegisteredGuest.isPrimary && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Primary Guest</span>
                    )}
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      selectedRegisteredGuest.ageCategory === 'adult' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    )}>
                      {selectedRegisteredGuest.ageCategory}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Registered stay guest</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <InfoItem icon={<Phone size={16} />} label="Phone" value={selectedRegisteredGuest.phone || 'Not provided'} />
                <InfoItem icon={<Mail size={16} />} label="Email" value={selectedRegisteredGuest.email || 'Not provided'} />
                <InfoItem icon={<Globe size={16} />} label="Nationality" value={selectedRegisteredGuest.nationality || 'Not set'} />
                <InfoItem icon={<User size={16} />} label="ID Document" value={selectedRegisteredGuest.idType ? `${selectedRegisteredGuest.idType.replace(/_/g, ' ')} · ${selectedRegisteredGuest.idNumber || '—'}` : 'Not set'} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BedDouble size={16} /> Associated Booking
                </h3>
                <div className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-bold text-blue-600 text-xs">
                        {selectedRegisteredGuest.booking?.room?.roomNumber}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedRegisteredGuest.booking?.bookingRef}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">{selectedRegisteredGuest.booking?.bookingType} booking</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      selectedRegisteredGuest.booking?.status === 'checked_out' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                    )}>
                      {selectedRegisteredGuest.booking?.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[12px]">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      <span>Check In: {selectedRegisteredGuest.booking?.checkIn ? format(new Date(selectedRegisteredGuest.booking.checkIn), 'dd MMM yyyy') : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      <span>Check Out: {selectedRegisteredGuest.booking?.checkOut ? format(new Date(selectedRegisteredGuest.booking.checkOut), 'dd MMM yyyy') : '—'}</span>
                    </div>
                  </div>
                  {selectedRegisteredGuest.booking?.company && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-[12px] text-gray-600">
                      <BadgeInfo size={14} className="text-blue-500" />
                      <span>Company: <span className="font-semibold text-gray-900">{selectedRegisteredGuest.booking.company.name}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center text-gray-300">
              <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                <User size={48} className="opacity-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Select a Guest</h3>
              <p className="text-sm mt-2">Choose a guest from the directory to view their full profile and history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-700">{value}</p>
      </div>
    </div>
  )
}
