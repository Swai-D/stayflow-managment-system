'use client'

import { useState } from 'react'
import { useApiLogs } from '@/hooks/useDeveloper'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function ApiLogsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useApiLogs(page, 50)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
          <Activity size={15} className="text-[#8B4530]"/> API Request Logs
        </h2>
        {data?.meta && (
          <p className="text-[11px] text-gray-500">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400"><Loader2 size={16} className="animate-spin inline"/> Loading...</div>
      ) : data?.logs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-[13px]">No API requests logged yet.</div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {data?.logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono w-[55px] justify-center',
                      log.method === 'GET' && 'border-blue-200 text-blue-600',
                      log.method === 'POST' && 'border-green-200 text-green-600',
                      log.method === 'PUT' && 'border-amber-200 text-amber-600',
                      log.method === 'DELETE' && 'border-red-200 text-red-600',
                    )}
                  >
                    {log.method}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{log.path}</p>
                    <p className="text-[10px] text-gray-400">
                      {log.apiKey ? `${log.apiKey.name} (${log.apiKey.keyPrefix}•••)` : 'Unknown key'} · {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right flex-shrink-0">
                  <Badge
                    className={cn(
                      'text-[10px]',
                      log.statusCode && log.statusCode >= 200 && log.statusCode < 300 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                      log.statusCode && log.statusCode >= 400 ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                      'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {log.statusCode || '—'}
                  </Badge>
                  {log.durationMs !== undefined && (
                    <span className="text-[10px] text-gray-500 w-[50px]">{log.durationMs}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data?.meta.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-[12px] font-medium text-gray-600 disabled:text-gray-300 hover:text-gray-900"
              >
                <ChevronLeft size={14}/> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data?.meta.totalPages || 1, p + 1))}
                disabled={!data || page === data.meta.totalPages}
                className="flex items-center gap-1 text-[12px] font-medium text-gray-600 disabled:text-gray-300 hover:text-gray-900"
              >
                Next <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
