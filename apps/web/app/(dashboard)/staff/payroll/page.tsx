'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStaff, usePayroll, usePayrollSummary, useGeneratePayroll, useApprovePayroll, useMarkPayrollPaid } from '@/hooks/useStaff'
import { formatTZS } from '@/lib/formatters'
import { 
  Wallet, Calendar, ChevronLeft, ChevronRight, Plus, 
  CheckCircle2, X, Loader2, FileText, Users2, ArrowRight,
  TrendingUp, PiggyBank, Receipt
} from 'lucide-react'
import { toast } from 'sonner'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-600',
  approved: 'bg-blue-50 text-blue-600',
  paid: 'bg-emerald-50 text-emerald-600',
}

export default function PayrollPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')

  const { data: staff = [] } = useStaff()
  const { data: payroll = [], isLoading } = usePayroll(month, year)
  const { data: summary } = usePayrollSummary(month, year)
  const { mutate: generatePayroll, isPending: generating } = useGeneratePayroll()
  const { mutate: approvePayroll, isPending: approving } = useApprovePayroll()
  const { mutate: markPaid, isPending: marking } = useMarkPayrollPaid()

  const eligibleStaff = useMemo(() => {
    const payrollStaffIds = new Set(payroll.map((p: any) => p.staffId))
    return staff.filter((s: any) => s.staffProfile && !payrollStaffIds.has(s.staffProfile.id))
  }, [staff, payroll])

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffId) {
      toast.error('Chagua mfanyakazi')
      return
    }
    generatePayroll({ staffId: selectedStaffId, month, year }, {
      onSuccess: () => {
        toast.success('Payroll imetengenezwa')
        setIsModalOpen(false)
        setSelectedStaffId('')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || 'Imeshindwa kutengeneza payroll')
      }
    })
  }

  const handleApprove = (id: string) => {
    approvePayroll(id, {
      onSuccess: () => toast.success('Payroll imeidhinishwa'),
      onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Imeshindwa kuidhinisha')
    })
  }

  const handleMarkPaid = (id: string) => {
    markPaid(id, {
      onSuccess: () => toast.success('Mshahara umelipwa'),
      onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Imeshindwa kulipa')
    })
  }

  const changeMonth = (delta: number) => {
    const newMonth = month + delta
    if (newMonth < 1) {
      setMonth(12)
      setYear(y => y - 1)
    } else if (newMonth > 12) {
      setMonth(1)
      setYear(y => y + 1)
    } else {
      setMonth(newMonth)
    }
  }

  return (
    <div className="space-y-4 font-sans text-left pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">💵 Payroll</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-[-2px]">Staff salaries, deductions and payslips</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-[#6b7280]">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
              <Calendar size={14} className="text-[#9ca3af]" />
              <span className="text-[13px] font-bold text-[#111827]">{MONTHS[month - 1]} {year}</span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-[#6b7280]">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
          >
            <Plus size={16} />
            Generate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp size={20} />
            </div>
            <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">Total Gross</p>
          </div>
          <p className="text-[20px] font-bold text-[#111827]">{formatTZS(summary?.totalGross || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <PiggyBank size={20} />
            </div>
            <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">Total NSSF</p>
          </div>
          <p className="text-[20px] font-bold text-[#111827]">{formatTZS((summary?.totalNssfEmployee || 0) + (summary?.totalNssfEmployer || 0))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Receipt size={20} />
            </div>
            <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">Total PAYE</p>
          </div>
          <p className="text-[20px] font-bold text-[#111827]">{formatTZS(summary?.totalPaye || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 border border-border/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Wallet size={20} />
            </div>
            <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">Total Net Pay</p>
          </div>
          <p className="text-[20px] font-bold text-[#111827]">{formatTZS(summary?.totalNet || 0)}</p>
        </div>
      </div>

      {/* Accounting Link */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600">
            <Receipt size={18} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#111827]">Salary Expense</p>
            <p className="text-[11px] text-[#6b7280]">Total salary expense for {MONTHS[month - 1]} {year}</p>
          </div>
        </div>
        <Link href="/accounting/expenses" className="text-[12px] font-bold text-blue-600 hover:underline flex items-center gap-1">
          View in Accounting <ArrowRight size={12} />
        </Link>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-card border border-border/20 overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h3 className="text-[16px] font-bold text-[#111827]">Payroll Records</h3>
          <p className="text-[12px] text-[#9ca3af] font-medium">{payroll.length} staff members processed</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Staff</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Basic</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Gross</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Deductions</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Net</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-6 py-5 animate-pulse"><div className="h-5 bg-gray-50 rounded-xl w-full" /></td></tr>
                ))
              ) : payroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Wallet className="mx-auto mb-3 text-[#d1d5db]" size={36} />
                    <p className="text-[#9ca3af] font-medium text-[13px]">Hakuna payroll iliyotengenezwa kwa mwezi huu.</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-3 text-[12px] font-bold text-blue-600 hover:underline">
                      Tengeneza payroll sasa
                    </button>
                  </td>
                </tr>
              ) : payroll.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[11px]">
                        {record.staff?.user?.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#111827]">{record.staff?.user?.fullName}</p>
                        <p className="text-[10px] text-[#9ca3af] font-medium">{record.staff?.employeeNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-[13px] font-bold text-[#111827]">{formatTZS(record.basicSalary)}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-[13px] font-bold text-[#111827]">{formatTZS(record.grossSalary)}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-[13px] font-bold text-[#ef4444]">{formatTZS(record.totalDeductions)}</p>
                    <p className="text-[9px] text-[#9ca3af]">NSSF {formatTZS(record.nssfEmployee)} • PAYE {formatTZS(record.payeTax)}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-[14px] font-bold text-[#111827]">{formatTZS(record.netSalary)}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[record.status] || 'bg-gray-50 text-gray-600'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {record.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(record.id)}
                          disabled={approving}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {record.status === 'approved' && (
                        <button
                          onClick={() => handleMarkPaid(record.id)}
                          disabled={marking}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                      {record.status === 'paid' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">Generate Payroll</h2>
                <p className="text-[12px] text-[#9ca3af] font-medium">{MONTHS[month - 1]} {year}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9ca3af] hover:text-[#111827]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">Staff Member *</label>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select staff...</option>
                  {eligibleStaff.map((s: any) => (
                    <option key={s.staffProfile.id} value={s.staffProfile.id}>
                      {s.fullName} — {s.staffProfile.position}
                    </option>
                  ))}
                </select>
                {eligibleStaff.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2">Wafanyakazi wote wameshaanzishwa payroll kwa mwezi huu.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Month</label>
                  <select
                    value={month}
                    onChange={e => setMonth(Number(e.target.value))}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#6b7280] uppercase">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  />
                </div>
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
                  disabled={generating || eligibleStaff.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : null}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
