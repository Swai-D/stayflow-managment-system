'use client'

import { useState } from 'react'
import { useRevenueReport, useFinancialReport, useBusinessAdvice, useRefreshBusinessAdvice, AdvicePeriod } from '@/hooks/useReports'
import { format, parseISO } from 'date-fns'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, Legend,
  ComposedChart, Line
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Target, 
  Activity, PieChart as PieIcon, Briefcase, Zap,
  Download, Filter, ChevronRight, Info, Lightbulb,
  ArrowUpRight, ArrowDownRight, Wallet, Banknote,
  Star, ShieldCheck, Gem, RefreshCw, Sparkles, Bot, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTZS } from '@/lib/formatters'
import { toast } from 'sonner'

const PERIOD_OPTIONS: { value: AdvicePeriod; label: string }[] = [
  { value: 'DAILY', label: 'Daily Advice' },
  { value: 'WEEKLY', label: 'Weekly Advice' },
  { value: 'MONTHLY', label: 'Monthly Advice' },
]

export default function RevenuePage() {
  const [days, setDays] = useState(30)
  const [period, setPeriod] = useState<AdvicePeriod>('MONTHLY')
  const { data: revenueData, isLoading: revenueLoading } = useRevenueReport(days)
  const { data: fin, isLoading: finLoading } = useFinancialReport(days)
  
  // ─── AI Business Advisor ────────────────────────────
  const { data: adviceResponse, isLoading: adviceLoading, isError: adviceError, error: adviceQueryError } = useBusinessAdvice(period)
  const { mutate: refreshAdvice, isPending: isRefreshing } = useRefreshBusinessAdvice()

  const advice = adviceResponse?.advice ?? []
  const generatedAt = adviceResponse?.generatedAt
  const remainingRefreshes = adviceResponse?.remainingRefreshes ?? 0

  const isFallback = adviceResponse?.isFallback

  const handleRefresh = () => {
    if (remainingRefreshes <= 0) {
      toast.error('Umeshafikia kikomo cha kurefresh ushauri leo. Jaribu kesho.')
      return
    }
    refreshAdvice(period, {
      onSuccess: () => toast.success('Ushauri mpya umeandaliwa'),
      onError: (err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Imeshindwa kupata ushauri mpya. Tafadhali jaribu tena.')
      }
    })
  }

  return (
    <div className="space-y-6 font-sans text-left pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Revenue Management</h1>
          <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Business Intelligence & Profit Analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
           <select 
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="h-10 px-4 border border-gray-100 bg-white rounded-xl text-[12px] font-bold text-[#6b7280] outline-none cursor-pointer shadow-sm"
           >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
           </select>
           <button className="h-10 px-4 bg-[#2563eb] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-100">
              <Download size={16} /> Export Statement
           </button>
        </div>
      </div>

      {/* ── Core Financial Summary (P&L) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         
         {/* Net Profit Card (Main Hero) */}
         <div className="lg:col-span-4 bg-[#1a2b4a] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                     <Activity className="text-blue-300" size={24} />
                  </div>
                  <div>
                     <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">Net Profit (P&L)</p>
                     <p className="text-[10px] text-blue-200/50 font-medium">Siku {days} zilizopita</p>
                  </div>
               </div>
               <p className="text-[42px] font-bold tracking-tighter leading-none mb-4">{formatTZS(fin?.netProfit ?? 0)}</p>
               <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold",
                    (fin?.netProfit ?? 0) >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                  )}>
                     {(fin?.netProfit ?? 0) >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                     {(fin?.expenseRatio ?? 0).toFixed(1)}% Ratio
                  </span>
                  <p className="text-[11px] text-blue-200/60 font-medium italic">Baada ya gharama zote</p>
               </div>
            </div>

            <div className="relative z-10 mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] font-bold text-blue-300/50 uppercase tracking-widest mb-1">Gross Revenue</p>
                  <p className="text-[15px] font-bold text-white">{formatTZS(fin?.totalRevenue ?? 0)}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-red-300/50 uppercase tracking-widest mb-1">Total Expenses</p>
                  <p className="text-[15px] font-bold text-white">{formatTZS(fin?.totalExpenses ?? 0)}</p>
               </div>
            </div>
         </div>

         {/* Business Matrix (KPI Grid) */}
         <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'ADR (Avg Daily Rate)', value: formatTZS(fin?.adr ?? 0), sub: 'Mapato kwa kila chumba kilichouzwa', icon: Banknote, color: 'text-[#2563eb]', bg: 'bg-blue-50' },
              { label: 'RevPAR', value: formatTZS(fin?.revpar ?? 0), sub: 'Mapato kwa jumla ya vyumba vyote', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Expense Ratio', value: `${(fin?.expenseRatio ?? 0).toFixed(1)}%`, sub: 'Asilimia ya pesa inayopotea kwenye matumizi', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Rooms Sold', value: `${fin?.totalNightsSold ?? 0} Nights`, sub: 'Idadi ya vyumba vilivyouzwa katika kipindi hiki', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-card flex items-start gap-5 hover:scale-[1.02] transition-all">
                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                    <kpi.icon size={24} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-widest">{kpi.label}</p>
                    <p className="text-[24px] font-bold text-[#111827] tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] text-[#9ca3af] font-medium leading-snug">{kpi.sub}</p>
                 </div>
              </div>
            ))}
         </div>
      </div>

      {/* ── AI Business Advisor Section ─────────────────── */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Lightbulb size={120} />
         </div>
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Bot size={20} />
               </div>
               <div>
                  <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Buffalo Business Advisor</h3>
                  <p className="text-[12px] text-[#9ca3af] font-medium">Uchambuzi wa ki-intelijensia wa mwenendo wa biashara yako</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as AdvicePeriod)}
                  className="h-10 px-4 border border-gray-100 bg-white rounded-xl text-[12px] font-bold text-[#6b7280] outline-none cursor-pointer shadow-sm"
               >
                  {PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
               </select>
               <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-10 px-4 bg-[#2563eb] text-white rounded-xl text-[12px] font-bold flex items-center gap-2 hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
               >
                  {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isRefreshing ? 'Inachambua...' : 'Pata Ushauri Mpya'}
               </button>
            </div>
         </div>

         {generatedAt && (
            <div className="flex items-center justify-between mb-6">
               <p className="text-[11px] font-medium text-[#9ca3af]">
                  Ushauri wa {PERIOD_OPTIONS.find(p => p.value === period)?.label.toLowerCase()} umeandaliwa:{' '}
                  <span className="text-[#6b7280] font-semibold">{format(parseISO(generatedAt), 'dd MMM yyyy, HH:mm')}</span>
               </p>
               <p className={cn(
                 "text-[11px] font-bold px-2 py-0.5 rounded-full",
                 remainingRefreshes > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
               )}>
                  {remainingRefreshes} refreshes zilizobaki leo
               </p>
            </div>
         )}

         {isFallback && (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-start gap-3 mb-6">
               <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
               <div>
                 <h4 className="text-[13px] font-bold text-amber-800">Ushauri wa kawaida</h4>
                 <p className="text-[12px] text-amber-700">Advisor haijaweza kupata ushauri kutoka AI. Bofya &quot;Pata Ushauri Mpya&quot; kujaribu tena.</p>
               </div>
            </div>
         )}

         {adviceLoading && advice.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[1, 2, 3].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 animate-pulse flex flex-col gap-4">
                     <div className="w-10 h-10 rounded-xl bg-gray-200" />
                     <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                     </div>
                  </div>
               ))}
            </div>
         ) : adviceError ? (
            <div className="p-6 rounded-2xl border border-red-100 bg-red-50/30 flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Info size={20} />
               </div>
               <div>
                  <h4 className="text-[14px] font-bold text-red-800 mb-1">Advisor haikupatikana</h4>
                  <p className="text-[12px] font-medium text-[#6b7280] leading-relaxed mb-3">
                     {(adviceQueryError as any)?.response?.data?.error?.message || 
                       'Mfumo wa ushauri ulishindwa kupata majibu. Hii inaweza kutokana na API key kutosha au kikomo cha siku kimefikia.'}
                  </p>
                  <button
                     onClick={handleRefresh}
                     disabled={remainingRefreshes <= 0 || isRefreshing}
                     className="h-9 px-4 bg-white border border-red-200 text-red-600 rounded-xl text-[12px] font-bold flex items-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                     <RefreshCw size={14} /> Jaribu tena
                  </button>
               </div>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {advice.map((ins, i) => (
                  <div key={i} className={cn(
                    "p-6 rounded-2xl border flex flex-col gap-4",
                    ins.type === 'success' ? "bg-emerald-50/30 border-emerald-100" : 
                    ins.type === 'danger' ? "bg-red-50/30 border-red-100" : 
                    ins.type === 'warning' ? "bg-amber-50/30 border-amber-100" : "bg-blue-50/30 border-blue-100"
                  )}>
                     <div className="flex items-start justify-between gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          ins.type === 'success' ? "bg-emerald-100 text-emerald-600" : 
                          ins.type === 'danger' ? "bg-red-100 text-red-600" : 
                          ins.type === 'warning' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                        )}>
                           {ins.type === 'success' && <Gem size={20} />}
                           {ins.type === 'danger' && <ShieldCheck size={20} />}
                           {ins.type === 'warning' && <Zap size={20} />}
                           {ins.type === 'info' && <Lightbulb size={20} />}
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          ins.priority === 'high' ? "bg-red-50 text-red-600 border-red-100" :
                          ins.priority === 'medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                           {ins.priority}
                        </span>
                     </div>
                     <div>
                        <h4 className={cn(
                          "text-[14px] font-bold mb-1.5",
                          ins.type === 'success' ? "text-emerald-800" : 
                          ins.type === 'danger' ? "text-red-800" : 
                          ins.type === 'warning' ? "text-amber-800" : "text-blue-800"
                        )}>{ins.title}</h4>
                        <p className="text-[12px] font-medium text-[#6b7280] leading-relaxed">{ins.message}</p>
                     </div>
                  </div>
               ))}
               {advice.length === 0 && (
                  <p className="col-span-3 text-center py-10 text-gray-400 italic">Advisor bado anakusanya data za kutosha...</p>
               )}
            </div>
         )}
      </div>

      {/* ── Revenue Performance Chart ──────────────────── */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-50 shadow-card">
         <div className="flex items-center justify-between mb-10">
            <div>
               <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Revenue Over Time</h3>
               <p className="text-[12px] text-[#9ca3af] font-medium">Daily collection and growth trajectory</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2563eb]" />
                  <span className="text-[11px] font-bold text-[#6b7280] uppercase">Daily Revenue</span>
               </div>
            </div>
         </div>

         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={revenueData || []}>
                  <defs>
                     <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                     tickFormatter={(str) => format(new Date(str), 'dd MMM')}
                     dy={10}
                  />
                  <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                     tickFormatter={(val) => `TZS ${val / 1000}k`}
                  />
                  <Tooltip 
                     contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '15px' }}
                     formatter={(val: any) => [formatTZS(val), 'Revenue']}
                  />
                  <Area 
                     type="monotone" 
                     dataKey="total" 
                     stroke="#2563eb" 
                     strokeWidth={4} 
                     fillOpacity={1} 
                     fill="url(#colorRev)" 
                     animationDuration={1500}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

    </div>
  )
}
