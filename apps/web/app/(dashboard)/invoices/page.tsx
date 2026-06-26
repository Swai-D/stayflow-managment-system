'use client'

import { useState } from 'react'
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices'
import { formatDate, formatTZS } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Search, ChevronLeft, ChevronRight, FileText, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { InvoiceType } from '@/types/invoice'

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-50 text-blue-700',
  paid:     'bg-green-50 text-green-700',
  cancelled:'bg-red-50 text-red-700'
}

const TABS: { id: InvoiceType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Invoices' },
  { id: 'individual', label: 'Individual' },
  { id: 'company', label: 'Company' }
]

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<InvoiceType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useInvoices({
    type: activeTab === 'all' ? undefined : activeTab,
    search: search || undefined,
    page,
    limit: 15
  })

  const { mutate: deleteInvoice } = useDeleteInvoice()

  const invoices = data?.data || []
  const meta = data?.meta || { total: 0, totalPages: 1 }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return
    deleteInvoice(id, {
      onSuccess: () => toast.success('Invoice imefutwa'),
      onError: () => toast.error('Imeshindwa kufuta invoice')
    })
  }

  return (
    <div className="space-y-4 font-sans text-left">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Invoices</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Individual and company invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1) }}
            className={cn(
              'px-[14px] py-[7px] rounded-xl text-[12px] font-medium flex items-center gap-2 border border-transparent transition-all',
              activeTab === tab.id
                ? 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]'
                : 'text-[#9ca3af] hover:bg-subtle'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4 border border-border/20">
        <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 min-w-[240px] focus-within:border-[#2563eb]/50 transition-all">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search invoice number, guest or company..."
            className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-border/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                {['Invoice #', 'Type', 'Bill To', 'Total', 'Paid', 'Balance', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-medium text-[#9ca3af] uppercase tracking-[0.12em] p-[10px_16px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={9} className="p-4"><div className="h-4 bg-subtle animate-pulse rounded" /></td></tr>
                  ))
                : invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-subtle/40 transition-all group">
                      <td className="p-[14px_16px] text-[12px] text-[#9ca3af] font-mono font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="p-[14px_16px]">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          invoice.type === 'company' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {invoice.type}
                        </span>
                      </td>
                      <td className="p-[14px_16px] text-[13px] font-bold text-[#111827]">
                        {invoice.type === 'company'
                          ? invoice.company?.name
                          : invoice.booking?.guest?.fullName
                        }
                      </td>
                      <td className="p-[14px_16px] text-[13px] font-bold text-[#111827]">
                        {formatTZS(invoice.totalAmount)}
                      </td>
                      <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium">
                        {formatTZS(invoice.paidAmount)}
                      </td>
                      <td className="p-[14px_16px] text-[12px] font-bold text-[#111827]">
                        {formatTZS(invoice.totalAmount - invoice.paidAmount)}
                      </td>
                      <td className="p-[14px_16px]">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider',
                          STATUS_STYLES[invoice.status] || 'bg-gray-100 text-gray-600'
                        )}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-[14px_16px] text-[12px] text-[#6b7280] font-medium whitespace-nowrap">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="p-[14px_16px]">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                            title="Cancel Invoice"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && invoices.length === 0 && (
                <tr><td colSpan={9} className="py-20 text-center text-[#9ca3af] text-[11px] font-medium uppercase tracking-widest italic">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider">
            Showing {invoices.length} of {meta.total} results
          </p>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#2563eb] disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[12px] text-[#6b7280] font-bold">
              {page} <span className="text-border mx-1">/</span> {meta.totalPages || 1}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-[#9ca3af] hover:bg-white hover:text-[#2563eb] disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
