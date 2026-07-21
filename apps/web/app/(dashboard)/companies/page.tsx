'use client'

import { useState } from 'react'
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/useCompanies'
import { Company, CompanyFormData } from '@/types/company'
import { Search, Plus, Building2, Phone, Mail, MapPin, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import ConfirmModal from '@/components/shared/ConfirmModal'

const emptyForm: CompanyFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  tinNumber: '',
  contactPerson: '',
  notes: ''
}

export default function CompaniesPage() {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<CompanyFormData>(emptyForm)

  const { data: companies = [], isLoading } = useCompanies(search)
  const { mutate: createCompany, isPending: creating } = useCreateCompany()
  const { mutate: updateCompany, isPending: updating } = useUpdateCompany()
  const { mutate: deleteCompany, isPending: isDeleting } = useDeleteCompany()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null)

  const openCreate = () => {
    setEditingCompany(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditingCompany(company)
    setForm({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      tinNumber: company.tinNumber || '',
      contactPerson: company.contactPerson || '',
      notes: company.notes || ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCompany(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Jina la kampuni linahitajika')
      return
    }

    const payload = {
      ...form,
      email: form.email || undefined
    }

    if (editingCompany) {
      updateCompany({ id: editingCompany.id, data: payload }, {
        onSuccess: () => {
          toast.success('Kampuni imesasishwa')
          closeModal()
        },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
          toast.error(message || 'Imeshindwa kusasisha')
        }
      })
    } else {
      createCompany(payload, {
        onSuccess: () => {
          toast.success('Kampuni imesajiliwa')
          closeModal()
        },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
          toast.error(message || 'Imeshindwa kusajili')
        }
      })
    }
  }

  const askDelete = (id: string) => {
    setCompanyToDelete(id)
    setConfirmOpen(true)
  }

  const handleDelete = () => {
    if (!companyToDelete) return
    deleteCompany(companyToDelete, {
      onSuccess: () => {
        toast.success('Company deleted successfully')
        setConfirmOpen(false)
        setCompanyToDelete(null)
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(message || 'Failed to delete company')
      }
    })
  }

  return (
    <div className="space-y-4 font-sans text-left">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">🏢 Companies</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Manage companies and their bookings</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
        >
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-card p-4 border border-border/20">
        <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 min-w-[240px] focus-within:border-[#8b4530]/50 transition-all">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card p-5 h-40 animate-pulse" />
            ))
          : companies.map((company: Company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-card p-5 border border-border/20 hover:border-blue-200 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <Link href={`/companies/${company.id}`}>
                        <h3 className="text-[15px] font-bold text-[#111827] group-hover:text-[#8b4530] transition-colors">{company.name}</h3>
                      </Link>
                      {company.contactPerson && (
                        <p className="text-[11px] text-[#9ca3af]">Contact: {company.contactPerson}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(company)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => askDelete(company.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 mt-4">
                  {company.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                      <Phone size={12} /> {company.phone}
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                      <Mail size={12} /> {company.email}
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                      <MapPin size={12} /> {company.address}
                    </div>
                  )}
                  {company.tinNumber && (
                    <div className="text-[12px] text-[#9ca3af]">TIN: {company.tinNumber}</div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/30">
                  <Link href={`/companies/${company.id}`}>
                    <span className="text-[12px] font-bold text-[#8b4530] hover:underline">View details & bookings →</span>
                  </Link>
                </div>
              </div>
            ))}
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Company"
        description="Are you sure you want to delete this company? This will remove the company record and cannot be undone."
        confirmText="Delete Company"
        cancelText="Keep Company"
        variant="danger"
        isPending={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setCompanyToDelete(null)
        }}
      />

      {!isLoading && companies.length === 0 && (
        <div className="text-center py-20 text-[#9ca3af] text-[13px] font-medium">
          No companies found. Click &ldquo;Add Company&rdquo; to register one.
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h2 className="text-lg font-bold text-[#111827] mb-4">
              {editingCompany ? 'Edit Company' : 'Add New Company'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Company Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  placeholder="e.g. ABC Limited"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="+255..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="company@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  placeholder="Physical address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">TIN Number</label>
                  <input
                    value={form.tinNumber}
                    onChange={e => setForm({ ...form, tinNumber: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Tax ID"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Contact Person</label>
                  <input
                    value={form.contactPerson}
                    onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Name"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-200 text-[#6b7280] rounded-xl text-[13px] font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating || updating ? 'Saving...' : (editingCompany ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
