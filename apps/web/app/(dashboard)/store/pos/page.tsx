'use client'

import { useState, useMemo } from 'react'
import { usePOSItems, useActiveBookings, usePostCharge, useGuestFolio, useSendInvoiceEmail } from '@/hooks/usePOS'
import { formatTZS } from '@/lib/formatters'
import api from '@/lib/api'
import { type StoreItem, type RoomCharge } from '@/types/store'
import { type Booking } from '@/types/booking'
import {
  Search, Plus, Minus, X, ChevronDown, CheckCircle,
  Receipt, Users, Trash2, ShoppingBag, UtensilsCrossed, Loader2,
  Mail, Printer, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

// ── Cart Item type ────────────────────────────────────────────────────────────
interface CartItem { item: StoreItem; qty: number }

// ── Room selector ─────────────────────────────────────────────────────────────
function RoomSelector({ value, onChange, bookings, isLoading }: {
  value: Booking | null
  onChange: (b: Booking) => void
  bookings: Booking[]
  isLoading: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-3 border-2 rounded-xl px-4 py-3.5 transition-all text-left',
          value ? 'border-[#8B4530] bg-[#FBF1EA]' : 'border-gray-200 bg-white hover:border-gray-300'
        )}>
        {value ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-[#8B4530]">Room {value.room.roomNumber}</span>
              <span className="text-[11px] text-[#8B4530] bg-white px-2 py-0.5 rounded-full font-medium border border-blue-200">
                {value.room.type}
              </span>
              {value.company ? (
                <span className="text-[10px] text-white bg-[#8B4530] px-2 py-0.5 rounded-full font-medium">
                  Company
                </span>
              ) : (
                <span className="text-[10px] text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  Individual
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-600 mt-0.5 font-medium">{value.guest.fullName}</p>
            {value.company && (
              <p className="text-[11px] text-[#8B4530] font-medium">{value.company.name}</p>
            )}
            <p className="text-[10px] text-gray-400">Ref: {value.bookingRef}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={16}/>
            <span className="text-[14px]">Select guest room...</span>
          </div>
        )}
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-gray-400 flex-shrink-0"/>
        ) : (
          <ChevronDown size={16} className={cn('flex-shrink-0 transition-transform', open && 'rotate-180', value ? 'text-[#8B4530]' : 'text-gray-400')}/>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Checked-in guests</p>
          </div>
          {bookings.length === 0 ? (
            <div className="px-4 py-4 text-[13px] text-gray-400 text-center">No checked-in guests</div>
          ) : bookings.map(b => (
            <button key={b.id} onClick={() => { onChange(b); setOpen(false) }}
              className={cn('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FBF1EA] transition-colors',
                value?.id === b.id && 'bg-[#FBF1EA]')}>
              <div className="w-9 h-9 rounded-xl bg-[#FBF1EA] flex items-center justify-center flex-shrink-0">
                <span className="text-[#8B4530] font-bold text-[12px]">
                  {b.room.roomNumber}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{b.guest.fullName}</p>
                {b.company ? (
                  <p className="text-[10px] text-[#8B4530] font-medium">{b.company.name}</p>
                ) : null}
                <p className="text-[10px] text-gray-400">
                  Room {b.room.roomNumber} · {b.room.type} · {b.bookingType === 'company' ? 'Company' : 'Individual'} · {b.bookingRef}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] font-semibold text-gray-700">{formatTZS(b.balanceDue)}</p>
                <p className="text-[10px] text-gray-400">room charge</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Item grid card ────────────────────────────────────────────────────────────
function ItemCard({ item, qty, onAdd, onRemove }: {
  item: StoreItem; qty: number; onAdd: () => void; onRemove: () => void
}) {
  const CATEGORY_ICONS: Record<string, string> = {
    'Bar Stock': '🍺', 'Beverages': '🥤', 'Food': '🍽️', 'Dry Foods': '🥫',
    'Fresh Produce': '🥬', 'Condiments': '🧂', 'Linen & Towels': '🛏️',
    'Bathroom Amenities': '🧴', 'Cleaning Supplies': '🧽', 'Kitchen Equipment': '🔪',
    'Stationery': '📎'
  }
  const icon = CATEGORY_ICONS[item.subCategory] ?? '📦'

  return (
    <div className={cn(
      'bg-white border-2 rounded-xl p-3.5 cursor-pointer transition-all select-none',
      qty > 0 ? 'border-[#8B4530] shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
      (!item.sellingPrice || item.currentStock <= 0) && 'opacity-50 cursor-not-allowed'
    )} onClick={() => {
      if (item.sellingPrice && item.currentStock > 0) onAdd()
    }}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="text-[22px]">{icon}</span>
        {qty > 0 && (
          <div className="flex items-center gap-1 bg-[#8B4530] rounded-lg px-1.5 py-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={e => { e.stopPropagation(); onRemove() }}
              className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors">
              <Minus size={11}/>
            </button>
            <span className="text-white font-bold text-[13px] min-w-[16px] text-center">{qty}</span>
            <button onClick={e => { e.stopPropagation(); onAdd() }}
              className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors">
              <Plus size={11}/>
            </button>
          </div>
        )}
      </div>
      <p className="text-[12.5px] font-semibold text-gray-900 leading-tight mb-1">{item.name}</p>
      <p className="text-[13px] font-bold text-[#8B4530]">
        {item.sellingPrice ? formatTZS(item.sellingPrice) : <span className="text-gray-400 font-medium">No price</span>}
      </p>
      {item.currentStock === 0 ? (
        <p className="text-[10px] text-red-500 mt-0.5 font-medium">Out of stock</p>
      ) : item.currentStock < 10 ? (
        <p className="text-[10px] text-amber-600 mt-0.5 font-medium">Only {item.currentStock} left</p>
      ) : null}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ booking, cart, total, onConfirm, onCancel, isPending }: {
  booking: Booking
  cart: CartItem[]
  total: number
  onConfirm: (notes: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900">Post to Room</h2>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
            <X size={13}/>
          </button>
        </div>
        <div className="p-6">
          {/* Room info */}
          <div className="bg-[#FBF1EA] rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B4530] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[13px]">{booking.room.roomNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900">{booking.guest.fullName}</p>
              {booking.company ? (
                <p className="text-[11px] text-[#8B4530] font-medium truncate">{booking.company.name}</p>
              ) : null}
              <p className="text-[11px] text-[#8B4530] font-medium">Room {booking.room.roomNumber} · {booking.room.type}</p>
            </div>
            <span className={cn(
              'text-[10px] font-bold px-2 py-1 rounded-full',
              booking.company ? 'bg-[#8B4530] text-white' : 'bg-white text-[#6B7280] border border-gray-200'
            )}>
              {booking.company ? 'Company' : 'Individual'}
            </span>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4">
            {cart.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center justify-between text-[13px]">
                <span className="text-gray-700">{item.name} <span className="text-gray-400">× {qty}</span></span>
                <span className="font-semibold text-gray-900">{formatTZS(item.sellingPrice! * qty)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100 border-b border-gray-100 mb-4">
            <span className="text-[14px] font-bold text-gray-900">Total to Post</span>
            <span className="text-[20px] font-bold text-[#8B4530]">{formatTZS(total)}</span>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="text-[11.5px] font-semibold text-gray-700 block mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full h-10 px-3 rounded-[8px] border border-gray-200 text-[13px] focus:outline-none focus:border-[#8B4530] focus:ring-2 focus:ring-blue-100 transition-all"
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Dinner — 09 June"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 h-10 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => onConfirm(notes)} disabled={isPending}
              className="flex-1 h-10 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40">
              {isPending ? (
                <><Loader2 size={14} className="animate-spin"/> Posting...</>
              ) : (
                <><CheckCircle size={14}/> Post to Room {booking.room.roomNumber}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ booking, total, onReset, onSendFolio, onPrintFolio, sendingFolio }: {
  booking: Booking; total: number; onReset: () => void
  onSendFolio: () => void
  onPrintFolio: () => void
  sendingFolio: boolean
}) {
  // Folio is emailed to the primary guest (or company contact) – this is a running
  // statement, NOT a final invoice. The official invoice is created at checkout/payment.
  const recipientName = booking.company?.name || booking.guest.fullName
  const canEmail = !!(booking.company?.email || booking.guest.email)

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle size={40} className="text-green-500"/>
      </div>
      <h2 className="text-[20px] font-bold text-gray-900 mb-2">Charge Posted!</h2>
      <p className="text-[14px] text-gray-500 mb-1">
        <span className="font-semibold text-[#8B4530]">{formatTZS(total)}</span> added to Room {booking.room.roomNumber}
      </p>
      <p className="text-[13px] text-gray-900 font-medium mb-1">{booking.guest.fullName}</p>
      {booking.company && (
        <p className="text-[12px] text-[#8B4530] font-medium mb-1">{booking.company.name}</p>
      )}
      <p className="text-[13px] text-gray-400 mb-6">{recipientName} · {booking.bookingRef}</p>

      <div className="flex flex-col gap-2 w-full max-w-[280px] mb-4">
        <button onClick={onSendFolio} disabled={sendingFolio || !canEmail}
          className="w-full py-2.5 bg-[#8B4530] hover:bg-[#6E3323] disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
          {sendingFolio ? (
            <><Loader2 size={15} className="animate-spin"/> Sending...</>
          ) : (
            <><Mail size={15}/> Email Folio Summary</>
          )}
        </button>
        <button onClick={onPrintFolio}
          className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
          <Printer size={15}/> Print Folio Summary
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mb-4 px-4">
        This is a running folio. The official invoice will be generated at checkout or when payment is confirmed.
      </p>

      <button onClick={onReset}
        className="text-[13px] font-semibold text-gray-500 hover:text-[#8B4530] transition-colors">
        New Charge
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const { data: posItems = [], isLoading: itemsLoading } = usePOSItems()
  const { data: bookings = [], isLoading: bookingsLoading } = useActiveBookings()
  const { mutate: postCharge, isPending: posting } = usePostCharge()
  const { mutate: sendFolio, isPending: sendingFolio } = useSendInvoiceEmail()

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const { data: folio } = useGuestFolio(selectedBooking?.id ?? '')

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFolio, setShowFolio] = useState(false)

  const subCats = useMemo(() =>
    ['All', ...Array.from(new Set(posItems.map(i => i.subCategory)))],
    [posItems]
  )

  const filtered = useMemo(() => posItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'All' || item.subCategory === catFilter
    return matchSearch && matchCat
  }), [posItems, search, catFilter])

  const total = cart.reduce((s, c) => s + (c.item.sellingPrice! * c.qty), 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const addToCart = (item: StoreItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item, qty: 1 }]
    })
  }

  const removeFromCart = (item: StoreItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (!existing) return prev
      if (existing.qty === 1) return prev.filter(c => c.item.id !== item.id)
      return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const getQty = (itemId: string) => cart.find(c => c.item.id === itemId)?.qty ?? 0

  const handleConfirm = (notes: string) => {
    if (!selectedBooking || cart.length === 0) return
    postCharge({
      bookingId: selectedBooking.id,
      items: cart.map(({ item, qty }) => ({ itemId: item.id, quantity: qty })),
      notes: notes || undefined
    }, {
      onSuccess: () => {
        setShowConfirm(false)
        setShowSuccess(true)
      }
    })
  }

  const handleReset = () => {
    setCart([])
    setShowSuccess(false)
    setSelectedBooking(null)
  }

  const handleSendFolio = () => {
    if (!selectedBooking) return
    const email = selectedBooking.company?.email || selectedBooking.guest.email
    if (!email) {
      toast.error('Mgeni au kampuni hana email address')
      return
    }
    sendFolio(selectedBooking.id, {
      onSuccess: (data) => {
        toast.success(data?.message || 'Folio imetumwa kwa email')
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        toast.error(message || 'Imeshindwa kutuma folio')
      }
    })
  }

  const handlePrintFolio = async () => {
    if (!selectedBooking) return
    try {
      const res = await api.get(`/pos/invoice/${selectedBooking.id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      toast.error(message || 'Imeshindwa kupata folio')
    }
  }

  // Open folio charges for selected booking
  const folioCharges: RoomCharge[] = folio?.roomCharges ?? []
  const folioTotal = folioCharges.reduce((s, c) => s + c.totalAmount, 0)

  if (itemsLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-132px)]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={32} className="animate-spin"/>
          <p className="text-[13px]">Loading POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[1fr_360px] gap-5 h-[calc(100vh-132px)]">

      {/* ── LEFT: Item selection ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 min-h-0">

        {/* Room selector */}
        <RoomSelector
          value={selectedBooking}
          onChange={setSelectedBooking}
          bookings={bookings}
          isLoading={bookingsLoading}
        />

        {/* Search + category filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
              className="text-[12px] outline-none text-gray-700 placeholder:text-gray-400 bg-transparent flex-1"/>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {subCats.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={cn('h-8 px-3 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                  catFilter === cat ? 'bg-[#8B4530] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto">
          {itemsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={28} className="animate-spin text-gray-300"/>
            </div>
          ) : posItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Package size={28} className="text-gray-300"/>
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">No sellable items</h3>
              <p className="text-[12px] text-gray-500 max-w-[280px] mb-4">
                Items here are pulled from Store. Go to Store → Items, add an F&B item, and enable &ldquo;Show in POS&rdquo;.
              </p>
              <Link href="/store/items">
                <button className="px-4 py-2 bg-[#8B4530] text-white rounded-xl text-[12px] font-bold hover:bg-[#6E3323] transition-colors">
                  Go to Store Items
                </button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-[13px] font-semibold text-gray-400">No items match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={getQty(item.id)}
                  onAdd={() => addToCart(item)}
                  onRemove={() => removeFromCart(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart / Order summary ───────────────────────────────────── */}
      <div className="flex flex-col bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">

        {/* Cart header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={15} className="text-[#8B4530]"/>
            <h2 className="text-[14px] font-bold text-gray-900">Current Order</h2>
            {cartCount > 0 && (
              <span className="bg-[#8B4530] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-semibold">
              <Trash2 size={11}/> Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <UtensilsCrossed size={24} className="text-gray-300"/>
              </div>
              <p className="text-[13px] font-semibold text-gray-400">No items added yet</p>
              <p className="text-[11px] text-gray-300 mt-1">Click items on the left to add them</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cart.map(({ item, qty }) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">{formatTZS(item.sellingPrice!)} each</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => removeFromCart(item)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <Minus size={11} className="text-gray-600"/>
                    </button>
                    <span className="text-[14px] font-bold text-gray-900 min-w-[20px] text-center">{qty}</span>
                    <button onClick={() => addToCart(item)}
                      className="w-7 h-7 rounded-lg bg-[#FBF1EA] hover:bg-[#F5DFCE] flex items-center justify-center transition-colors">
                      <Plus size={11} className="text-[#8B4530]"/>
                    </button>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[80px]">
                    <p className="text-[13px] font-bold text-gray-900">{formatTZS(item.sellingPrice! * qty)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Folio preview (existing charges) */}
        {selectedBooking && folioCharges.length > 0 && (
          <div className="border-t border-gray-100">
            <button onClick={() => setShowFolio(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-[12px] font-semibold text-gray-600 flex items-center gap-1.5">
                <Receipt size={13}/> Existing folio charges
              </span>
              <span className="text-[12px] font-bold text-[#8B4530]">{formatTZS(folioTotal)}</span>
            </button>
            {showFolio && (
              <div className="px-5 pb-3 space-y-1.5">
                {folioCharges.map(charge => (
                  <div key={charge.id}>
                    {charge.items.map(ci => (
                      <div key={ci.id} className="flex items-center justify-between text-[12px] text-gray-500 py-0.5">
                        <span>{ci.itemName} × {ci.quantity}</span>
                        <span>{formatTZS(ci.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total + action */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {cart.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-700">Order Total</span>
              <span className="text-[20px] font-bold text-gray-900">{formatTZS(total)}</span>
            </div>
          )}
          <button
            disabled={cart.length === 0 || !selectedBooking || posting}
            onClick={() => setShowConfirm(true)}
            className={cn(
              'w-full h-12 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2',
              cart.length > 0 && selectedBooking && !posting
                ? 'bg-[#8B4530] hover:bg-[#6E3323] text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}>
            {!selectedBooking ? 'Select a room first' :
              cart.length === 0 ? 'Add items to order' :
              posting ? (
                <><Loader2 size={16} className="animate-spin"/> Posting...</>
              ) : (
                <>Post to Room {selectedBooking.room.roomNumber} →</>
              )}
          </button>
          {!selectedBooking && cart.length > 0 && (
            <p className="text-[11px] text-amber-600 text-center font-medium">
              ⚠ Please select a guest room above
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showConfirm && selectedBooking && (
        <ConfirmModal
          booking={selectedBooking}
          cart={cart}
          total={total}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          isPending={posting}
        />
      )}

      {showSuccess && selectedBooking && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-8">
            <SuccessScreen
              booking={selectedBooking}
              total={total}
              onReset={handleReset}
              onSendFolio={handleSendFolio}
              onPrintFolio={handlePrintFolio}
              sendingFolio={sendingFolio}
            />
          </div>
        </div>
      )}
    </div>
  )
}
