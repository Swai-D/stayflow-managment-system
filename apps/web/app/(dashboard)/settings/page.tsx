'use client'

import { useState } from 'react'
import { 
  useHotelSettings, 
  useUpdateHotelSettings, 
  useStaff, 
  useCreateStaff, 
  useDeleteStaff, 
  useAuditLogs 
} from '@/hooks/useSettings'
import { format } from 'date-fns'
import { 
  Building, Users, Activity, Save, Plus, Trash2, X,
  Shield, CreditCard, Bell, Globe, Clock, 
  Lock, Camera, Mail, Phone, MapPin, 
  ChevronRight, Search, Filter, Loader2,
  AlertCircle, CheckCircle2, Zap, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SettingsTab = 'hotel' | 'staff' | 'finance' | 'booking' | 'audit'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('hotel')

  const tabs: { id: SettingsTab; label: string; icon: any; desc: string }[] = [
    { id: 'hotel',   label: 'Hotel Profile',   icon: Building,   desc: 'Identity, contacts & branding' },
    { id: 'staff',   label: 'Staff & Roles',    icon: Users,      desc: 'Manage team access levels' },
    { id: 'finance', label: 'Financial Setup',  icon: CreditCard,  desc: 'Taxes, currency & EFD rules' },
    { id: 'booking', label: 'Booking Policy',  icon: Clock,       desc: 'Check-in/out & late rules' },
    { id: 'audit',   label: 'Security Logs',    icon: Activity,    desc: 'Full system audit trail' },
  ]

  return (
    <div className="space-y-6 font-sans text-left pb-10">
      
      {/* Header */}
      <div className="px-1">
        <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">System Settings</h1>
        <p className="text-[13px] text-[#9ca3af] font-medium mt-0.5">Control center for StayFlow application powerhouse</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* ── Left Sidebar Navigation ─────────────────────── */}
        <div className="w-full lg:w-72 space-y-2">
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "w-full p-4 rounded-2xl transition-all text-left flex items-start gap-4 group border border-transparent",
                 activeTab === tab.id 
                   ? "bg-white shadow-md border-gray-100 ring-4 ring-blue-50/50" 
                   : "hover:bg-white/50 text-[#6b7280]"
               )}
             >
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                 activeTab === tab.id ? "bg-[#2563eb] text-white" : "bg-gray-100 text-[#9ca3af] group-hover:bg-blue-50 group-hover:text-blue-600"
               )}>
                  <tab.icon size={20} />
               </div>
               <div className="overflow-hidden">
                  <p className={cn(
                    "text-[14px] font-bold transition-colors",
                    activeTab === tab.id ? "text-[#111827]" : "text-[#6b7280]"
                  )}>{tab.label}</p>
                  <p className="text-[11px] text-[#9ca3af] font-medium truncate">{tab.desc}</p>
               </div>
               {activeTab === tab.id && <ChevronRight className="ml-auto text-[#2563eb]" size={16} />}
             </button>
           ))}

           <div className="mt-10 p-6 bg-gradient-to-br from-[#1a2b4a] to-[#2563eb] rounded-[24px] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Shield size={60} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-2">Admin Power</p>
              <p className="text-[13px] font-medium leading-relaxed mb-4">You have full administrative privileges for G4 Homez.</p>
              <button className="text-[11px] font-bold flex items-center gap-1 hover:underline">
                 Security Center <ChevronRight size={12} />
              </button>
           </div>
        </div>

        {/* ── Main Content Area ───────────────────────────── */}
        <div className="flex-1 min-w-0">
           <div className="bg-white rounded-[32px] shadow-card border border-gray-50 min-h-[600px] overflow-hidden">
              {activeTab === 'hotel'   && <HotelSettingsView />}
              {activeTab === 'staff'   && <StaffManagementView />}
              {activeTab === 'finance' && <FinancialSettingsView />}
              {activeTab === 'booking' && <BookingPolicyView />}
              {activeTab === 'audit'   && <AuditLogView />}
           </div>
        </div>

      </div>
    </div>
  )
}

