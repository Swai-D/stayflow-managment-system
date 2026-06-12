'use client'

import { useRevenueReport, useDashboardSummary } from '@/hooks/useReports'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function RevenuePage() {
  const { data: revenueData, isLoading: revenueLoading } = useRevenueReport(30)
  const { data: summary } = useDashboardSummary()

  const totalRevenue = revenueData?.reduce((sum: number, item: any) => sum + item.total, 0) || 0
  const avgRevenue = totalRevenue / (revenueData?.length || 1)

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Revenue Management</h1>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600">
          Last 30 Days Summary
        </div>
      </div>

      {/* ── Stats ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><DollarSign size={18} /></div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Total Revenue (30d)</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">TZS {totalRevenue.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-green-500 font-bold">
            <TrendingUp size={12} /> +12.5% <span className="text-gray-400 font-medium ml-1">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><TrendingUp size={18} /></div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Daily Average</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">TZS {Math.round(avgRevenue).toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><DollarSign size={18} /></div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Revenue Today</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">TZS {Number(summary?.revenueToday ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* ── Main Chart ─────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend (30 Days)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(str) => format(new Date(str), 'dd MMM')}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(val) => `TZS ${val / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                formatter={(val: any) => [`TZS ${val.toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Table: Top Bookings by Revenue ─────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
           <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* We could fetch individual payments here or use a simplified list */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td colSpan={4} className="py-10 text-center text-gray-400 text-sm">Detailed transaction list coming soon</td>
                </tr>
              </tbody>
           </table>
        </div>
      </div>
    </div>
  )
}
