'use client'

import { useState } from 'react'
import {
  useGuestPortalRequests,
  useUpdateRequestStatus,
  type GuestPortalRequest
} from '@/hooks/useGuestPortal'
import { cn } from '@/lib/utils'
import { Search, Loader2, ConciergeBell, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
const TYPE_OPTIONS = ['ALL', 'laundry', 'taxi', 'tour', 'housekeeping', 'other']

const TYPE_ICONS: Record<string, string> = {
  laundry: '👕',
  taxi: '🚕',
  tour: '🏔️',
  housekeeping: '🧹',
  other: '💬'
}

function statusClass(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-100'
    default: return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}

export default function GuestPortalRequestsPage() {
  const [status, setStatus] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [search, setSearch] = useState('')
  const { data, isLoading, refetch } = useGuestPortalRequests(
    type === 'ALL' ? undefined : type,
    status === 'ALL' ? undefined : status,
    search || undefined
  )
  const { mutate: updateStatus, isPending: updating } = useUpdateRequestStatus()

  const requests: GuestPortalRequest[] = data?.requests || []

  const handleStatusChange = (req: GuestPortalRequest, newStatus: string) => {
    updateStatus(
      { id: req.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Request ${req.requestId} updated`),
        onError: () => toast.error('Failed to update request')
      }
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Guest Portal Requests</h1>
          <p className="text-[12px] text-[#9ca3af] font-medium">Service requests placed by guests</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1">
          <Search size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search request, guest, room..."
            className="bg-transparent outline-none text-[13px] w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'px-3 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors capitalize',
                type === t ? 'bg-[#8B4530] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors',
                status === s ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-gray-300" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <ConciergeBell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-bold">No requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Request</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Room / Guest</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#111827]">{req.requestId}</p>
                    <p className="text-[11px] text-gray-400">{new Date(req.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-bold capitalize text-gray-700">
                      {TYPE_ICONS[req.type]} {req.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#111827]">Room {req.booking.room.roomNumber}</p>
                    <p className="text-[11px] text-gray-500">
                      {req.guestAccount.firstName} {req.guestAccount.lastName}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[12px] text-gray-600 max-w-[300px]">
                      {Object.entries(req.payload)
                        .filter(([key]) => key !== 'type')
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key}:</span>{' '}
                            <span className="text-gray-500">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={req.status}
                      disabled={updating}
                      onChange={e => handleStatusChange(req, e.target.value)}
                      className={cn(
                        'text-[11px] font-bold uppercase px-2 py-1 rounded-lg border outline-none cursor-pointer',
                        statusClass(req.status)
                      )}
                    >
                      {STATUS_OPTIONS.filter(s => s !== 'ALL').map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
