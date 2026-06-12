'use client'

import { useState } from 'react'
import { useHotelSettings, useUpdateHotelSettings, useStaff, useCreateStaff, useDeleteStaff, useAuditLogs } from '@/hooks/useSettings'
import { format } from 'date-fns'
import { Building, Users, Activity, Save, Plus, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hotel')

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit">
        <TabButton active={activeTab === 'hotel'} onClick={() => setActiveTab('hotel')} icon={<Building size={16} />} label="Hotel Information" />
        <TabButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={16} />} label="Staff Management" />
        <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<Activity size={16} />} label="Audit Log" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'hotel' && <HotelSettings />}
        {activeTab === 'staff' && <StaffManagement />}
        {activeTab === 'audit' && <AuditLog />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
        active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function HotelSettings() {
  const { data: hotel, isLoading } = useHotelSettings()
  const { mutate: updateHotel, isPending } = useUpdateHotelSettings()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    updateHotel(Object.fromEntries(formData))
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse text-gray-400">Loading settings...</div>

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hotel Name</label>
          <input name="name" defaultValue={hotel?.name} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
          <input name="email" defaultValue={hotel?.email} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone</label>
          <input name="phone" defaultValue={hotel?.phone} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Default Language</label>
          <select name="defaultLanguage" defaultValue={hotel?.defaultLanguage} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm">
            <option value="sw">Swahili</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Address</label>
        <textarea name="address" defaultValue={hotel?.address} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm h-24" />
      </div>
      <button type="submit" disabled={isPending} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
        <Save size={18} /> {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

function StaffManagement() {
  const { data: staff, isLoading } = useStaff()
  const { mutate: createStaff } = useCreateStaff()
  const { mutate: deleteStaff } = useDeleteStaff()
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createStaff(Object.fromEntries(formData), { onSuccess: () => setIsAdding(false) })
  }

  return (
    <div className="p-0">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Manage Staff</h3>
        <button onClick={() => setIsAdding(true)} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
          <Plus size={16} /> Add Member
        </button>
      </div>
      
      {isAdding && (
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3 items-end">
            <div className="space-y-1 col-span-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">Full Name</label>
              <input name="fullName" required className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="space-y-1 col-span-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">Email</label>
              <input name="email" type="email" required className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs" />
            </div>
            <div className="space-y-1 col-span-1">
              <label className="text-[10px] font-bold text-blue-600 uppercase">Role</label>
              <select name="role" className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs">
                <option value="receptionist">Receptionist</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Save</button>
              <button type="button" onClick={() => setIsAdding(false)} className="text-gray-500 text-xs font-bold">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last Login</th>
            <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {staff?.map((u: any) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {u.fullName.split(' ').map((n:any)=>n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{u.fullName}</p>
                    <p className="text-[11px] text-gray-400">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-[13px] text-gray-600 capitalize">{u.role}</td>
              <td className="px-6 py-4 text-[13px] text-gray-500">{u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd MMM, HH:mm') : 'Never'}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => deleteStaff(u.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AuditLog() {
  const { data: logs } = useAuditLogs()

  return (
    <div className="p-0">
       <div className="p-6 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">System Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs?.map((log: any) => (
              <tr key={log.id} className="text-[13px]">
                <td className="px-6 py-4 text-gray-500">{format(new Date(log.createdAt), 'dd MMM, HH:mm:ss')}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{log.user?.fullName || 'System'}</td>
                <td className="px-6 py-4 font-mono text-[11px] text-blue-600 uppercase">{log.action}</td>
                <td className="px-6 py-4 text-gray-600">{log.entity} <span className="text-gray-400 text-[10px] ml-1">#{log.entityId?.slice(0, 8)}</span></td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={4} className="py-20 text-center text-gray-400">No activity logged yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
