'use client'

import { useState } from 'react'
import { useExpenses, useExpenseStats, useCreateExpense } from '@/hooks/useExpenses'
import { format } from 'date-fns'
import { Plus, Filter, Download } from 'lucide-react'

const CATEGORIES = ['salary', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: expensesData, isLoading } = useExpenses({ category: categoryFilter, page })
  const { data: stats } = useExpenseStats()
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense()

  const expenses = expensesData?.expenses || []
  const meta = expensesData?.meta || { total: 0, totalPages: 1 }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      description: formData.get('description'),
      date: formData.get('date') || new Date().toISOString()
    }
    createExpense(data, {
      onSuccess: () => setIsModalOpen(false)
    })
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
        >
          <Plus size={18} /> Record Expense
        </button>
      </div>

      {/* ── Stats ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Monthly Expense</p>
          <p className="text-2xl font-bold text-gray-900">TZS {Number(stats?.total ?? 0).toLocaleString()}</p>
        </div>
        {/* Top categories summary */}
        {stats?.byCategory?.slice(0, 2).map((cat: any) => (
          <div key={cat.category} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">{cat.category}</p>
            <p className="text-2xl font-bold text-gray-900">TZS {Number(cat._sum.amount).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* ── Main List ───────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border-none rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Download size={18} /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Description</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Category</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-6 py-4 animate-pulse"><div className="h-4 bg-gray-100 rounded" /></td></tr>
                ))
              ) : expenses.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-[13px] text-gray-600">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-gray-900">{exp.description}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold text-gray-900 text-right">TZS {Number(exp.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-500">{exp.user?.fullName}</td>
                </tr>
              ))}
              {!isLoading && expenses.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400 text-sm">No expenses recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Record New Expense</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount (TZS)</label>
                <input name="amount" type="number" required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                <select name="category" required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                <input name="description" type="text" required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Date</label>
                <input name="date" type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                  {isCreating ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