// ─── 1. Hotel Settings ──────────────────────────────
function HotelSettingsView() {
  const { data: hotel, isLoading } = useHotelSettings()
  const { mutate: updateHotel, isPending } = useUpdateHotelSettings()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    updateHotel(Object.fromEntries(formData), {
      onSuccess: () => toast.success('Hotel profile updated successfully')
    })
  }

  if (isLoading) return <LoadingPlaceholder />

  return (
    <div className="p-8 md:p-12 animate-in fade-in duration-500">
      <div className="mb-10">
         <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">Hotel Profile</h2>
         <p className="text-[13px] text-[#9ca3af] font-medium">Manage your public identity and branding details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Branding */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
           <div className="w-32 h-32 rounded-3xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group cursor-pointer hover:bg-gray-100 transition-colors shrink-0">
              <Camera size={24} className="text-[#9ca3af]" />
              <span className="text-[10px] font-bold text-[#9ca3af] uppercase">Logo</span>
           </div>
           <div className="flex-1 space-y-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormInput label="Official Hotel Name" name="name" defaultValue={hotel?.name} icon={Building} />
                 <FormInput label="Support Email" name="email" defaultValue={hotel?.email} icon={Mail} />
              </div>
           </div>
        </div>

        {/* Contact & Location */}
        <div className="space-y-6 pt-6 border-t border-gray-50">
           <h3 className="text-[11px] font-bold text-[#2563eb] uppercase tracking-[0.2em] flex items-center gap-2">
              <MapPin size={14} /> Contacts & Location
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput label="Phone Number" name="phone" defaultValue={hotel?.phone} icon={Phone} />
              <FormSelect label="Default Language" name="defaultLanguage" defaultValue={hotel?.defaultLanguage}>
                 <option value="sw">Kiswahili (Official)</option>
                 <option value="en">English (Universal)</option>
              </FormSelect>
           </div>
           <div className="space-y-2">
              <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Physical Address</label>
              <textarea 
                name="address" 
                defaultValue={hotel?.address}
                rows={3}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all resize-none"
              />
           </div>
        </div>

        <div className="pt-6">
           <button 
             type="submit" 
             disabled={isPending}
             className="h-14 px-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[20px] font-bold text-[14px] flex items-center gap-2 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
           >
             {isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
             Hifadhi Mabadiliko
           </button>
        </div>
      </form>
    </div>
  )
}

