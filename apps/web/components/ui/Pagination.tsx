'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  showing?: number
  total?: number
}

export default function Pagination({ page, totalPages, onPageChange, showing, total }: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
      {showing !== undefined && total !== undefined && (
        <p className="text-[11px] text-gray-400 font-medium">
          Showing {showing} of {total} results
        </p>
      )}
      <div className={cn('flex items-center gap-2', (showing === undefined || total === undefined) && 'ml-auto')}>
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-40 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px] text-gray-600 font-semibold min-w-[3ch] text-center">
          {page} / {totalPages || 1}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-40 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
