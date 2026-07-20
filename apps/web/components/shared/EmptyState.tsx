import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  emoji?: string
}

export const EmptyState = ({ title = 'No data found', description = 'There is nothing to show here yet.', emoji = '📭' }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 text-2xl">
        <span aria-hidden="true">{emoji}</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-[260px]">{description}</p>
    </div>
  )
}