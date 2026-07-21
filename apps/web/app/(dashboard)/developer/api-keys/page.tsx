'use client'

import { useState } from 'react'
import {
  useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey,
  useDeveloperMetadata
} from '@/hooks/useDeveloper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, KeyRound, Loader2, Plus, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function ApiKeysPage() {
  const { data: keys = [], isLoading } = useApiKeys()
  const { data: metadata } = useDeveloperMetadata()
  const create = useCreateApiKey()
  const revoke = useRevokeApiKey()
  const remove = useDeleteApiKey()

  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['bookings:read'])
  const [expiresInDays, setExpiresInDays] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim() || selectedScopes.length === 0) return
    create.mutate({
      name: name.trim(),
      scopes: selectedScopes,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined
    }, {
      onSuccess: (data) => {
        setNewKey(data.key)
        setName('')
        setSelectedScopes(['bookings:read'])
        setExpiresInDays('')
        toast.success('API key created. Copy it now — it will not be shown again.')
      }
    })
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  return (
    <div className="space-y-5">
      {/* Create Key Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Plus size={15} className="text-[#8B4530]"/> Create API Key
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Key Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production Booking Sync"
              className="h-9 text-[12px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Expires In (days, optional)</label>
            <Input
              type="number"
              value={expiresInDays}
              onChange={e => setExpiresInDays(e.target.value)}
              placeholder="Never"
              className="h-9 text-[12px]"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Scopes</label>
          <div className="flex flex-wrap gap-2">
            {metadata?.scopes.map(scope => (
              <button
                key={scope}
                onClick={() => toggleScope(scope)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                  selectedScopes.includes(scope)
                    ? 'bg-[#FBF1EA] border-[#8B4530] text-[#8B4530]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={handleCreate}
          disabled={create.isPending || !name.trim() || selectedScopes.length === 0}
          size="sm"
          className="bg-[#8B4530] hover:bg-[#6E3323]"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin"/> : <KeyRound size={14}/>}
          Generate Key
        </Button>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] font-bold text-amber-800">Copy this key now</p>
            <button onClick={() => setNewKey(null)} className="text-amber-600 hover:text-amber-800">
              <XCircle size={16}/>
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
            <code className="text-[12px] font-mono text-gray-800 flex-1 break-all">{newKey}</code>
            <button onClick={() => copy(newKey)} className="text-[#8B4530] hover:text-[#6E3323]">
              <Copy size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">Active Keys</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin"/> Loading...
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-[13px]">No API keys yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map(key => (
              <div key={key.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-gray-900">{key.name}</p>
                    {!key.isActive && (
                      <Badge variant="secondary" className="text-[10px]">Revoked</Badge>
                    )}
                    {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                      <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono mb-2">{key.keyPrefix}••••••••</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {key.scopes.map((scope: string) => (
                      <span key={scope} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Created {format(new Date(key.createdAt), 'dd MMM yyyy')}
                    {key.lastUsedAt && ` · Last used ${format(new Date(key.lastUsedAt), 'dd MMM yyyy HH:mm')}`}
                    {key.expiresAt && ` · Expires ${format(new Date(key.expiresAt), 'dd MMM yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {key.isActive && (
                    <button
                      onClick={() => revoke.mutate(key.id)}
                      disabled={revoke.isPending}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Revoke"
                    >
                      <XCircle size={15}/>
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(key.id)}
                    disabled={remove.isPending}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
