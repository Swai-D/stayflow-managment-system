import { Loader2 } from 'lucide-react'

export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="relative">
        <div className="absolute inset-0 gradient-primary rounded-full opacity-20 blur-lg animate-pulse" />
        <Loader2 size={32} className="relative text-primary animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  )
}
