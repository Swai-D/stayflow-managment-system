'use client'

import { useState } from 'react'
import { useStoreTransactions, useCreateTransaction } from '@/hooks/useStore'
import { formatTZS, formatDateTime } from '@/lib/formatters'
import { TRANSACTION_TYPE_CONFIG, type StoreTransaction, type TransactionType } from '@/types/store'
import { Search, Plus, Filter, Download, X, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Mock data — TODO: replace with useStoreTransactions() ───────────────────
const MOCK_TX: StoreTransaction[] = [
  { id:'t1', itemId:'1', item:{ id:'1', name:'Serengeti Beer (500ml)', unit:'BOTTLE', category:'FB', subCategory:'Bar Stock', sku:'FB-001', currentStock:48, minimumStock:24, maximumStock:120, unitCost:1800, sellingPrice:3500, isSellable:true, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'STOCK_IN',   quantity:24, unitCost:1800, balanceBefore:24, balanceAfter:48, reference:'PO-2025-001', notes:'Delivery received from TBL', performedBy:{ id:'u1', fullName:'Rehema Khamis' }, createdAt:new Date(Date.now()-3600000).toISOString() },
  { id:'t2', itemId:'4', item:{ id:'4', name:'Mineral Water (500ml)',  unit:'BOTTLE', category:'FB', subCategory:'Beverages',  sku:'FB-004', currentStock:80, minimumStock:40, maximumStock:200, unitCost:400,  sellingPrice:1000, isSellable:true, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'STOCK_OUT',  quantity:6,  unitCost:400,  balanceBefore:46, balanceAfter:40, reference:'Room 108 — Amina', notes:undefined, performedBy:{ id:'u2', fullName:'Juma Salim'    }, createdAt:new Date(Date.now()-7200000).toISOString() },
  { id:'t3', itemId:'9', item:{ id:'9', name:'Shower Gel (50ml)',      unit:'PCS',    category:'HOTEL', subCategory:'Bathroom Amenities', sku:'HT-003', currentStock:8, minimumStock:20, maximumStock:80, unitCost:1200, sellingPrice:null, isSellable:false, isActive:true, stockStatus:'low_stock', createdAt:'' }, type:'STOCK_OUT',  quantity:4,  unitCost:1200, balanceBefore:12, balanceAfter:8, reference:'Housekeeping', notes:undefined, performedBy:{ id:'u3', fullName:'Grace Nyanda'  }, createdAt:new Date(Date.now()-10800000).toISOString() },
  { id:'t4', itemId:'5', item:{ id:'5', name:'Fresh Juice (Orange)',   unit:'PCS',    category:'FB', subCategory:'Beverages', sku:'FB-005', currentStock:20, minimumStock:10, maximumStock:50, unitCost:1500, sellingPrice:4000, isSellable:true, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'WASTAGE',    quantity:2,  unitCost:1500, balanceBefore:22, balanceAfter:20, reference:undefined, notes:'Expired — not sold', performedBy:{ id:'u1', fullName:'Rehema Khamis' }, createdAt:new Date(Date.now()-14400000).toISOString() },
  { id:'t5', itemId:'11',item:{ id:'11',name:'Toilet Paper (roll)',    unit:'ROLL',   category:'HOTEL', subCategory:'Bathroom Amenities', sku:'HT-005', currentStock:30, minimumStock:24, maximumStock:100, unitCost:500, sellingPrice:null, isSellable:false, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'STOCK_IN',   quantity:12, unitCost:500,  balanceBefore:18, balanceAfter:30, reference:'PO-2025-002', notes:undefined, performedBy:{ id:'u2', fullName:'Juma Salim'    }, createdAt:new Date(Date.now()-86400000).toISOString() },
  { id:'t6', itemId:'3', item:{ id:'3', name:'Coca Cola (300ml)',      unit:'BOTTLE', category:'FB', subCategory:'Beverages', sku:'FB-003', currentStock:60, minimumStock:30, maximumStock:150, unitCost:600, sellingPrice:1500, isSellable:true, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'STOCK_IN',   quantity:30, unitCost:600,  balanceBefore:30, balanceAfter:60, reference:'PO-2025-002', notes:undefined, performedBy:{ id:'u1', fullName:'Rehema Khamis' }, createdAt:new Date(Date.now()-90000000).toISOString() },
  { id:'t7', itemId:'7', item:{ id:'7', name:'Bath Towel (Large)',     unit:'PCS',    category:'HOTEL', subCategory:'Linen & Towels', sku:'HT-001', currentStock:20, minimumStock:16, maximumStock:40, unitCost:8000, sellingPrice:null, isSellable:false, isActive:true, stockStatus:'in_stock', createdAt:'' }, type:'ADJUSTMENT', quantity:20, unitCost:8000, balanceBefore:18, balanceAfter:20, reference:'Stock count', notes:'Stock count correction', performedBy:{ id:'u1', fullName:'Rehema Khamis' }, createdAt:new Date(Date.now()-172800000).toISOString() },
]

const TYPE_FILTERS = ['All', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WASTAGE']
const INPUT = "w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all bg-white"

// ── New Transaction Modal ────────────────────────────────────────────────────
function NewTransactionModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<TransactionType>('STOCK_IN')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')

  const ITEMS_LIST = [
    { id:'1',  name:'Serengeti Beer (500ml)',  stock:48, unit:'BOTTLE' },
    { id:'2',  name:'Kilimanjaro Beer (500ml)',stock:36, unit:'BOTTLE' },
    { id:'3',  name:'Coca Cola (300ml)',        stock:60, unit:'BOTTLE' },
    { id:'4',  name:'Mineral Water (500ml)',    stock:80, unit:'BOTTLE' },
    { id:'9',  name:'Shower Gel (50ml)',        stock:8,  unit:'PCS'    },
    { id:'10', name:'Toilet Soap (bar)',        stock:15, unit:'PCS'    },
    { id:'11', name:'Toilet Paper (roll)',      stock:30, unit:'ROLL'   },
    { id:'12', name:'Garbage Bags (roll)',      stock:5,  unit:'ROLL'   },
  ]

  const selectedItem = ITEMS_LIST.find(i => i.id === itemId)
  const types = [
    { v:'STOCK_IN',   l:'Stock In',   c:'text-green-600', bg:'bg-green-50'  },
    { v:'STOCK_OUT',  l:'Stock Out',  c:'text-blue-600',  bg:'bg-blue-50'   },
    { v:'ADJUSTMENT', l:'Adjustment', c:'text-gray-600',  bg:'bg-gray-100'  },
    { v:'WASTAGE',    l:'Wastage',    c:'text-red-500',   bg:'bg-red-50'    },
  ]

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
              {ITEMS_LIST.map(i => (
                <option key={i.id} value={i.id}>{i.name} (stock: {i.stock} {i.unit.toLowerCase()})</option>
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
            <label className="text-[11.5px] font-semibold text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className={cn(INPUT, 'resize-none h-16')} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional details..."/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={onClose} disabled={!itemId || !qty}
              className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
              Record Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  // TODO: const { data: transactions = [] } = useStoreTransactions(filters)
  const transactions = MOCK_TX
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.item.name.toLowerCase().includes(search.toLowerCase()) || tx.reference?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || tx.type === typeFilter
    return matchSearch && matchType
  })

  // Summary stats
  const totalIn  = transactions.filter(t => t.type === 'STOCK_IN').reduce((s, t) => s + (t.quantity * (t.unitCost ?? 0)), 0)
  const totalOut = transactions.filter(t => t.type === 'STOCK_OUT').length
  const wastage  = transactions.filter(t => t.type === 'WASTAGE').reduce((s, t) => s + (t.quantity * (t.unitCost ?? 0)), 0)

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
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
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] text-gray-400">No transactions found</td></tr>
              ) : filtered.map(tx => {
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

      {showModal && <NewTransactionModal onClose={() => setShowModal(false)}/>}
    </div>
  )
}
