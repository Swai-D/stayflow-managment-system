'use client'

import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isPending = false,
  variant = 'danger'
}: Props) {
  if (!isOpen) return null

  const colors = {
    danger: {
      icon: 'bg-red-50 text-red-600',
      btn: 'bg-red-600 hover:bg-red-700 shadow-red-100',
      ring: 'ring-red-50'
    },
    warning: {
      icon: 'bg-amber-50 text-amber-600',
      btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
      ring: 'ring-amber-50'
    },
    info: {
      icon: 'bg-blue-50 text-blue-600',
      btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
      ring: 'ring-blue-50'
    }
  }

  const c = colors[variant]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-sm bg-[#111827]/40 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative bg-white rounded-[32px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
        
        <div className={cn("w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6", c.icon)}>
           <AlertTriangle size={32} />
        </div>

        <h3 className="text-xl font-bold text-[#111827] tracking-tight mb-2">{title}</h3>
        <p className="text-[14px] text-[#9ca3af] font-medium leading-relaxed mb-8">
          {description}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-12 border border-gray-100 text-[#6b7280] rounded-2xl font-bold text-[13px] hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex-[1.5] h-12 text-white rounded-2xl font-bold text-[13px] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70",
              c.btn
            )}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
