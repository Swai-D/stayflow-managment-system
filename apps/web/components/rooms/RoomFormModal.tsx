'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Room, RoomType, ROOM_TYPE_LABELS } from '@/types/room'
import { useCreateRoom, useUpdateRoom } from '@/hooks/useRooms'
import { X, Loader2, Home, Tag, Banknote, Users, Info, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Namba ya chumba inahitajika'),
  name: z.string().min(1, 'Jina la chumba linahitajika'),
  floor: z.coerce.number().min(1, 'Ghorofa inahitajika'),
  type: z.enum(['standard', 'deluxe', 'family', 'suite', 'presidential', 'superior', 'conference', 'twin', 'triple']),
  pricePerNight: z.coerce.number().min(0, 'Bei lazima iwe chanya'),
  pricePerHour: z.coerce.number().optional(),
  specialRate: z.coerce.number().optional(),
  fullBoardRate: z.coerce.number().optional(),
  nonResidentRate: z.string().optional(),
  beds: z.coerce.number().min(1, 'Vitanda lazima viwe angalau 1'),
  capacity: z.coerce.number().min(1, 'Uwezo lazima uwe angalau mtu 1'),
  description: z.string().optional(),
  amenities: z.string().min(1, 'Vifaa vinahitajika'),
})

type RoomFormValues = z.infer<typeof roomSchema>

interface Props {
  room?: Room | null
  onClose: () => void
}

export default function RoomFormModal({ room, onClose }: Props) {
  const isEditing = !!room
  const { mutate: createRoom, isPending: isCreating } = useCreateRoom()
  const { mutate: updateRoom, isPending: isUpdating } = useUpdateRoom()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema) as any,
    defaultValues: room ? {
      roomNumber: room.roomNumber,
      name: room.name,
      floor: room.floor,
      type: room.type,
      pricePerNight: room.pricePerNight,
      pricePerHour: room.pricePerHour,
      specialRate: room.specialRate,
      fullBoardRate: room.fullBoardRate,
      nonResidentRate: room.nonResidentRate,
      beds: room.beds,
      capacity: room.capacity,
      description: room.description || '',
      amenities: room.amenities.join(', '),
    } : {
      floor: 1,
      type: 'standard',
      beds: 1,
      capacity: 2,
      pricePerNight: 0,
      amenities: 'WiFi, AC, TV',
    }
  })

  const selectedType = watch('type')

  const onSubmit = (data: RoomFormValues) => {
    const formattedData = {
      ...data,
      amenities: data.amenities.split(',').map(s => s.trim()).filter(Boolean)
    }

    if (isEditing && room) {
      updateRoom({ id: room.id, ...formattedData }, {
        onSuccess: () => {
          toast.success('Chumba kimesasishwa kikamilifu')
          onClose()
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error?.message || 'Imeshindwa kusasisha chumba')
        }
      })
    } else {
      createRoom(formattedData as any, {
        onSuccess: () => {
          toast.success('Chumba kipya kimeundwa tayari')
          onClose()
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error?.message || 'Imeshindwa kuunda chumba')
        }
      })
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-[#111827]/40 animate-in fade-in duration-300">
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header - Template Style */}
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#8b4530] flex items-center justify-center">
                  {isEditing ? <Sparkles size={18} /> : <PlusIcon size={18} />}
               </span>
               <h2 className="text-[22px] font-bold text-[#111827] tracking-tight">
                  {isEditing ? 'Hariri Profaili ya Chumba' : 'Sajili Chumba Kipya'}
               </h2>
            </div>
            <p className="text-[13px] text-[#9ca3af] font-medium">Jaza taarifa sahihi za chumba kulingana na muundo wa hoteli</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-[#9ca3af] hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-8 space-y-8 font-sans text-left thin-scrollbar">
          
          {/* Section: Basic Identity */}
          <div className="space-y-5">
             <h3 className="text-[11px] font-bold text-[#8b4530] uppercase tracking-[0.2em] flex items-center gap-2">
                <Home size={14} /> Basic Identity
             </h3>
             <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Room Number</label>
                  <input
                    {...register('roomNumber')}
                    placeholder="e.g. 101"
                    className={cn(
                      "w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all placeholder:text-[#9ca3af]/60",
                      errors.roomNumber && "border-red-200 bg-red-50/30"
                    )}
                  />
                  {errors.roomNumber && <p className="text-[11px] text-red-500 font-bold ml-1">{errors.roomNumber.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Floor Level</label>
                  <input
                    type="number"
                    {...register('floor')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Internal Name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Executive Mountain View"
                  className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                />
             </div>
          </div>

          {/* Section: Category & Capacity */}
          <div className="space-y-5">
             <h3 className="text-[11px] font-bold text-[#8b4530] uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={14} /> Category & Limits
             </h3>
             <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Room Category</label>
                  <select
                    {...register('type')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all cursor-pointer appearance-none"
                  >
                    {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Max Guests</label>
                  <div className="relative">
                     <input
                       type="number"
                       {...register('capacity')}
                       className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                     />
                     <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">No. of Beds</label>
                  <input
                    type="number"
                    {...register('beds')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>
             </div>
          </div>

          {/* Section: Pricing */}
          <div className="space-y-5">
             <h3 className="text-[11px] font-bold text-[#8b4530] uppercase tracking-[0.2em] flex items-center gap-2">
                <Banknote size={14} /> Financial Configuration
             </h3>
             <div className={cn("grid gap-5", selectedType === 'conference' ? "grid-cols-2" : "grid-cols-1")}>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Rate per Night (TZS)</label>
                  <input
                    type="number"
                    {...register('pricePerNight')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Special / STO Rate (TZS)</label>
                  <input
                    type="number"
                    {...register('specialRate')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Full Board Rate (TZS)</label>
                  <input
                    type="number"
                    {...register('fullBoardRate')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Non-Resident Rate</label>
                  <input
                    {...register('nonResidentRate')}
                    placeholder="e.g. 30USD"
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all placeholder:text-[#9ca3af]/60"
                  />
                </div>
             </div>

             {selectedType === 'conference' && (
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Hourly Rate (TZS)</label>
                  <input
                    type="number"
                    {...register('pricePerHour')}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all"
                  />
                </div>
             )}
          </div>

          {/* Section: Amenities & Details */}
          <div className="space-y-5">
             <h3 className="text-[11px] font-bold text-[#8b4530] uppercase tracking-[0.2em] flex items-center gap-2">
                <Info size={14} /> Features & Descriptions
             </h3>
             <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Amenities (Comma separated)</label>
                <textarea
                  {...register('amenities')}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all resize-none"
                  placeholder="WiFi, AC, Smart TV, Mini Bar..."
                />
             </div>

             <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider ml-1">Additional Details</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#8b4530] transition-all resize-none"
                  placeholder="Eleza sifa za kipekee za chumba hiki..."
                />
             </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-14 border border-gray-200 text-[#6b7280] rounded-[20px] font-bold text-[14px] hover:bg-white transition-all disabled:opacity-50"
          >
            Ghairi
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            className="flex-[2] h-14 bg-[#8B4530] hover:bg-[#6E3323] text-white rounded-[20px] font-bold text-[14px] transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isPending ? (
               <Loader2 size={20} className="animate-spin" />
            ) : (
               isEditing ? 'Sasisha Taarifa' : 'Kamilisha Usajili'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
