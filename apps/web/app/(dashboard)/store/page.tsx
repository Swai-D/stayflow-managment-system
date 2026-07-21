'use client'

import { useStoreDashboard } from '@/hooks/useStore'
import { formatTZSShort } from '@/lib/formatters'
import { TRANSACTION_TYPE_CONFIG } from '@/types/store'
import {
  Package, AlertTriangle, TrendingUp, ShoppingCart,
  ChevronRight, RefreshCw, MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, LineChart, Line, Legend
} from 'recharts'



function StatCard({ icon, label, value, sub, subColor='text-gray-400', bg='bg-gray-100', iconColor='text-gray-500', href, alert }: any) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {alert && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
            <AlertTriangle size={9}/> Alert
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 font-medium mb-1.5">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[26px] font-bold text-gray-900 leading-none">{value}</span>
        {sub && <span className={cn('text-[11px] font-semibold mb-0.5', subColor)}>{sub}</span>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-[11px] text-[#8B4530] font-semibold mt-3 hover:underline">
          View details <ChevronRight size={11}/>
        </Link>
      )}
    </div>
  )
}

export default function StoreDashboardPage() {
  const { data: stats, isLoading } = useStoreDashboard()

  if (isLoading || !stats) {
    return (
      <div className="p-4 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="h-64 bg-gray-200 rounded-xl lg:col-span-3" />
          <div className="h-64 bg-gray-200 rounded-xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-400">F&B + Hotel Inventory overview</p>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 font-medium transition-colors">
            <RefreshCw size={13}/> Refresh
          </button>
          <Link href="/store/purchase-orders">
            <button className="flex items-center gap-1.5 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors">
              <ShoppingCart size={13}/> New Purchase Order
            </button>
          </Link>
        </div>
      </div>

      {/* Low stock banner */}
      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-amber-600"/>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-amber-800">
                {stats.lowStockCount} item{stats.lowStockCount > 1 ? 's' : ''} running low on stock
              </p>
              <p className="text-[11px] text-amber-600">Reorder soon to avoid shortages</p>
            </div>
          </div>
          <Link href="/store/purchase-orders">
            <button className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
              Auto-Generate PO <ChevronRight size={12}/>
            </button>
          </Link>
        </div>
      )}

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Package size={16}/>}      label="Total Items"      value={stats.totalItems}                   sub="All categories"      bg="bg-blue-50"   iconColor="text-[#8B4530]" href="/store/items"/>
        <StatCard icon={<AlertTriangle size={16}/>} label="Low Stock Alerts" value={stats.lowStockCount}                sub={`${stats.outOfStockCount} out of stock`} subColor={stats.outOfStockCount > 0 ? 'text-red-500' : 'text-gray-400'} bg="bg-amber-50" iconColor="text-amber-600" href="/store/items" alert={stats.lowStockCount > 0}/>
        <StatCard icon={<TrendingUp size={16}/>}    label="Monthly Spend"    value={formatTZSShort(stats.monthlySpend)} sub="Stock purchases this month"   subColor="text-gray-400"  bg="bg-green-50"  iconColor="text-green-600"  href="/store/transactions"/>
        <StatCard icon={<ShoppingCart size={16}/>}  label="Pending Orders"   value={stats.pendingPOs}                   sub="Awaiting delivery"   bg="bg-indigo-50" iconColor="text-indigo-600" href="/store/purchase-orders" alert={stats.pendingPOs > 0}/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">🔥 Top Used Items</h2>
              <p className="text-[11px] text-gray-400">Most issued this month</p>
            </div>
            <Link href="/store/transactions" className="text-[11px] text-[#8B4530] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight size={11}/>
            </Link>
          </div>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.topUsedItems.map((t: any) => ({ name: t.item.name.split(' ').slice(0,2).join(' '), used: t.totalUsed }))}
                margin={{top:0,right:0,left:-20,bottom:0}} layout="vertical" barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6"/>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#9ca3af',fontWeight:600}}/>
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#374151',fontWeight:500}} width={115}/>
                <Tooltip cursor={{fill:'#f8fafc'}} content={({active,payload}) => active && payload?.length ? (
                  <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-[12px]">
                    <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-[#8B4530] font-bold">{payload[0].value} units</p>
                  </div>) : null}
                />
                <Bar dataKey="used" radius={[0,5,5,0]} barSize={16}>
                  {stats.topUsedItems.map((_: any, i: number) => <Cell key={i} fill={i===0?'#8B4530':'#F5DFCE'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">💰 Monthly Spend</h2>
              <p className="text-[11px] text-gray-400">F&B vs Hotel Inventory</p>
            </div>
            <button className="text-gray-400"><MoreHorizontal size={15}/></button>
          </div>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlySpendTrend} margin={{top:4,right:4,left:-28,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#9ca3af',fontWeight:600}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize:9,fill:'#9ca3af'}} tickFormatter={(v)=>`${v/1000}K`}/>
                <Tooltip content={({active,payload,label}) => active && payload?.length ? (
                  <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-[11px]">
                    <p className="font-semibold text-gray-600 mb-1">{label}</p>
                    {payload.map((p:any) => <p key={p.dataKey} style={{color:p.color}} className="font-bold">{p.dataKey==='fb'?'F&B':'Hotel'}: {formatTZSShort(p.value)}</p>)}
                  </div>) : null}
                />
                <Line type="monotone" dataKey="fb"    stroke="#8B4530" strokeWidth={2} dot={{r:3,fill:'#8B4530'}}/>
                <Line type="monotone" dataKey="hotel" stroke="#c4b5fd" strokeWidth={2} dot={{r:3,fill:'#c4b5fd'}}/>
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{fontSize:10,color:'#6b7280',fontWeight:600}}>{v==='fb'?'F&B':'Hotel'}</span>}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low stock + Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">⚠️ Low Stock</h2>
              <p className="text-[11px] text-gray-400">Items needing reorder</p>
            </div>
            <Link href="/store/items" className="text-[11px] text-[#8B4530] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight size={11}/>
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.lowStockItems.map((item: any) => {
              const pct = Math.round((item.currentStock / item.minimumStock) * 100)
              const isOut = item.currentStock === 0
              return (
                <div key={item.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.subCategory}</p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0',
                      isOut ? 'bg-red-50 text-red-500 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                      {isOut ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', isOut?'bg-red-400':'bg-amber-400')} style={{width:`${Math.min(pct,100)}%`}}/>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                      {item.currentStock} / {item.minimumStock} {item.unit.toLowerCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <Link href="/store/purchase-orders">
              <button className="w-full h-9 bg-[#FBF1EA] hover:bg-[#F5DFCE] text-[#8B4530] text-[12px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <ShoppingCart size={13}/> Auto-Generate Purchase Order
              </button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-[11px] text-gray-400">Latest stock movements</p>
            </div>
            <Link href="/store/transactions" className="text-[11px] text-[#8B4530] font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight size={11}/>
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['Item','Type','Qty','Balance','By','Time'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] text-gray-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions.map((tx: any) => {
                const cfg = TRANSACTION_TYPE_CONFIG[tx.type as keyof typeof TRANSACTION_TYPE_CONFIG]
                const isOut = tx.type === 'STOCK_OUT' || tx.type === 'WASTAGE'
                return (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-gray-900 max-w-[140px]">
                      <p className="truncate">{tx.item.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10.5px] font-semibold', cfg.bg, cfg.text)}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[13px] font-semibold', isOut ? 'text-red-500' : 'text-green-600')}>
                        {isOut ? '−' : '+'}{tx.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-gray-500">
                      <span className="text-gray-400">{tx.balanceBefore}</span>
                      <span className="text-gray-300 mx-1">→</span>
                      <span className="font-semibold text-gray-700">{tx.balanceAfter}</span>
                    </td>
                    <td className="px-5 py-3 text-[11.5px] text-gray-500">{tx.performedBy.fullName.split(' ')[0]}</td>
                    <td className="px-5 py-3 text-[11px] text-gray-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
