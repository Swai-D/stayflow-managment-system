import { Booking, BOOKING_STATUS_CONFIG } from '@/types/booking'
import { format } from 'date-fns'
import { X, User, Calendar, Home, CreditCard, CheckCircle, LogOut, Printer } from 'lucide-react'
import { useCheckIn, useCheckOut } from '@/hooks/useBookings'

interface Props {
  booking: Booking
  onClose: () => void
}

export default function BookingDetailModal({ booking, onClose }: Props) {
  const { mutate: checkIn, isPending: isCheckingIn } = useCheckIn()
  const { mutate: checkOut, isPending: isCheckingOut } = useCheckOut()

  const handleCheckIn = () => {
    checkIn(booking.id, { onSuccess: () => onClose() })
  }

  const handleCheckOut = () => {
    checkOut(booking.id, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
              {booking.room.roomNumber}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{booking.guest.fullName}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{booking.bookingRef}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-2 gap-10">
          {/* Details Column */}
          <div className="space-y-8">
            <DetailItem icon={<Calendar size={18} />} label="Stay Period">
              <p className="text-sm font-bold text-gray-900">
                {format(new Date(booking.checkIn), 'EEE, dd MMM')} - {format(new Date(booking.checkOut), 'EEE, dd MMM yyyy')}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total {booking.adults + booking.children} Guests</p>
            </DetailItem>

            <DetailItem icon={<Home size={18} />} label="Room Type">
              <p className="text-sm font-bold text-gray-900 capitalize">{booking.room.type} Room</p>
              <p className="text-xs text-gray-500 mt-1">{booking.room.name}</p>
            </DetailItem>

            <DetailItem icon={<CreditCard size={18} />} label="Financial Summary">
              <div className="space-y-1.5 mt-1">
                <div className="flex justify-between text-xs">
                   <span className="text-gray-400">Room Total</span>
                   <span className="font-bold text-gray-700">TZS {Number(booking.roomTotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                   <span className="text-gray-400">Paid Amount</span>
                   <span className="font-bold text-green-600">TZS {Number(booking.paidAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-gray-50">
                   <span className="font-bold text-gray-900">Balance Due</span>
                   <span className="font-extrabold text-blue-600">TZS {Number(booking.balanceDue).toLocaleString()}</span>
                </div>
              </div>
            </DetailItem>
          </div>

          {/* Status & Actions Column */}
          <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 flex flex-col">
            <div className="mb-8">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Current Status</p>
               <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold ${
                 BOOKING_STATUS_CONFIG[booking.status].bgClass
               } ${BOOKING_STATUS_CONFIG[booking.status].textClass}`}>
                 {BOOKING_STATUS_CONFIG[booking.status].label}
               </span>
            </div>

            <div className="space-y-3 mt-auto">
              {booking.status === 'confirmed' && (
                <button 
                  disabled={isCheckingIn}
                  onClick={handleCheckIn}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                >
                  <CheckCircle size={18} /> {isCheckingIn ? 'Processing...' : 'Check In Guest'}
                </button>
              )}
              {booking.status === 'checked_in' && (
                <button 
                  disabled={isCheckingOut}
                  onClick={handleCheckOut}
                  className="w-full py-3.5 bg-red-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 shadow-xl shadow-red-100 transition-all"
                >
                  <LogOut size={18} /> {isCheckingOut ? 'Processing...' : 'Check Out Guest'}
                </button>
              )}
              <button className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                <CreditCard size={18} /> Record Payment
              </button>
              <button className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                <Printer size={18} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, children }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}
