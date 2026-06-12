'use client'

import { useState } from 'react'
import { useGuests, useGuest } from '@/hooks/useGuests'
import { format } from 'date-fns'
import { Search, User, Phone, Mail, Globe, History, ChevronRight } from 'lucide-react'

export default function GuestsPage() {
  const [search, setSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)
  
  const { data: guests, isLoading } = useGuests(search)
  const { data: guestDetail, isLoading: detailLoading } = useGuest(selectedGuestId || '')

  return (
    <div className="space-y-6 pt-4 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Guests Management</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Guest List */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Guest Directory</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{guests?.length ?? 0} Total</span>
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
            ) : guests?.map((guest: any) => (
              <div 
                key={guest.id}
                onClick={() => setSelectedGuestId(guest.id)}
                className={`p-4 border-b border-gray-50 flex items-center gap-4 cursor-pointer transition-all hover:bg-blue-50/30 ${
                  selectedGuestId === guest.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
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
            ))}
            {(!guests || guests.length === 0) && !isLoading && (
              <div className="py-20 text-center text-gray-400">
                <User size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No guests found</p>
              </div>
            )}
          </div>
        </div>

        {/* Guest Details */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {selectedGuestId ? (
            detailLoading ? (
              <div className="p-10 text-center animate-pulse text-gray-400">Loading profile...</div>
            ) : (
              <div className="flex-1 overflow-y-auto thin-scrollbar p-8">
                {/* Profile Header */}
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

                {/* Booking History */}
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          booking.status === 'checked_out' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                        }`}>
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