// ─── 2. Staff Management ───────────────────────────
function StaffManagementView() {
  const { data: staff, isLoading } = useStaff()
  const { mutate: createStaff, isPending: isCreating } = useCreateStaff()
  const { mutate: deleteStaff } = useDeleteStaff()
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createStaff(Object.fromEntries(formData), { 
      onSuccess: () => {
        toast.success('Staff member invited successfully')
        setIsAdding(false)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Je, una uhakika unataka kuondoa ufikiaji kwa ${name}?`)) {
      deleteStaff(id, { onSuccess: () => toast.success('Staff removed') })
    }
  }

  if (isLoading) return <LoadingPlaceholder />

  return (
    <div className="p-0 animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]/50">
        <div>
           <h2 className="text-[18px] font-bold text-[#111827] tracking-tight leading-none">Manage Team</h2>
           <p className="text-[12px] text-[#9ca3af] font-medium mt-1">Hapa unaweza kuongeza na kusimamia ufikiaji wa staff</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "h-10 px-4 rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all shadow-sm border",
            isAdding ? "bg-white text-gray-500 border-gray-200" : "bg-[#2563eb] text-white border-blue-500 shadow-blue-100"
          )}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancel' : 'Invite Staff'}
        </button>
      </div>

      {isAdding && (
        <div className="p-8 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top duration-300">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1"><FormInput label="Full Name" name="fullName" required placeholder="mf. Bakari Salum" /></div>
            <div className="md:col-span-1"><FormInput label="Email Address" name="email" type="email" required placeholder="name@g4homez.com" /></div>
            <div className="md:col-span-1">
               <FormSelect label="Assigned Role" name="role">
                  <option value="receptionist">Receptionist</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="admin">System Admin</option>
               </FormSelect>
            </div>
            <button type="submit" disabled={isCreating} className="h-12 bg-[#2563eb] text-white rounded-2xl font-bold text-[13px] hover:bg-[#1d4ed8] shadow-md shadow-blue-100">
               {isCreating ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Team Member</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Role</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Last Login</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff?.map((u: any) => (
              <tr key={u.id} className="group hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[13px] font-bold text-[#2563eb]">
                      {u.fullName.split(' ').map((n:any)=>n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#111827]">{u.fullName}</p>
                      <p className="text-[11px] text-[#9ca3af] font-medium">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <div className={cn(
                     "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                     u.role === 'admin' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-gray-50 text-[#6b7280] border-gray-100"
                   )}>
                      {u.role === 'admin' && <Shield size={12} />}
                      {u.role}
                   </div>
                </td>
                <td className="px-8 py-5 text-[13px] font-medium text-[#6b7280]">
                   {u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd MMM, HH:mm') : 'Never connected'}
                </td>
                <td className="px-8 py-5 text-right">
                   <button 
                     onClick={() => handleDelete(u.id, u.fullName)} 
                     className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9ca3af] hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                   >
                      <Trash2 size={16} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── 3. Financial Settings ─────────────────────────
function FinancialSettingsView() {
  return (
    <div className="p-8 md:p-12 animate-in fade-in duration-500">
      <div className="mb-10">
         <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">Financial Configuration</h2>
         <p className="text-[13px] text-[#9ca3af] font-medium">Currency, taxes and EFD synchronization rules</p>
      </div>

      <div className="space-y-10 max-w-2xl">
         <div className="grid grid-cols-2 gap-6">
            <FormSelect label="Primary Currency" defaultValue="TZS">
               <option value="TZS">TZS - Tanzanian Shilling</option>
               <option value="USD">USD - US Dollar</option>
            </FormSelect>
            <FormInput label="Service Tax (%)" defaultValue="18" />
         </div>

         <div className="space-y-4 pt-6 border-t border-gray-50">
            <h3 className="text-[11px] font-bold text-[#2563eb] uppercase tracking-[0.2em] flex items-center gap-2">
               <Shield size={14} /> EFD & Compliance
            </h3>
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                  <Zap size={20} />
               </div>
               <div>
                  <p className="text-sm font-bold text-amber-900">EFD Virtual Machine Connected</p>
                  <p className="text-[12px] text-amber-800 font-medium leading-relaxed opacity-80 mt-1">
                     Your system is currently synchronized with TRA Z-Reports. All receipts issued are legally valid.
                  </p>
               </div>
            </div>
         </div>

         <button className="h-14 px-10 bg-[#111827] text-white rounded-[20px] font-bold text-[14px] hover:bg-black transition-all">
            Hifadhi Mipangilio
         </button>
      </div>
    </div>
  )
}

// ─── 4. Booking Policy ─────────────────────────────
function BookingPolicyView() {
  return (
    <div className="p-8 md:p-12 animate-in fade-in duration-500">
      <div className="mb-10">
         <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">Booking Policy</h2>
         <p className="text-[13px] text-[#9ca3af] font-medium">Operational rules for check-in and room assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
         <div className="space-y-6">
            <h3 className="text-[11px] font-bold text-[#2563eb] uppercase tracking-[0.2em]">Check-in Rules</h3>
            <FormInput label="Standard Check-in Time" defaultValue="14:00" icon={Clock} />
            <FormInput label="Standard Check-out Time" defaultValue="11:00" icon={Clock} />
         </div>
         <div className="space-y-6">
            <h3 className="text-[11px] font-bold text-[#2563eb] uppercase tracking-[0.2em]">Cancellation</h3>
            <FormSelect label="Grace Period (Hours)" defaultValue="24">
               <option value="12">12 Hours before</option>
               <option value="24">24 Hours before</option>
               <option value="48">48 Hours before</option>
            </FormSelect>
            <div className="p-5 bg-gray-50 rounded-[24px] border border-gray-100 flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                  <Info size={20} />
               </div>
               <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
                  Policies defined here will be visible on the Guest Portal during the self-booking process.
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}

// ─── 5. Audit Log ──────────────────────────────────
function AuditLogView() {
  const { data: logs } = useAuditLogs()

  return (
    <div className="p-0 animate-in fade-in duration-500">
       <div className="p-8 border-b border-gray-100 bg-[#f8fafc]/50">
        <h2 className="text-[18px] font-bold text-[#111827] tracking-tight leading-none">Security & System Logs</h2>
        <p className="text-[12px] text-[#9ca3af] font-medium mt-1">Kumbukumbu zote za kila hatua iliyofanyika kwenye mfumo</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Time & Context</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Authorized User</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Action Performed</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] border-b border-gray-50">Entity Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs?.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-5">
                   <p className="text-[13px] font-bold text-[#111827]">{format(new Date(log.createdAt), 'dd MMM, HH:mm:ss')}</p>
                   <p className="text-[10px] text-[#9ca3af] font-medium uppercase">SYSTEM LOG</p>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                     <div className="w-7 h-7 rounded-full bg-blue-50 text-[10px] font-bold text-[#2563eb] flex items-center justify-center border border-blue-100">
                        {(log.user?.fullName || 'SY')[0]}
                     </div>
                     <span className="text-[13px] font-bold text-gray-700">{log.user?.fullName || 'Automated System'}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <span className="font-mono text-[11px] font-bold text-[#2563eb] px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100 uppercase tracking-tighter">
                      {log.action}
                   </span>
                </td>
                <td className="px-8 py-5">
                   <p className="text-[13px] font-bold text-[#111827]">{log.entity}</p>
                   <p className="text-[10px] text-[#9ca3af] font-medium">#{log.entityId?.slice(0, 8).toUpperCase()}</p>
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={4} className="py-20 text-center"><p className="text-[#9ca3af] font-bold italic">No system activity captured yet.</p></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Shared Components ───────────────────────────────

function FormInput({ label, icon: Icon, className, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
         <input
           {...props}
           className={cn(
             "w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all placeholder:text-[#9ca3af]/60",
             Icon && "pl-11",
             className
           )}
         />
         {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />}
      </div>
    </div>
  )
}

function FormSelect({ label, children, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">{label}</label>
      <select
        {...props}
        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-5 text-sm font-bold text-[#111827] outline-none cursor-pointer appearance-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all"
      >
        {children}
      </select>
    </div>
  )
}

function LoadingPlaceholder() {
  return (
    <div className="p-12 space-y-10 animate-pulse">
       <div className="h-10 bg-gray-50 rounded-xl w-48" />
       <div className="grid grid-cols-2 gap-8">
          <div className="h-14 bg-gray-50 rounded-2xl" />
          <div className="h-14 bg-gray-50 rounded-2xl" />
          <div className="h-14 bg-gray-50 rounded-2xl" />
          <div className="h-14 bg-gray-50 rounded-2xl" />
       </div>
    </div>
  )
}
