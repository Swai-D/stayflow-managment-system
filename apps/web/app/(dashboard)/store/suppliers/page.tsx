'use client'

import { useState, useEffect } from 'react'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '@/hooks/useStore'
import { formatTZS, formatDateShort } from '@/lib/formatters'
import { type Supplier } from '@/types/store'
import { Search, Plus, X, Phone, Mail, MapPin, Package, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'

const INPUT = "w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8B4530] focus:ring-2 focus:ring-blue-100 transition-all bg-white"

// ── Supplier Form Modal ──────────────────────────────────────────────────────
function SupplierFormModal({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const isEdit = !!supplier
  const [form, setForm] = useState({
    name:         supplier?.name ?? '',
    phone:        supplier?.phone ?? '',
    email:        supplier?.email ?? '',
    address:      supplier?.address ?? '',
    paymentTerms: supplier?.paymentTerms ?? '',
    notes:        supplier?.notes ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      paymentTerms: form.paymentTerms || null,
      notes: form.notes || null
    }
    if (isEdit && supplier) {
      updateSupplier.mutate({ id: supplier.id, data: payload }, { onSuccess: onClose })
    } else {
      createSupplier.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X size={13}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Supplier Name</label>
              <input className={INPUT} value={form.name} onChange={set('name')} placeholder="e.g. Morogoro General Supplies"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Phone Number</label>
              <input className={INPUT} type="tel" value={form.phone} onChange={set('phone')} placeholder="+255 712 000 000"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={INPUT} type="email" value={form.email} onChange={set('email')} placeholder="supplier@email.com"/>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Address <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={INPUT} value={form.address} onChange={set('address')} placeholder="Street, area, town"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold text-gray-700">Payment Terms</label>
              <select className={INPUT} value={form.paymentTerms} onChange={set('paymentTerms')}>
                <option value="">Select terms...</option>
                <option>Cash on delivery</option>
                <option>7 days net</option>
                <option>14 days net</option>
                <option>30 days net</option>
                <option>60 days net</option>
                <option>Prepayment required</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className={cn(INPUT, 'resize-none h-16')} value={form.notes} onChange={set('notes')}
              placeholder="Min order quantities, delivery schedule, special instructions..."/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={!form.name || !form.phone || createSupplier.isPending || updateSupplier.isPending}
              className="flex-1 h-10 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40">
              {createSupplier.isPending || updateSupplier.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Supplier')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Supplier Detail Panel ────────────────────────────────────────────────────
function SupplierPanel({ supplier, onClose, onEdit }: {
  supplier: Supplier
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-[14px] font-bold text-gray-900">Supplier Details</h3>
        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
            <Edit2 size={11}/> Edit
          </button>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X size={13}/>
          </button>
        </div>
      </div>
      <div className="p-5">
        {/* Name + badge */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#FBF1EA] flex items-center justify-center flex-shrink-0">
            <span className="text-[#8B4530] font-bold text-[15px]">
              {supplier.name.split(' ').slice(0,2).map(w => w[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">{supplier.name}</p>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block',
              supplier.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')}>
              {supplier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
            <Phone size={13} className="text-gray-400 flex-shrink-0"/>
            {supplier.phone}
          </div>
          {supplier.email && (
            <div className="flex items-center gap-2.5 text-[13px] text-gray-700">
              <Mail size={13} className="text-gray-400 flex-shrink-0"/>
              {supplier.email}
            </div>
          )}
          {supplier.address && (
            <div className="flex items-start gap-2.5 text-[13px] text-gray-700">
              <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5"/>
              {supplier.address}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label:'Items',       value: supplier.itemCount  ?? 0 },
            { label:'Orders',      value: supplier.totalOrders ?? 0 },
            { label:'Total Spent', value: supplier.totalValue ? formatTZS(supplier.totalValue) : 'TZS 0' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[16px] font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Payment terms */}
        <div className="bg-blue-50 rounded-xl px-3.5 py-3 mb-4">
          <p className="text-[10px] font-semibold text-[#8B4530] mb-0.5">Payment Terms</p>
          <p className="text-[13px] font-semibold text-gray-900">{supplier.paymentTerms ?? 'Not specified'}</p>
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div className="bg-amber-50 rounded-xl px-3.5 py-3 mb-4">
            <p className="text-[10px] font-semibold text-amber-600 mb-0.5">Notes</p>
            <p className="text-[12px] text-amber-800 leading-relaxed">{supplier.notes}</p>
          </div>
        )}

        {/* Last order */}
        {supplier.lastOrder && (
          <p className="text-[11px] text-gray-400">
            Last order: {formatDateShort(supplier.lastOrder)}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [formModal, setFormModal] = useState<Supplier | 'new' | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  useEffect(() => {
    setPage(1)
  }, [search])

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

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) || s.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / limit)
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const totalSpend = suppliers.reduce((s, x) => s + (x.totalValue ?? 0), 0)
  const activeCount = suppliers.filter(s => s.isActive).length

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Suppliers', value: suppliers.length, color:'text-gray-900' },
          { label:'Active',          value: activeCount,       color:'text-green-600' },
          { label:'Total Spent',     value: formatTZS(totalSpend), color:'text-[#8B4530]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="text-[11px] text-gray-400 font-medium mb-1">{s.label}</p>
            <p className={cn('text-[22px] font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Content: list + detail panel */}
      <div className={cn('grid gap-4', selected ? 'grid-cols-[1fr_360px]' : 'grid-cols-1')}>

        {/* Suppliers list */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-[280px]">
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
                className="text-[12px] outline-none text-gray-700 placeholder:text-gray-400 bg-transparent flex-1"/>
            </div>
            <button onClick={() => setFormModal('new')}
              className="ml-auto flex items-center gap-1.5 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors">
              <Plus size={13}/> Add Supplier
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-gray-400">No suppliers found</div>
            ) : paginated.map(supplier => (
              <div key={supplier.id}
                onClick={() => setSelected(selected?.id === supplier.id ? null : supplier)}
                className={cn(
                  'px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer',
                  selected?.id === supplier.id && 'bg-[#FBF1EA]'
                )}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FBF1EA] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#8B4530] font-bold text-[12px]">
                      {supplier.name.split(' ').slice(0,2).map(w => w[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{supplier.name}</p>
                      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                        supplier.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Phone size={10}/> {supplier.phone}
                      </span>
                      {supplier.paymentTerms && (
                        <span className="text-[11px] text-gray-400">{supplier.paymentTerms}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[12px] font-semibold text-gray-900">{formatTZS(supplier.totalValue ?? 0)}</p>
                      <p className="text-[10px] text-gray-400">{supplier.totalOrders ?? 0} orders</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Package size={11} className="text-gray-400"/>
                        {supplier.itemCount ?? 0} items
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={paginated.length} total={filtered.length} />
        </div>

        {/* Detail panel */}
        {selected && (
          <SupplierPanel
            supplier={selected}
            onClose={() => setSelected(null)}
            onEdit={() => { setFormModal(selected); setSelected(null) }}
          />
        )}
      </div>

      {formModal && (
        <SupplierFormModal
          supplier={formModal === 'new' ? undefined : formModal}
          onClose={() => setFormModal(null)}
        />
      )}
    </div>
  )
}
