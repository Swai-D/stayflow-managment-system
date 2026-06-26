'use client'

import { useState } from 'react'
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePOStatus, useReceivePO, useSuppliers, useStoreItems } from '@/hooks/useStore'
import { formatTZS, formatDateShort } from '@/lib/formatters'
import { PO_STATUS_CONFIG, type PurchaseOrder, type POStatus } from '@/types/store'
import {
  Plus, Search, X,
  Truck, CheckCircle, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INPUT = "w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all bg-white"

const STATUS_FLOW: POStatus[] = ['PENDING','RECEIVED','CLOSED']

// ── PO Detail Modal ──────────────────────────────────────────────────────────
function PODetailModal({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const cfg = PO_STATUS_CONFIG[po.status]
  const receivePO = useReceivePO()
  const updateStatus = useUpdatePOStatus()

  const nextStatus: Partial<Record<POStatus, { label: string; action: POStatus }>> = {
    PENDING:  { label:'Mark as Received', action:'RECEIVED' },
    RECEIVED: { label:'Close Order',      action:'CLOSED'   },
  }
  const next = nextStatus[po.status]

  const handleAction = () => {
    if (!next) return
    if (next.action === 'RECEIVED') {
      receivePO.mutate(po.id, { onSuccess: () => onClose() })
    } else {
      updateStatus.mutate({ id: po.id, status: next.action }, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-bold text-gray-900">{po.poNumber}</h2>
              <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                {cfg.label}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {po.supplier.name} · Created {formatDateShort(po.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 mt-0.5">
            <X size={13}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status flow */}
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {STATUS_FLOW.map((s, i) => {
              const sCfg = PO_STATUS_CONFIG[s]
              const isPast = STATUS_FLOW.indexOf(po.status) > i
              const isCurrent = po.status === s
              return (
                <div key={s} className="flex items-center flex-shrink-0">
                  <div className={cn(
                    'flex flex-col items-center gap-1',
                  )}>
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2',
                      isCurrent ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : isPast ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-200 text-gray-300'
                    )}>
                      {isPast ? <CheckCircle size={13}/> : i + 1}
                    </div>
                    <span className={cn('text-[9px] font-semibold whitespace-nowrap',
                      isCurrent ? 'text-[#2563EB]' : isPast ? 'text-green-600' : 'text-gray-300')}>
                      {sCfg.label.split(' ')[0]}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={cn('w-8 h-0.5 mx-0.5 mb-4 flex-shrink-0',
                      isPast ? 'bg-green-400' : 'bg-gray-200')}/>
                  )}
                </div>
              )
            })}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Supplier</p>
              <p className="text-[13px] font-semibold text-gray-900">{po.supplier.name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{po.supplier.phone}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Expected Delivery</p>
              <p className="text-[13px] font-semibold text-gray-900">
                {po.expectedDelivery ? formatDateShort(po.expectedDelivery) : 'Not set'}
              </p>
              {po.receivedAt && <p className="text-[11px] text-green-600 mt-0.5">Received {formatDateShort(po.receivedAt)}</p>}
            </div>
          </div>

          {/* Items table */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 mb-3">Order Items</h3>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Item','Unit','Qty Ordered','Qty Received','Unit Cost','Total'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10.5px] text-gray-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{item.item.name}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-500">{item.item.unit}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700 font-semibold">{item.quantityOrdered}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[13px] font-semibold',
                          item.quantityReceived === item.quantityOrdered ? 'text-green-600'
                            : item.quantityReceived > 0 ? 'text-amber-600' : 'text-gray-400')}>
                          {item.quantityReceived}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{formatTZS(item.unitCost)}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">{formatTZS(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={5} className="px-4 py-3 text-[12px] font-bold text-gray-700 text-right">Total Amount</td>
                    <td className="px-4 py-3 text-[15px] font-bold text-gray-900">{formatTZS(po.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {po.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Notes</p>
              <p className="text-[12px] text-amber-800">{po.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
              Close
            </button>
            {next && (
              <button onClick={handleAction} disabled={receivePO.isPending || updateStatus.isPending}
                className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
                {receivePO.isPending || updateStatus.isPending ? 'Processing...' : next.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── New PO Modal ─────────────────────────────────────────────────────────────
function NewPOModal({ onClose }: { onClose: () => void }) {
  const [supplierId, setSupplierId] = useState('')
  const [delivery, setDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ itemId:'', qty:'', unitCost:'' }])

  const { data: suppliers = [] } = useSuppliers()
  const { data: itemsList = [] } = useStoreItems()
  const createPO = useCreatePurchaseOrder()

  const addItem = () => setItems(prev => [...prev, { itemId:'', qty:'', unitCost:'' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_,j) => j !== i))
  const updateItem = (i: number, k: string, v: string) => {
    setItems(prev => prev.map((item, j) => {
      if (j !== i) return item
      const updated = { ...item, [k]: v }
      if (k === 'itemId') {
        const found = itemsList.find(x => x.id === v)
        updated.unitCost = found ? String(found.unitCost) : ''
      }
      return updated
    }))
  }

  const total = items.reduce((s, item) => s + (Number(item.qty) * Number(item.unitCost)), 0)

  const handleCreate = () => {
    createPO.mutate({
      supplierId,
      expectedDelivery: delivery ? new Date(delivery) : undefined,
      notes: notes || undefined,
      items: items
        .filter(x => x.itemId && x.qty)
        .map(x => ({
          itemId: x.itemId,
          quantityOrdered: Number(x.qty),
          unitCost: Number(x.unitCost)
        }))
    }, {
      onSuccess: () => onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-[16px] font-bold text-gray-900">New Purchase Order</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={13}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Supplier</label>
              <select className={INPUT} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Expected Delivery</label>
              <input type="date" className={INPUT} value={delivery} onChange={e => setDelivery(e.target.value)}/>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11.5px] font-semibold text-gray-700">Order Items</label>
              <button onClick={addItem}
                className="flex items-center gap-1 text-[11px] text-[#2563EB] font-semibold hover:underline">
                <Plus size={11}/> Add item
              </button>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Item','Qty','Unit Cost (TZS)','Total',''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10.5px] text-gray-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2">
                        <select className={cn(INPUT, 'h-9 text-[12px]')} value={item.itemId}
                          onChange={e => updateItem(i, 'itemId', e.target.value)}>
                          <option value="">Select item...</option>
                          {itemsList.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 w-20">
                        <input type="number" min="1" placeholder="0" className={cn(INPUT, 'h-9 text-[12px]')}
                          value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)}/>
                      </td>
                      <td className="px-3 py-2 w-32">
                        <input type="number" min="0" placeholder="0" className={cn(INPUT, 'h-9 text-[12px]')}
                          value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)}/>
                      </td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-gray-900 whitespace-nowrap">
                        {item.qty && item.unitCost ? formatTZS(Number(item.qty) * Number(item.unitCost)) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <X size={11}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={3} className="px-3 py-2.5 text-[12px] font-bold text-gray-700 text-right">Total</td>
                    <td className="px-3 py-2.5 text-[14px] font-bold text-gray-900">{formatTZS(total)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className={cn(INPUT, 'resize-none h-16')} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Delivery instructions, urgency notes..."/>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={!supplierId || items.every(i => !i.itemId) || createPO.isPending}
              className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
              {createPO.isPending ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Main Page ────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const { data: orders = [], isLoading } = usePurchaseOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<POStatus | 'All'>('All')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [showNewPO, setShowNewPO] = useState(false)

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded-xl" />
          <div className="h-20 bg-gray-200 rounded-xl" />
          <div className="h-20 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  const filtered = orders.filter(po => {
    const matchSearch = !search || po.poNumber.toLowerCase().includes(search.toLowerCase()) || po.supplier.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || po.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPending  = orders.filter(o => ['DRAFT','SUBMITTED','APPROVED','SENT_TO_SUPPLIER'].includes(o.status)).length
  const totalValue    = orders.filter(o => o.status !== 'CLOSED').reduce((s, o) => s + o.totalAmount, 0)
  const totalReceived = orders.filter(o => o.status === 'RECEIVED').length

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Active Orders',     value: totalPending,           color:'text-[#2563EB]' },
          { label:'Total Value (Open)',value: formatTZS(totalValue),  color:'text-gray-900'  },
          { label:'Received This Month',value: totalReceived,         color:'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="text-[11px] text-gray-400 font-medium mb-1">{s.label}</p>
            <p className={cn('text-[22px] font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-wrap gap-y-2">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', ...Object.keys(PO_STATUS_CONFIG)] as (POStatus|'All')[]).map(s => {
              const cfg = s !== 'All' ? PO_STATUS_CONFIG[s] : null
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors',
                    statusFilter === s
                      ? s === 'All' ? 'bg-gray-800 text-white' : cn(cfg?.bg, cfg?.text)
                      : 'text-gray-500 hover:bg-gray-100')}>
                  {s === 'All' ? 'All' : cfg?.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 min-w-[180px]">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO or supplier..."
                className="text-[12px] outline-none text-gray-700 placeholder:text-gray-400 bg-transparent flex-1"/>
            </div>
            <button onClick={() => setShowNewPO(true)}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors whitespace-nowrap">
              <Plus size={13}/> New PO
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['PO Number','Supplier','Items','Expected','Total Amount','Status',''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] text-gray-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-gray-400">No purchase orders found</td></tr>
              ) : filtered.map(po => {
                const cfg = PO_STATUS_CONFIG[po.status]
                return (
                  <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedPO(po)}>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-bold text-gray-900">{po.poNumber}</p>
                      <p className="text-[10px] text-gray-400">{formatDateShort(po.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Truck size={13} className="text-gray-500"/>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{po.supplier.name}</p>
                          <p className="text-[10px] text-gray-400">{po.supplier.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600">
                      {po.items.length} item{po.items.length > 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 whitespace-nowrap">
                      {po.expectedDelivery ? formatDateShort(po.expectedDelivery) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{formatTZS(po.totalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-[6px] text-[11px] font-semibold', cfg.bg, cfg.text)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={e => { e.stopPropagation(); setSelectedPO(po) }}
                        className="flex items-center gap-1 text-[11px] text-[#2563EB] font-semibold bg-[#EFF6FF] hover:bg-[#DBEAFE] px-2.5 py-1.5 rounded-lg transition-colors">
                        <Eye size={11}/> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPO && <PODetailModal po={selectedPO} onClose={() => setSelectedPO(null)}/>}
      {showNewPO && <NewPOModal onClose={() => setShowNewPO(false)}/>}
    </div>
  )
}
