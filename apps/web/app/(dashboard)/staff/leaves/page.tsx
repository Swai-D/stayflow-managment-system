'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLeaves, useRequestLeave, useReviewLeave } from '@/hooks/useStaff'
import { formatDate } from '@/lib/formatters'
import { 
  Plus, Calendar, Clock, X, Loader2, Search, Filter,
  CheckCircle2, XCircle, AlertCircle, Leaf
} from 'lucide-react'
import { toast } from 'sonner'

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'unpaid', label: 'Unpaid' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
  cancelled: 'bg-gray-50 text-gray-600',
}

const emptyForm = {
  type: 'annual',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  reason: '',
}

export default function LeavesPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin'

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [reviewing, setReviewing] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null)

  const { data: leaves = [], isLoading } = useLeaves(statusFilter || undefined)
  const { mutate: requestLeave, isPending: requesting } = useRequestLeave()
  const { mutate: reviewLeave, isPending: reviewingPending } = useReviewLeave()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reason.trim()) {
      toast.error('Sababu ya likizo inahitajika')
      return
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast.error('Tarehe ya mwisho ni kabla ya tarehe ya kuanza')
      return
    }

    requestLeave(form, {
      onSuccess: () => {
        toast.success('Ombi la likizo limetumwa')
        setIsModalOpen(false)
        setForm(emptyForm)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || 'Imeshindwa kutuma ombi')
      }
    })
  }

  const handleReview = (id: string, action: 'approved' | 'rejected') => {
    setReviewing({ id, action })
    reviewLeave({ id, data: { action } }, {
      onSuccess: () => {
        toast.success(action === 'approved' ? 'Likizo imeidhinishwa' : 'Likizo imekataliwa')
        setReviewing(null)
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || 'Imeshindwa kushughulikia')
        setReviewing(null)
      }
    })
  }

  const filteredLeaves = leaves.filter((leave: any) =>
    leave.staff?.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    leave.reason?.toLowerCase().includes(search.toLowerCase()) ||
    leave.type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 font-sans text-left pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">🌴 Leave Requests</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Staff leave applications and approvals</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
        >
          <Plus size={16} />
          Request Leave
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4 border border-border/20 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-subtle/50 border border-border rounded-xl px-4 py-2 flex-1 focus-within:border-[#8b4530]/50 transition-all">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or reason..."
            className="bg-transparent text-[12px] font-medium text-[#111827] outline-none placeholder:text-[#9ca3af] w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#9ca3af]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-[12px] font-bold text-[#6b7280] outline-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Leaves Table */}
      <div className="bg-white rounded-xl shadow-card border border-border/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Staff</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Dates</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-center">Days</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-6 py-5 animate-pulse"><div className="h-5 bg-gray-50 rounded-xl w-full" /></td></tr>
                ))
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Leaf className="mx-auto mb-3 text-[#d1d5db]" size={36} />
                    <p className="text-[#9ca3af] font-medium text-[13px]">Hakuna maombi ya likizo.</p>
                  </td>
                </tr>
              ) : filteredLeaves.map((leave: any) => (
                <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[11px]">
                        {leave.staff?.user?.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#111827]">{leave.staff?.user?.fullName}</p>
                        <p className="text-[10px] text-[#9ca3af] font-medium">{leave.staff?.employeeNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="capitalize text-[13px] font-medium text-[#6b7280]">{leave.type}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                      <Calendar size={12} />
                      {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-[#111827] text-[11px] font-bold">
                      <Clock size={10} /> {leave.days}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[12px] text-[#6b7280] max-w-[200px] truncate" title={leave.reason}>{leave.reason}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[leave.status] || 'bg-gray-50 text-gray-600'}`}>
                      {leave.status === 'pending' && <AlertCircle size={10} />}
                      {leave.status === 'approved' && <CheckCircle2 size={10} />}
                      {leave.status === 'rejected' && <XCircle size={10} />}
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {isAdmin && leave.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReview(leave.id, 'approved')}
                          disabled={reviewing?.id === leave.id && reviewingPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(leave.id, 'rejected')}
                          disabled={reviewing?.id === leave.id && reviewingPending}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9ca3af]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#111827]">Request Leave</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9ca3af] hover:text-[#111827]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Leave Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                >
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Reason *</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 resize-none"
                  placeholder="Briefly explain the reason for leave..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-[#6b7280] rounded-xl text-[13px] font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requesting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requesting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
