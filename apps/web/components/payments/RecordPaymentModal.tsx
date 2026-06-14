'use client'

import { useState } from 'react'
import { useRecordPayment } from '@/hooks/usePayments'
import { Booking } from '@/types/booking'
import { X, CreditCard, Wallet, Banknote, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  booking: Booking
  onClose: () => void
}

const METHODS = [
  { id: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
  { id: 'mpesa', label: 'M-Pesa', icon: <Wallet size={18} /> },
  { id: 'visa', label: 'Card (Visa/MC)', icon: <CreditCard size={18} /> },
  { id: 'bank_transfer', label: 'Bank', icon: <Building2 size={18} /> },
]

export default function RecordPaymentModal({ booking, onClose }: Props) {
  const [amount, setAmount] = useState(booking.balanceDue.toString())
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  const { mutate: record, isPending } = useRecordPayment()

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Tafadhali weka kiasi sahihi')
      return
    }

    record({
      bookingId: booking.id,
      amount: numAmount,
      method,
      notes
    }, {
      onSuccess: () => {
        toast.success('Malipo yamerekodiwa na risiti imetengenezwa')
        onClose()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kurekodi malipo')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-[440px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">Balance Due</span>
            <span className="text-lg font-bold text-blue-900">TZS {Number(booking.balanceDue).toLocaleString()}</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Amount to Pay (TZS)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all",
                      method === m.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                        : "bg-white border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50/50"
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="e.g. M-Pesa ref number..."
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
          >
            {isPending ? 'Processing...' : 'Complete Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
