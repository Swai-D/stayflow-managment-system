'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useStaff, useCreateStaff, useUpdateStaff, useDeactivateStaff } from '@/hooks/useStaff'
import { useRoles } from '@/hooks/useRoles'
import { formatDate, formatTZS } from '@/lib/formatters'
import { hasPermission } from '@/lib/roles'
import { 
  Plus, Search, Users2, Briefcase, Mail, Phone, Shield, 
  Edit2, Trash2, X, Loader2, Calendar, Wallet, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ConfirmModal from '@/components/shared/ConfirmModal'

const DEPARTMENTS = ['Front Desk', 'Housekeeping', 'Management', 'Restaurant', 'Maintenance', 'Security', 'Other']

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  roleId: '',
  phone: '',
  position: '',
  department: 'Front Desk',
  employmentType: 'full_time',
  startDate: new Date().toISOString().split('T')[0],
  basicSalary: '',
  deductNssf: true,
  deductWcf: true,
  bankName: '',
  bankAccount: '',
}

export default function StaffPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin' || hasPermission(user?.role, 'settings:manage')

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null)

  const { data: staff = [], isLoading } = useStaff()
  const { data: roles = [] } = useRoles()
  const { mutate: createStaff, isPending: creating } = useCreateStaff()
  const { mutate: updateStaff, isPending: updating } = useUpdateStaff()
  const { mutate: deactivateStaff, isPending: deleting } = useDeactivateStaff()

  const defaultRoleId = roles[0]?.id ?? ''

  const openCreate = () => {
    setEditingStaff(null)
    setForm({ ...emptyForm, roleId: defaultRoleId })
    setIsModalOpen(true)
  }

  const openEdit = (member: any) => {
    setEditingStaff(member)
    setForm({
      fullName: member.fullName || '',
      email: member.email || '',
      password: '',
      roleId: member.roleId || member.role?.id || defaultRoleId,
      phone: member.phone || '',
      position: member.staffProfile?.position || '',
      department: member.staffProfile?.department || 'Front Desk',
      employmentType: member.staffProfile?.employmentType || 'full_time',
      startDate: member.staffProfile?.startDate 
        ? new Date(member.staffProfile.startDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      basicSalary: member.staffProfile?.basicSalary ? String(Math.round(Number(member.staffProfile.basicSalary))) : '',
      deductNssf: member.staffProfile?.nssf ?? true,
      deductWcf: member.staffProfile?.wcf ?? true,
      bankName: member.staffProfile?.bankName || '',
      bankAccount: member.staffProfile?.bankAccount || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingStaff(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.position.trim() || !form.basicSalary) {
      toast.error('Jina, nafasi na mshahara wa msingi vinahitajika')
      return
    }

    if (!editingStaff && !form.password) {
      toast.error('Nenosiri linahitajika kwa ajili ya mfanyakazi mpya')
      return
    }

    if (!form.roleId) {
      toast.error('Tafadhali chagua jukumu')
      return
    }

    const payload: any = {
      fullName: form.fullName,
      email: form.email,
      roleId: form.roleId,
      phone: form.phone || undefined,
      position: form.position,
      department: form.department,
      employmentType: form.employmentType,
      startDate: form.startDate,
      basicSalary: Number(form.basicSalary),
      allowances: [],
      deductNssf: form.deductNssf,
      deductWcf: form.deductWcf,
      bankName: form.bankName || undefined,
      bankAccount: form.bankAccount || undefined,
    }
    if (form.password) payload.password = form.password

    if (editingStaff) {
      const updatePayload: any = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        roleId: form.roleId,
        position: form.position,
        department: form.department,
        basicSalary: Number(form.basicSalary),
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
      }
      updateStaff({ id: editingStaff.id, data: updatePayload }, {
        onSuccess: () => {
          toast.success('Mfanyakazi amesasishwa')
          closeModal()
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message || 'Imeshindwa kusasisha')
        }
      })
    } else {
      createStaff(payload, {
        onSuccess: () => {
          toast.success('Mfanyakazi ameongezwa')
          closeModal()
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message || 'Imeshindwa kuongeza mfanyakazi')
        }
      })
    }
  }

  const askDelete = (id: string) => {
    setStaffToDelete(id)
    setConfirmOpen(true)
  }

  const handleDelete = () => {
    if (!staffToDelete) return
    deactivateStaff(staffToDelete, {
      onSuccess: () => {
        toast.success('Mfanyakazi amezimwa')
        setConfirmOpen(false)
        setStaffToDelete(null)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || 'Imeshindwa kuzima')
      }
    })
  }

  const filteredStaff = staff.filter((member: any) =>
    member.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    member.email?.toLowerCase().includes(search.toLowerCase()) ||
    member.staffProfile?.position?.toLowerCase().includes(search.toLowerCase()) ||
    member.staffProfile?.employeeNo?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 font-sans text-left pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">🧑‍💼 Staff Management</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Manage team members, roles and employment details</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/staff/roles"
              className="bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-[#6b7280] hover:text-blue-600 rounded-xl px-4 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all"
            >
              <Shield size={15} />
              Manage Roles
              <ArrowRight size={13} />
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={openCreate}
              className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
            >
              <Plus size={16} />
              Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-card p-4 border border-border/20">
        <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 min-w-[240px] focus-within:border-[#8b4530]/50 transition-all">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, position or employee number..."
            className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
          />
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card p-5 h-56 animate-pulse" />
            ))
          : filteredStaff.map((member: any) => (
              <div key={member.id} className="bg-white rounded-xl shadow-card p-5 border border-border/20 hover:border-blue-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[13px]">
                      {member.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#111827]">{member.fullName}</h3>
                      <p className="text-[11px] text-[#9ca3af] font-medium">{member.staffProfile?.employeeNo || 'No profile'}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => askDelete(member.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                    <Briefcase size={12} /> 
                    {member.staffProfile?.position || '—'}
                    <span className="text-[#9ca3af]">•</span>
                    {member.staffProfile?.department || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                    <Mail size={12} /> {member.email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                      <Phone size={12} /> {member.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                    <Calendar size={12} /> Started {member.staffProfile?.startDate ? formatDate(member.staffProfile.startDate) : '—'}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                    <Wallet size={12} /> {formatTZS(member.staffProfile?.basicSalary || 0)} / month
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                  <span className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                    ${member.role?.name === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}
                  `}>
                    <Shield size={10} />
                    {member.role?.name || member.role || '—'}
                  </span>
                  <span className="text-[11px] text-[#9ca3af] font-medium capitalize">
                    {member.staffProfile?.employmentType?.replace('_', '-') || 'full-time'}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {!isLoading && filteredStaff.length === 0 && (
        <div className="text-center py-20 text-[#9ca3af] text-[13px] font-medium bg-white rounded-xl shadow-card border border-border/20">
          <Users2 className="mx-auto mb-3 text-[#d1d5db]" size={40} />
          No staff members found. {isAdmin ? 'Click &ldquo;Add Staff&rdquo; to register one.' : ''}
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Deactivate Staff"
        description="Are you sure you want to deactivate this staff member? They will no longer be able to log in."
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isPending={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setStaffToDelete(null)
        }}
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">
                  {editingStaff ? 'Edit Staff' : 'Add New Staff'}
                </h2>
                <p className="text-[12px] text-[#9ca3af] font-medium">
                  {editingStaff ? 'Update employment details' : 'Create staff account and profile'}
                </p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9ca3af] hover:text-[#111827] transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Full Name *</label>
                  <input
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="e.g. Jane Cooper"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="jane@hotel.com"
                    required
                    disabled={!!editingStaff}
                  />
                </div>
              </div>

              {!editingStaff && (
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Min 6 characters"
                    required={!editingStaff}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Role *</label>
                  <select
                    value={form.roleId}
                    onChange={e => setForm({ ...form, roleId: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  >
                    {roles.length === 0 && <option value="">Loading roles...</option>}
                    {roles.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="+255..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Position *</label>
                  <input
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="e.g. Head Receptionist"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Department *</label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Employment Type</label>
                  <select
                    value={form.employmentType}
                    onChange={e => setForm({ ...form, employmentType: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Basic Salary (TZS) *</label>
                  <input
                    type="number"
                    value={form.basicSalary}
                    onChange={e => setForm({ ...form, basicSalary: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Bank Name</label>
                  <input
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="e.g. CRDB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Bank Account</label>
                  <input
                    value={form.bankAccount}
                    onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    placeholder="Account number"
                  />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-[12px] text-[#6b7280] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.deductNssf}
                      onChange={e => setForm({ ...form, deductNssf: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Deduct NSSF
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-[#6b7280] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.deductWcf}
                      onChange={e => setForm({ ...form, deductWcf: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Deduct WCF
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
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
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating || updating ? <Loader2 size={16} className="animate-spin" /> : null}
                  {creating || updating ? 'Saving...' : (editingStaff ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
