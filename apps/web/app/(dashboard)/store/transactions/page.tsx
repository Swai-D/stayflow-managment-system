'use client'

import { useState, useEffect } from 'react'
import { useStoreTransactions, useCreateTransaction, useStoreItems } from '@/hooks/useStore'
import { formatTZS } from '@/lib/formatters'
import { TRANSACTION_TYPE_CONFIG, type TransactionType } from '@/types/store'
import { Search, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'

const TYPE_FILTERS = ['All', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WASTAGE']
const INPUT = "w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all bg-white"

// ── New Transaction Modal ────────────────────────────────────────────────────
function NewTransactionModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<TransactionType>('STOCK_IN')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')

  const { data: items = [] } = useStoreItems()
  const createTx = useCreateTransaction()

  const selectedItem = items.find(i => i.id === itemId)
  const types = [
    { v:'STOCK_IN',   l:'Stock In',   c:'text-green-600', bg:'bg-green-50'  },
    { v:'STOCK_OUT',  l:'Stock Out',  c:'text-blue-600',  bg:'bg-blue-50'   },
    { v:'ADJUSTMENT', l:'Adjustment', c:'text-gray-600',  bg:'bg-gray-100'  },
    { v:'WASTAGE',    l:'Wastage',    c:'text-red-500',   bg:'bg-red-50'    },
  ]

  const handleRecord = () => {
    createTx.mutate({
      itemId,
      type,
      quantity: Number(qty),
      reference: ref || undefined,
      notes: notes || undefined
    }, {
      onSuccess: () => onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900">New Transaction</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={13}/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Type selection */}
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 block mb-2">Transaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {types.map(t => (
                <button key={t.v} onClick={() => setType(t.v as TransactionType)}
                  className={cn('h-9 rounded-lg border-2 text-[11px] font-semibold transition-colors',
                    type === t.v ? `border-current ${t.bg} ${t.c}` : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">Item</label>
            <select className={INPUT} value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Select item...</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} (stock: {i.currentStock} {i.unit.toLowerCase()})</option>
              ))}
            </select>
          </div>
          {/* Qty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">
              {type === 'ADJUSTMENT' ? 'New Stock Level' : 'Quantity'}
              {selectedItem && <span className="text-gray-400 font-normal"> ({selectedItem.unit.toLowerCase()})</span>}
            </label>
            <input type="number" min="0" className={INPUT} value={qty} onChange={e => setQty(e.target.value)}
              placeholder={type === 'ADJUSTMENT' ? 'Correct stock level' : 'Enter quantity'}/>
          </div>
          {/* Reference */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">Reference <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className={INPUT} value={ref} onChange={e => setRef(e.target.value)}
              placeholder="PO number, booking ref, room number..."/>
          </div>
          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">
              Notes {(type === 'ADJUSTMENT' || type === 'WASTAGE') && <span className="text-red-500">*</span>}
              {(type !== 'ADJUSTMENT' && type !== 'WASTAGE') && <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <textarea className={cn(INPUT, 'resize-none h-16')} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional details..."/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleRecord} disabled={!itemId || !qty || ((type === 'ADJUSTMENT' || type === 'WASTAGE') && !notes.trim()) || createTx.isPending}
              className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
              {createTx.isPending ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { data: transactions = [], isLoading } = useStoreTransactions()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 10
  const [now] = useState(() => Date.now())

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


  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.item.name.toLowerCase().includes(search.toLowerCase()) || tx.reference?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || tx.type === typeFilter
    return matchSearch && matchType
  })

  const totalPages = Math.ceil(filtered.length / limit)
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  useEffect(() => {
    setPage(1)
  }, [search, typeFilter])

  // Summary stats
  const totalIn  = transactions.filter(t => t.type === 'STOCK_IN').reduce((s, t) => s + (t.quantity * (t.unitCost ?? 0)), 0)
  const totalOut = transactions.filter(t => t.type === 'STOCK_OUT').length
  const wastage  = transactions.filter(t => t.type === 'WASTAGE').reduce((s, t) => s + (t.quantity * (t.unitCost ?? 0)), 0)

  const formatRelative = (iso: string) => {
    const diff = now - new Date(iso).getTime()
    if (diff < 3600000) return `${Math.round(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.round(diff/3600000)}h ago`
    return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
  }

  return (
    <div className="space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Stock In Value (this month)',  value: formatTZS(totalIn),   color:'text-green-600', bg:'bg-green-50' },
          { label:'Stock Out Transactions',       value: totalOut,              color:'text-[#2563EB]', bg:'bg-blue-50'  },
          { label:'Wastage Value (this month)',   value: formatTZS(wastage),    color:'text-red-500',   bg:'bg-red-50'   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="text-[11px] text-gray-400 font-medium mb-1">{s.label}</p>
            <p className={cn('text-[22px] font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          {/* Type filters */}
          <div className="flex items-center gap-1.5">
            {TYPE_FILTERS.map(f => {
              const cfg = f !== 'All' ? TRANSACTION_TYPE_CONFIG[f as keyof typeof TRANSACTION_TYPE_CONFIG] : null
              return (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={cn('h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors',
                    typeFilter === f
                      ? f === 'All' ? 'bg-gray-800 text-white' : cn(cfg?.bg, cfg?.text)
                      : 'text-gray-500 hover:bg-gray-100')}>
                  {f === 'All' ? 'All' : cfg?.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 min-w-[200px] ml-auto">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item or reference..."
              className="text-[12px] outline-none text-gray-700 placeholder:text-gray-400 bg-transparent flex-1"/>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors whitespace-nowrap">
            <Plus size={13}/> New Transaction
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['Item','Type','Qty','Balance','Cost','Reference','By','Time'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] text-gray-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] text-gray-400">No transactions found</td></tr>
              ) : paginated.map(tx => {
                const cfg = TRANSACTION_TYPE_CONFIG[tx.type]
                const isOut = tx.type === 'STOCK_OUT' || tx.type === 'WASTAGE'
                return (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[160px]">{tx.item.name}</p>
                      <p className="text-[10px] text-gray-400">{tx.item.subCategory}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold', cfg.bg, cfg.text)}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-[14px] font-bold', isOut ? 'text-red-500' : 'text-green-600')}>
                        {isOut ? '−' : '+'}{tx.quantity}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">{tx.item.unit.toLowerCase()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-500">
                      <span className="text-gray-400">{tx.balanceBefore}</span>
                      <span className="text-gray-300 mx-1.5">→</span>
                      <span className="font-bold text-gray-800">{tx.balanceAfter}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 font-medium">
                      {tx.unitCost ? formatTZS(tx.unitCost * tx.quantity) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-500 max-w-[140px]">
                      {tx.reference
                        ? <span className="truncate block">{tx.reference}</span>
                        : <span className="text-gray-300">—</span>}
                      {tx.notes && <p className="text-[10px] text-gray-400 truncate">{tx.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600">{tx.performedBy.fullName.split(' ')[0]}</td>
                    <td className="px-5 py-3.5 text-[11px] text-gray-400 whitespace-nowrap">{formatRelative(tx.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={paginated.length} total={filtered.length} />

      {showModal && <NewTransactionModal onClose={() => setShowModal(false)}/>}
    </div>
  )
}
