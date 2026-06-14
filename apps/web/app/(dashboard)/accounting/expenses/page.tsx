'use client'

import { useState } from 'react'
import { useExpenses, useExpenseStats, useCreateExpense } from '@/hooks/useExpenses'
import { format } from 'date-fns'
import { 
  Plus, Filter, Download, PieChart, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, 
  Search, ChevronLeft, ChevronRight, X, Loader2,
  Calendar, MoreHorizontal, ShoppingCart, UtilityPole,
  Wrench, Megaphone, Users, Briefcase
} from 'lucide-react'
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatTZS } from '@/lib/formatters'
import { toast } from 'sonner'

const CATEGORIES = [
  { id: 'salary',      label: 'Staff Salary',     icon: Users,      color: '#2563eb', bg: 'bg-blue-50' },
  { id: 'utilities',   label: 'Utilities (LUKU)', icon: UtilityPole, color: '#f59e0b', bg: 'bg-amber-50' },
  { id: 'maintenance', label: 'Repairs & Maint',  icon: Wrench,       color: '#ef4444', bg: 'bg-red-50' },
  { id: 'supplies',    label: 'Hotel Supplies',   icon: ShoppingCart, color: '#10b981', bg: 'bg-emerald-50' },
  { id: 'marketing',   label: 'Marketing/Ads',    icon: Megaphone,    color: '#6366f1', bg: 'bg-indigo-50' },
  { id: 'other',       label: 'Other Costs',      icon: Briefcase,    color: '#6b7280', bg: 'bg-gray-50' },
]

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: expensesData, isLoading } = useExpenses({ 
    category: categoryFilter, 
    search,
    page,
    limit: 10
  })
  const { data: stats } = useExpenseStats()
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense()

  const expenses = expensesData?.data || []
  const meta = expensesData?.meta || { total: 0, totalPages: 1 }

  // Pie Chart Data
  const chartData = stats?.byCategory?.map((cat: any) => ({
    name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
    value: Number(cat._sum.amount),
    color: CATEGORIES.find(c => c.id === cat.category)?.color || '#9ca3af'
  })) || []

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
      onSuccess: () => {
        toast.success('Expense recorded successfully')
        setIsModalOpen(false)
      },
      onError: () => toast.error('Failed to record expense')
    })
  }

  return (
    <div className="space-y-6 font-sans text-left pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Expense Tracking</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Full audit trail of all hotel expenditures</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="h-11 px-4 border border-gray-100 bg-white rounded-xl text-[13px] font-bold text-[#6b7280] flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
              <Download size={16} /> Export Report
           </button>
           <button 
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
           >
              <Plus size={18} /> Record Expense
           </button>
        </div>
      </div>

      {/* ── Dashboard Stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         
         {/* Total Spent Card */}
         <div className="lg:col-span-4 bg-[#1a2b4a] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-3xl" />
            <div className="relative z-10 space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                     <Wallet className="text-blue-300" size={24} />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">Total Monthly Outflow</p>
               </div>
               <div>
                  <p className="text-[36px] font-bold tracking-tighter leading-none">{formatTZS(stats?.total ?? 0)}</p>
                  <div className="flex items-center gap-2 mt-4">
                     <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        <ArrowDownRight size={12} /> 12.5%
                     </span>
                     <p className="text-[11px] text-blue-200/60 font-medium">Lower than last month</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Distribution Chart */}
         <div className="lg:col-span-8 bg-white rounded-[32px] p-8 border border-gray-50 shadow-card flex flex-col md:flex-row items-center gap-8">
            <div className="w-full h-[200px] md:w-[240px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                     <Pie
                        data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1, color: '#f3f4f6' }]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        formatter={(val: number) => formatTZS(val)}
                     />
                  </RePieChart>
               </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
               {CATEGORIES.slice(0, 4).map(cat => {
                 const stat = stats?.byCategory?.find((s: any) => s.category === cat.id)
                 return (
                   <div key={cat.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                         <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">{cat.label}</p>
                      </div>
                      <p className="text-[15px] font-bold text-[#111827]">{formatTZS(stat?._sum.amount ?? 0)}</p>
                   </div>
                 )
               })}
            </div>
         </div>
      </div>

      {/* ── Operational Log ────────────────────────────── */}
      <div className="bg-white rounded-[32px] shadow-card border border-gray-50 overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Financial Transaction Log</h3>
               <p className="text-[12px] text-[#9ca3af] font-medium">Listing {expenses.length} recent expenditures</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 min-w-[240px] focus-within:bg-white focus-within:border-[#2563eb]/20 transition-all">
                  <Search size={16} className="text-[#9ca3af]" />
                  <input 
                     value={search}
                     onChange={e => { setSearch(e.target.value); setPage(1) }}
                     placeholder="Search description..."
                     className="bg-transparent text-[13px] font-medium text-[#111827] outline-none w-full"
                  />
               </div>
               <select 
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-[12px] font-bold text-[#6b7280] outline-none cursor-pointer hover:bg-gray-100 transition-colors"
               >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
               </select>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/30">
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Date & Ref</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Expense Detail</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Category</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Amount</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Authorized By</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                     Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-8 py-6 animate-pulse"><div className="h-6 bg-gray-50 rounded-xl w-full" /></td></tr>
                     ))
                  ) : expenses.length === 0 ? (
                     <tr><td colSpan={6} className="py-20 text-center"><p className="text-[#9ca3af] font-bold">Hakuna matumizi yaliyorekodiwa bado.</p></td></tr>
                  ) : expenses.map((exp: any) => {
                     const cat = CATEGORIES.find(c => c.id === exp.category)
                     return (
                        <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                           <td className="px-8 py-5">
                              <p className="text-[13px] font-bold text-[#111827]">{format(new Date(exp.date), 'dd MMM, yyyy')}</p>
                              <p className="text-[10px] text-[#9ca3af] font-medium">EXP-{exp.id.slice(0, 5).toUpperCase()}</p>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[14px] font-bold text-[#111827]">{exp.description}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                 <Receipt size={10} className="text-[#9ca3af]" />
                                 <span className="text-[10px] text-[#9ca3af] font-medium italic underline cursor-pointer">View Receipt</span>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", cat?.bg, cat?.color.replace('#', 'text-[#'), `border-${cat?.id}-100`)}>
                                 {cat && <cat.icon size={12} />}
                                 {cat?.label}
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <p className="text-[15px] font-bold text-[#111827]">{formatTZS(exp.amount)}</p>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                 <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-[#2563eb]">
                                    {exp.user?.fullName.charAt(0)}
                                 </div>
                                 <span className="text-[12px] font-bold text-gray-700">{exp.user?.fullName}</span>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button className="p-2 rounded-lg hover:bg-gray-100 text-[#9ca3af] opacity-0 group-hover:opacity-100 transition-all">
                                 <MoreHorizontal size={16} />
                              </button>
                           </td>
                        </tr>
                     )
                  })}
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         {meta.totalPages > 1 && (
            <div className="p-8 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
               <p className="text-[11px] text-[#9ca3af] font-bold uppercase tracking-wider">
                  Page <span className="text-[#111827]">{page}</span> of {meta.totalPages} · {meta.total} records
               </p>
               <div className="flex items-center gap-2">
                  <button 
                     disabled={page === 1}
                     onClick={() => setPage(p => p - 1)}
                     className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-[#9ca3af] hover:text-[#2563eb] disabled:opacity-30 transition-all shadow-sm"
                  >
                     <ChevronLeft size={18} />
                  </button>
                  <button 
                     disabled={page >= meta.totalPages}
                     onClick={() => setPage(p => p + 1)}
                     className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-[#9ca3af] hover:text-[#2563eb] disabled:opacity-30 transition-all shadow-sm"
                  >
                     <ChevronRight size={18} />
                  </button>
               </div>
            </div>
         )}
      </div>

      {/* ── Record Expense Modal ───────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-[#111827]/40 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-[#f8fafc]/50">
               <div>
                  <h3 className="text-xl font-bold text-[#111827] tracking-tight">Record Expense</h3>
                  <p className="text-[12px] text-[#9ca3af] font-medium">Enter transaction details below</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#9ca3af] hover:text-red-500 transition-all border border-gray-100 shadow-sm">
                  <X size={20} />
               </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] ml-1">Amount (TZS)</label>
                  <div className="relative">
                     <input name="amount" type="number" required placeholder="0.00" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-lg font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all" />
                     <Wallet className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] ml-1">Category</label>
                  <select name="category" required className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-bold text-[#111827] outline-none cursor-pointer appearance-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all">
                     {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] ml-1">Description</label>
                  <input name="description" type="text" required placeholder="What was this for?" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all" />
               </div>

               <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] ml-1">Transaction Date</label>
                  <div className="relative">
                     <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all" />
                     <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
                  </div>
               </div>

               <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 border border-gray-100 text-[#9ca3af] rounded-[20px] font-bold text-[14px] hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" disabled={isCreating} className="flex-[2] h-14 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[20px] font-bold text-[14px] transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2">
                     {isCreating ? <Loader2 size={20} className="animate-spin" /> : 'Record Transaction'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
