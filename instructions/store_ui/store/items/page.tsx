'use client'

import { useState } from 'react'
import { useStoreItems, useCreateStoreItem, useUpdateStoreItem, useCreateTransaction } from '@/hooks/useStore'
import { formatTZS } from '@/lib/formatters'
import { STOCK_STATUS_CONFIG, type StoreItem, type StoreCategory, type StockUnit } from '@/types/store'
import { Search, Plus, Filter, ArrowUpDown, Package, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Mock items — TODO: replace with useStoreItems() ─────────────────────────
const MOCK_ITEMS: StoreItem[] = [
  { id:'1', name:'Serengeti Beer (500ml)',  sku:'FB-001', category:'FB',    subCategory:'Bar Stock',          unit:'BOTTLE', currentStock:48, minimumStock:24, maximumStock:120, unitCost:1800, sellingPrice:3500,  isSellable:true,  isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'2', name:'Kilimanjaro Beer (500ml)',sku:'FB-002', category:'FB',    subCategory:'Bar Stock',          unit:'BOTTLE', currentStock:36, minimumStock:24, maximumStock:120, unitCost:1800, sellingPrice:3500,  isSellable:true,  isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'3', name:'Coca Cola (300ml)',       sku:'FB-003', category:'FB',    subCategory:'Beverages',          unit:'BOTTLE', currentStock:60, minimumStock:30, maximumStock:150, unitCost:600,  sellingPrice:1500,  isSellable:true,  isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'4', name:'Mineral Water (500ml)',   sku:'FB-004', category:'FB',    subCategory:'Beverages',          unit:'BOTTLE', currentStock:80, minimumStock:40, maximumStock:200, unitCost:400,  sellingPrice:1000,  isSellable:true,  isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'5', name:'Rice (25kg bag)',         sku:'FB-005', category:'FB',    subCategory:'Dry Foods',          unit:'KG',     currentStock:75, minimumStock:25, maximumStock:200, unitCost:2200, sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'6', name:'Cooking Oil (20L)',       sku:'FB-006', category:'FB',    subCategory:'Dry Foods',          unit:'LTR',    currentStock:40, minimumStock:20, maximumStock:100, unitCost:4500, sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'7', name:'Bath Towel (Large)',      sku:'HT-001', category:'HOTEL', subCategory:'Linen & Towels',     unit:'PCS',    currentStock:20, minimumStock:16, maximumStock:40,  unitCost:8000, sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'8', name:'Bed Sheet (King)',        sku:'HT-002', category:'HOTEL', subCategory:'Linen & Towels',     unit:'PCS',    currentStock:12, minimumStock:8,  maximumStock:24,  unitCost:15000,sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'9', name:'Shower Gel (50ml)',       sku:'HT-003', category:'HOTEL', subCategory:'Bathroom Amenities', unit:'PCS',    currentStock:8,  minimumStock:20, maximumStock:80,  unitCost:1200, sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'low_stock',  createdAt:'' },
  { id:'10',name:'Toilet Soap (bar)',       sku:'HT-004', category:'HOTEL', subCategory:'Bathroom Amenities', unit:'PCS',    currentStock:15, minimumStock:20, maximumStock:80,  unitCost:800,  sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'low_stock',  createdAt:'' },
  { id:'11',name:'Toilet Paper (roll)',     sku:'HT-005', category:'HOTEL', subCategory:'Bathroom Amenities', unit:'ROLL',   currentStock:30, minimumStock:24, maximumStock:100, unitCost:500,  sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'in_stock',   createdAt:'' },
  { id:'12',name:'Garbage Bags (roll)',     sku:'HT-006', category:'HOTEL', subCategory:'Cleaning Supplies',  unit:'ROLL',   currentStock:5,  minimumStock:6,  maximumStock:24,  unitCost:2000, sellingPrice:null,  isSellable:false, isActive:true, stockStatus:'low_stock',  createdAt:'' },
]

const CATEGORIES = ['All','FB','HOTEL']
const STATUS_FILTERS = ['All','in_stock','low_stock','out_of_stock','overstocked']
const INPUT = "w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all bg-white"

// ── Stock Transaction Modal ──────────────────────────────────────────────────
function StockModal({ item, onClose }: { item: StoreItem; onClose: () => void }) {
  const [type, setType] = useState<'STOCK_IN'|'STOCK_OUT'|'ADJUSTMENT'|'WASTAGE'>('STOCK_IN')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')

  const types = [
    { value:'STOCK_IN',   label:'Stock In',   color:'text-green-600', bg:'bg-green-50'  },
    { value:'STOCK_OUT',  label:'Stock Out',  color:'text-blue-600',  bg:'bg-blue-50'   },
    { value:'ADJUSTMENT', label:'Adjustment', color:'text-gray-600',  bg:'bg-gray-100'  },
    { value:'WASTAGE',    label:'Wastage',    color:'text-red-500',   bg:'bg-red-50'    },
  ]

  const isOut = type === 'STOCK_OUT' || type === 'WASTAGE'
  const newStock = isOut
    ? item.currentStock - Number(qty)
    : type === 'ADJUSTMENT' ? Number(qty)
    : item.currentStock + Number(qty)

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Update Stock</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.name}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X size={13}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Current stock info */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-[12px] text-gray-500 font-medium">Current Stock</span>
            <span className="text-[15px] font-bold text-gray-900">{item.currentStock} {item.unit.toLowerCase()}</span>
          </div>
          {/* Transaction type */}
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 block mb-2">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map(t => (
                <button key={t.value} onClick={() => setType(t.value as any)}
                  className={cn('h-9 rounded-lg border-2 text-[12px] font-semibold transition-colors',
                    type === t.value ? `border-current ${t.bg} ${t.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {/* Quantity */}
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">
              {type === 'ADJUSTMENT' ? 'New Stock Level' : 'Quantity'} ({item.unit.toLowerCase()})
            </label>
            <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
              placeholder={type === 'ADJUSTMENT' ? 'Enter correct stock level' : 'Enter quantity'}
              className={INPUT}/>
          </div>
          {/* Preview */}
          {qty && (
            <div className={cn('rounded-xl px-4 py-3 flex items-center justify-between text-[12px] font-semibold',
              newStock < 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#2563EB]')}>
              <span>New balance</span>
              <span>{Math.max(0, newStock)} {item.unit.toLowerCase()}</span>
            </div>
          )}
          {/* Notes */}
          <div>
            <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reason for adjustment, delivery note number..."
              className={cn(INPUT, 'resize-none h-16')}/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={onClose} disabled={!qty || Number(qty) <= 0}
              className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Item Modal ──────────────────────────────────────────────────────
function ItemFormModal({ item, onClose }: { item?: StoreItem; onClose: () => void }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sku: item?.sku ?? '',
    category: item?.category ?? 'FB',
    subCategory: item?.subCategory ?? '',
    unit: item?.unit ?? 'PCS',
    minimumStock: item?.minimumStock ?? '',
    maximumStock: item?.maximumStock ?? '',
    unitCost: item?.unitCost ?? '',
    sellingPrice: item?.sellingPrice ?? '',
    isSellable: item?.isSellable ?? false,
    location: '',
  })

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const FB_SUBCATS = ['Bar Stock','Beverages','Dry Foods','Fresh Produce','Condiments','Food']
  const HT_SUBCATS = ['Linen & Towels','Bathroom Amenities','Cleaning Supplies','Kitchen Equipment','Stationery']
  const subcats = form.category === 'FB' ? FB_SUBCATS : HT_SUBCATS
  const UNITS: StockUnit[] = ['KG','LTR','PCS','BOX','DOZEN','BOTTLE','PACK','ROLL']

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-[16px] font-bold text-gray-900">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={13}/></button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Item Name</label>
              <input className={INPUT} value={form.name} onChange={set('name')} placeholder="e.g. Serengeti Beer (500ml)"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">SKU <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={INPUT} value={form.sku} onChange={set('sku')} placeholder="FB-001"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Category</label>
              <select className={INPUT} value={form.category} onChange={set('category')}>
                <option value="FB">F&B (Food & Beverage)</option>
                <option value="HOTEL">Hotel Inventory</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Sub-Category</label>
              <select className={INPUT} value={form.subCategory} onChange={set('subCategory')}>
                <option value="">Select...</option>
                {subcats.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Unit of Measure</label>
              <select className={INPUT} value={form.unit} onChange={set('unit')}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Minimum Stock</label>
              <input className={INPUT} type="number" value={form.minimumStock} onChange={set('minimumStock')} placeholder="Alert threshold"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Maximum Stock</label>
              <input className={INPUT} type="number" value={form.maximumStock} onChange={set('maximumStock')} placeholder="Max to keep"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Unit Cost (TZS)</label>
              <input className={INPUT} type="number" value={form.unitCost} onChange={set('unitCost')} placeholder="Cost price"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">
                Selling Price (TZS) <span className="text-gray-400 font-normal">— POS only</span>
              </label>
              <input className={INPUT} type="number" value={form.sellingPrice} onChange={set('sellingPrice')} placeholder="For F&B items" disabled={form.category==='HOTEL'} style={{opacity:form.category==='HOTEL'?0.4:1}}/>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div onClick={() => setForm(f=>({...f, isSellable:!f.isSellable}))}
                  className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0',
                    form.isSellable ? 'bg-[#2563EB]' : 'bg-gray-200')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    form.isSellable ? 'translate-x-5' : 'translate-x-0.5')}/>
                </div>
                <span className="text-[12.5px] font-medium text-gray-700">Show in POS (can be charged to guest room)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={onClose} className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors">
              {isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StoreItemsPage() {
  // TODO: const { data: items = [], isLoading } = useStoreItems(filters)
  const items = MOCK_ITEMS
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [stockModal, setStockModal] = useState<StoreItem | null>(null)
  const [itemModal, setItemModal] = useState<StoreItem | 'new' | null>(null)

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'All' || item.category === catFilter
    const matchStatus = statusFilter === 'All' || item.stockStatus === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const counts = {
    total: items.length,
    low: items.filter(i => i.stockStatus === 'low_stock').length,
    out: items.filter(i => i.stockStatus === 'out_of_stock').length,
    fb: items.filter(i => i.category === 'FB').length,
    hotel: items.filter(i => i.category === 'HOTEL').length,
  }

  return (
    <div className="space-y-4">

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label:`All (${counts.total})`,        filter:'All',       cat:true  },
          { label:`F&B (${counts.fb})`,            filter:'FB',        cat:true  },
          { label:`Hotel (${counts.hotel})`,       filter:'HOTEL',     cat:true  },
        ].map(chip => (
          <button key={chip.filter} onClick={() => setCatFilter(chip.filter)}
            className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
              catFilter === chip.filter ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
            {chip.label}
          </button>
        ))}
        <div className="h-5 w-px bg-gray-200 mx-1"/>
        {[
          { label:`Low Stock (${counts.low})`, filter:'low_stock' },
          { label:`Out of Stock (${counts.out})`, filter:'out_of_stock' },
        ].map(chip => (
          <button key={chip.filter} onClick={() => setStatusFilter(statusFilter === chip.filter ? 'All' : chip.filter)}
            className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
              statusFilter === chip.filter ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
            {chip.label}
          </button>
        ))}
        <button onClick={() => setItemModal('new')}
          className="ml-auto flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors">
          <Plus size={13}/> Add Item
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-[280px]">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
              className="text-[12px] outline-none text-gray-700 placeholder:text-gray-400 bg-transparent flex-1"/>
          </div>
          <span className="text-[12px] text-gray-400 ml-auto">{filtered.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['Item / SKU','Category','Unit','In Stock','Min / Max','Cost Price','Selling','Status',''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10.5px] text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const sc = STOCK_STATUS_CONFIG[item.stockStatus]
                const pct = Math.min(100, Math.round((item.currentStock / item.maximumStock) * 100))
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.category === 'FB' ? 'bg-blue-50' : 'bg-purple-50')}>
                          <Package size={14} className={item.category === 'FB' ? 'text-[#2563EB]' : 'text-purple-600'}/>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">{item.name}</p>
                          {item.sku && <p className="text-[10px] text-gray-400">{item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                        item.category === 'FB' ? 'bg-blue-50 text-[#2563EB]' : 'bg-purple-50 text-purple-600')}>
                        {item.category === 'FB' ? 'F&B' : 'Hotel'}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.subCategory}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600">{item.unit}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-[14px] font-bold text-gray-900">{item.currentStock}</span>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className={cn('h-full rounded-full',
                            pct < 30 ? 'bg-red-400' : pct < 60 ? 'bg-amber-400' : 'bg-green-400')}
                            style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-500">
                      {item.minimumStock} / {item.maximumStock}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-medium text-gray-700">{formatTZS(item.unitCost)}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-500">
                      {item.sellingPrice ? formatTZS(item.sellingPrice) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border', sc.bg, sc.text, sc.border)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setStockModal(item)}
                          className="h-7 px-2.5 text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors whitespace-nowrap">
                          Update
                        </button>
                        <button onClick={() => setItemModal(item)}
                          className="h-7 px-2.5 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {stockModal && <StockModal item={stockModal} onClose={() => setStockModal(null)}/>}
      {itemModal && <ItemFormModal item={itemModal === 'new' ? undefined : itemModal} onClose={() => setItemModal(null)}/>}
    </div>
  )
}
