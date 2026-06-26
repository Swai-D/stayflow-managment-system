'use client'

import { useParams, useRouter } from 'next/navigation'
import { useGenerateCompanyInvoice, useRecordInvoicePayment, downloadInvoicePdf, getInvoicePdfBlobUrl } from '@/hooks/useInvoices'
import { CompanyInvoice } from '@/types/company'
import { useCompany as useCompanyDetails } from '@/hooks/useCompanies'
import { formatDate, formatTZS } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, FileText,
  CreditCard, CheckCircle, Download, Eye, X
} from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-50 text-blue-700',
  paid:     'bg-green-50 text-green-700',
  cancelled:'bg-red-50 text-red-700'
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: company, isLoading } = useCompanyDetails(id)
  const { mutate: generateInvoice, isPending: generating } = useGenerateCompanyInvoice()
  const { mutate: recordPayment, isPending: paying } = useRecordInvoicePayment()

  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewNumber, setPreviewNumber] = useState<string>('')

  if (isLoading) {
    return <div className="p-10 text-center text-gray-400">Loading company...</div>
  }

  if (!company) {
    return <div className="p-10 text-center text-gray-400">Company not found</div>
  }

  const unpaidBookings = company.bookings?.filter(b => b.status !== 'cancelled') || []
  const totalBookingsValue = unpaidBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)
  const totalPaid = unpaidBookings.reduce((sum, b) => sum + Number(b.paidAmount), 0)
  const totalDue = totalBookingsValue - totalPaid

  const toggleBooking = (bookingId: string) => {
    setSelectedBookings(prev =>
      prev.includes(bookingId) ? prev.filter(x => x !== bookingId) : [...prev, bookingId]
    )
  }

  const handleGenerateInvoice = () => {
    if (selectedBookings.length === 0) {
      toast.error('Chagua booking moja au zaidi')
      return
    }
    generateInvoice({ companyId: id, bookingIds: selectedBookings }, {
      onSuccess: () => {
        toast.success('Invoice ya kampuni imeundwa')
        setSelectedBookings([])
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        toast.error(message || 'Imeshindwa kuunda invoice')
      }
    })
  }

  const handleDownloadInvoice = async (inv: CompanyInvoice) => {
    toast.info(`Preparing download for ${inv.invoiceNumber}...`)
    try {
      await downloadInvoicePdf(inv.id, inv.invoiceNumber)
      toast.success('Invoice download started')
    } catch {
      toast.error('Failed to download invoice PDF')
    }
  }

  const handlePreviewInvoice = async (inv: CompanyInvoice) => {
    toast.info(`Opening preview for ${inv.invoiceNumber}...`)
    try {
      const url = await getInvoicePdfBlobUrl(inv.id)
      setPreviewUrl(url)
      setPreviewNumber(inv.invoiceNumber)
      setPreviewOpen(true)
      toast.success('Invoice preview ready')
    } catch {
      toast.error('Failed to open invoice preview')
    }
  }

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewOpen(false)
  }

  const handleRecordPayment = () => {
    if (!selectedInvoiceId || !paymentAmount) {
      toast.error('Chagua invoice na weka kiasi')
      return
    }
    recordPayment({ id: selectedInvoiceId, amount: Number(paymentAmount) }, {
      onSuccess: () => {
        toast.success('Malipo yamerekodiwa')
        setPaymentAmount('')
        setSelectedInvoiceId(null)
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        toast.error(message || 'Imeshindwa kurekodi malipo')
      }
    })
  }

  return (
    <div className="space-y-4 font-sans text-left">
      <button
        onClick={() => router.push('/companies')}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b7280] hover:text-[#2563eb]"
      >
        <ArrowLeft size={14} /> Back to Companies
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-card p-6 border border-border/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#111827]">{company.name}</h1>
              {company.contactPerson && (
                <p className="text-[13px] text-[#6b7280]">Contact Person: {company.contactPerson}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#9ca3af] uppercase tracking-wider">Total Bookings</p>
            <p className="text-[24px] font-bold text-[#111827]">{company._count?.bookings || company.bookings?.length || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-subtle/50 rounded-xl p-4">
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider">Total Value</p>
            <p className="text-[18px] font-bold text-[#111827]">{formatTZS(totalBookingsValue)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-[10px] text-green-600 uppercase tracking-wider">Paid</p>
            <p className="text-[18px] font-bold text-green-700">{formatTZS(totalPaid)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-[10px] text-amber-600 uppercase tracking-wider">Balance Due</p>
            <p className="text-[18px] font-bold text-amber-700">{formatTZS(totalDue)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-6 text-[12px] text-[#6b7280]">
          {company.phone && <span className="flex items-center gap-1"><Phone size={12} /> {company.phone}</span>}
          {company.email && <span className="flex items-center gap-1"><Mail size={12} /> {company.email}</span>}
          {company.address && <span className="flex items-center gap-1"><MapPin size={12} /> {company.address}</span>}
          {company.tinNumber && <span>TIN: {company.tinNumber}</span>}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
        <h2 className="text-[15px] font-bold text-[#111827] mb-4">Company Invoices</h2>
        {company.invoices && company.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  {['Invoice #', 'Amount', 'Paid', 'Balance', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium text-[#9ca3af] uppercase tracking-[0.12em] p-[10px_16px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle/50">
                {company.invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-subtle/40">
                    <td className="p-[12px_16px] text-[12px] text-[#9ca3af] font-mono">{inv.invoiceNumber}</td>
                    <td className="p-[12px_16px] text-[13px] font-bold text-[#111827]">{formatTZS(inv.totalAmount)}</td>
                    <td className="p-[12px_16px] text-[12px] text-[#6b7280]">{formatTZS(inv.paidAmount)}</td>
                    <td className="p-[12px_16px] text-[12px] font-bold text-[#111827]">{formatTZS(inv.totalAmount - inv.paidAmount)}</td>
                    <td className="p-[12px_16px]">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase', STATUS_STYLES[inv.status])}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-[12px_16px] text-[12px] text-[#6b7280]">{formatDate(inv.createdAt)}</td>
                    <td className="p-[12px_16px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoiceId(selectedInvoiceId === inv.id ? null : inv.id)}
                          className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg"
                          title="Record Payment"
                        >
                          <CreditCard size={14} />
                        </button>
                        <button
                          onClick={() => handlePreviewInvoice(inv)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                          title="Preview PDF"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[#9ca3af]">No invoices yet.</p>
        )}

        {selectedInvoiceId && (
          <div className="mt-4 flex items-center gap-3 bg-subtle/50 p-3 rounded-xl">
            <input
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder="Amount (TZS)"
              className="bg-white border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 w-40"
            />
            <button
              onClick={handleRecordPayment}
              disabled={paying}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
            >
              <CheckCircle size={14} /> Record Payment
            </button>
            <button
              onClick={() => { setSelectedInvoiceId(null); setPaymentAmount('') }}
              className="text-[12px] text-[#6b7280] hover:text-[#111827]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 z-[160] flex flex-col bg-white animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-white">
            <div>
              <h3 className="text-base font-bold text-[#111827]">Invoice Preview</h3>
              <p className="text-[12px] text-[#9ca3af] font-medium font-mono">{previewNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewUrl as string
                  link.setAttribute('download', `${previewNumber}.pdf`)
                  link.click()
                  toast.success('Download started')
                }}
                className="flex items-center gap-2 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[12px] font-bold transition-all"
              >
                <Download size={14} />
                Download
              </button>
              <button
                onClick={closePreview}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-[#6b7280] hover:bg-gray-50 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[#f3f4f6]">
            <iframe src={previewUrl} title="Invoice Preview" className="w-full h-full" />
          </div>
        </div>
      )}

      {/* Bookings */}
      <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-[#111827]">Bookings</h2>
          {selectedBookings.length > 0 && (
            <button
              onClick={handleGenerateInvoice}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[12px] font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileText size={14} />
              {generating ? 'Generating...' : `Generate Invoice (${selectedBookings.length})`}
            </button>
          )}
        </div>

        {unpaidBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  {['', 'Ref', 'Guest', 'Room', 'Check In', 'Check Out', 'Total', 'Balance'].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium text-[#9ca3af] uppercase tracking-[0.12em] p-[10px_16px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle/50">
                {unpaidBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-subtle/40">
                    <td className="p-[12px_16px]">
                      <input
                        type="checkbox"
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => toggleBooking(booking.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-[12px_16px] text-[12px] text-[#9ca3af] font-mono">{booking.bookingRef}</td>
                    <td className="p-[12px_16px] text-[13px] font-bold text-[#111827]">{booking.guest.fullName}</td>
                    <td className="p-[12px_16px] text-[12px] text-[#6b7280] capitalize">{booking.room.roomNumber} · {booking.room.type}</td>
                    <td className="p-[12px_16px] text-[12px] text-[#6b7280]">{formatDate(booking.checkIn)}</td>
                    <td className="p-[12px_16px] text-[12px] text-[#6b7280]">{formatDate(booking.checkOut)}</td>
                    <td className="p-[12px_16px] text-[13px] font-bold text-[#111827]">{formatTZS(booking.totalAmount)}</td>
                    <td className="p-[12px_16px] text-[12px] font-bold text-amber-700">{formatTZS(booking.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[#9ca3af]">No bookings yet for this company.</p>
        )}
      </div>
    </div>
  )
}
