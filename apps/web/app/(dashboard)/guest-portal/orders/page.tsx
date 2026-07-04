'use client'

import { useState } from 'react'
import {
  useGuestPortalOrders,
  useUpdateOrderStatus,
  type GuestPortalOrder
} from '@/hooks/useGuestPortal'
import { formatTZS } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Search, Loader2, ShoppingCart, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED']

function statusClass(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'PREPARING': return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'DELIVERED': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-100'
    default: return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}

export default function GuestPortalOrdersPage() {
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const { data, isLoading, refetch } = useGuestPortalOrders(
    status === 'ALL' ? undefined : status,
    search || undefined
  )
  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus()

  const orders: GuestPortalOrder[] = data?.orders || []

  const handleStatusChange = (order: GuestPortalOrder, newStatus: string) => {
    updateStatus(
      { id: order.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Order ${order.orderId} updated`),
        onError: () => toast.error('Failed to update order')
      }
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Guest Portal Orders</h1>
          <p className="text-[12px] text-[#9ca3af] font-medium">Room service orders placed by guests</p>
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
            placeholder="Search order, guest, room..."
            className="bg-transparent outline-none text-[13px] w-full"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-colors',
                status === s ? 'bg-[#2563EB] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-bold">No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Room / Guest</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#111827]">{order.orderId}</p>
                    <p className="text-[11px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#111827]">Room {order.booking.room.roomNumber}</p>
                    <p className="text-[11px] text-gray-500">
                      {order.guestAccount.firstName} {order.guestAccount.lastName}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[12px] text-gray-600 max-w-[240px]">
                      {order.items.map((item, i) => (
                        <span key={i}>
                          {item.itemName} × {item.quantity}{i < order.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    {order.notes && <p className="text-[11px] text-gray-400 mt-1">Note: {order.notes}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-bold text-[#2563EB]">{formatTZS(order.totalAmount)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={order.status}
                      disabled={updating}
                      onChange={e => handleStatusChange(order, e.target.value)}
                      className={cn(
                        'text-[11px] font-bold uppercase px-2 py-1 rounded-lg border outline-none cursor-pointer',
                        statusClass(order.status)
                      )}
                    >
                      {STATUS_OPTIONS.filter(s => s !== 'ALL').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-1 rounded-full',
                      order.postedToRoom ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {order.postedToRoom ? 'Posted' : 'Pending'}
                    </span>
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
