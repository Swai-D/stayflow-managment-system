'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Room, RoomType, ROOM_TYPE_LABELS } from '@/types/room'
import { useCreateRoom, useUpdateRoom } from '@/hooks/useRooms'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Namba ya chumba inahitajika'),
  name: z.string().min(1, 'Jina la chumba linahitajika'),
  floor: z.coerce.number().min(1, 'Ghorofa inahitajika'),
  type: z.enum(['standard', 'deluxe', 'family', 'suite', 'presidential', 'superior', 'conference']),
  pricePerNight: z.coerce.number().min(0, 'Bei lazima iwe chanya'),
  pricePerHour: z.coerce.number().optional(),
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
      capacity: room.capacity,
      description: room.description || '',
      amenities: room.amenities.join(', ') as any,
    } : {
      floor: 1,
      type: 'standard',
      capacity: 2,
      pricePerNight: 0,
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
          toast.success('Chumba kimesasishwa')
          onClose()
        },
        onError: (err: any) => {
          toast.error(err.message || 'Imeshindwa kusasisha chumba')
        }
      })
    } else {
      createRoom(formattedData as any, {
        onSuccess: () => {
          toast.success('Chumba kimeundwa')
          onClose()
        },
        onError: (err: any) => {
          toast.error(err.message || 'Imeshindwa kuunda chumba')
        }
      })
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Hariri Chumba' : 'Ongeza Chumba Mpya'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5 thin-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Namba ya Chumba</Label>
              <Input
                id="roomNumber"
                placeholder="mf. 101"
                {...register('roomNumber')}
                className={errors.roomNumber ? 'border-red-500' : ''}
              />
              {errors.roomNumber && <p className="text-[11px] text-red-500">{errors.roomNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Jina la Chumba</Label>
              <Input
                id="name"
                placeholder="mf. Cottage Room"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-[11px] text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floor">Ghorofa</Label>
              <Input
                id="floor"
                type="number"
                {...register('floor')}
                className={errors.floor ? 'border-red-500' : ''}
              />
              {errors.floor && <p className="text-[11px] text-red-500">{errors.floor.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Aina ya Chumba</Label>
              <Select
                onValueChange={(val) => setValue('type', val as RoomType)}
                defaultValue={room?.type || 'standard'}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Chagua aina" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-[11px] text-red-500">{errors.type.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerNight">Bei kwa Usiku (TZS)</Label>
              <Input
                id="pricePerNight"
                type="number"
                {...register('pricePerNight')}
                className={errors.pricePerNight ? 'border-red-500' : ''}
              />
              {errors.pricePerNight && <p className="text-[11px] text-red-500">{errors.pricePerNight.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Uwezo (Watu)</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity')}
                className={errors.capacity ? 'border-red-500' : ''}
              />
              {errors.capacity && <p className="text-[11px] text-red-500">{errors.capacity.message}</p>}
            </div>
          </div>

          {selectedType === 'conference' && (
            <div className="space-y-2">
              <Label htmlFor="pricePerHour">Bei kwa Saa (TZS)</Label>
              <Input
                id="pricePerHour"
                type="number"
                {...register('pricePerHour')}
                className={errors.pricePerHour ? 'border-red-500' : ''}
              />
              {errors.pricePerHour && <p className="text-[11px] text-red-500">{errors.pricePerHour.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amenities">Vifaa (Amenities) - Tenganisha kwa mkato (,)</Label>
            <Input
              id="amenities"
              placeholder="mf. WiFi, AC, TV"
              {...register('amenities' as any)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Maelezo (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Maelezo zaidi kuhusu chumba..."
              {...register('description')}
              rows={3}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isPending}
          >
            Ghairi
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            className="flex-1 bg-primary hover:bg-primary/90 text-white"
            disabled={isPending}
          >
            {isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
            {isEditing ? 'Hifadhi Mabadiliko' : 'Unda Chumba'}
          </Button>
        </div>
      </div>
    </div>
  )
}
