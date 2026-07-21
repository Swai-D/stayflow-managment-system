'use client'

import { useState } from 'react'
import {
  useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook,
  useWebhookDeliveries, useDeveloperMetadata
} from '@/hooks/useDeveloper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Webhook, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function WebhooksPage() {
  const { data: webhooks = [], isLoading } = useWebhooks()
  const { data: metadata } = useDeveloperMetadata()
  const create = useCreateWebhook()
  const update = useUpdateWebhook()
  const remove = useDeleteWebhook()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['booking.created'])
  const [expanded, setExpanded] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return
    create.mutate({ name: name.trim(), url: url.trim(), events: selectedEvents, secret: secret || undefined }, {
      onSuccess: () => {
        setName('')
        setUrl('')
        setSecret('')
        setSelectedEvents(['booking.created'])
        toast.success('Webhook created')
      }
    })
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  return (
    <div className="space-y-5">
      {/* Create Webhook */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Plus size={15} className="text-[#8B4530]"/> Create Webhook
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Booking Sync" className="h-9 text-[12px]"/>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Endpoint URL</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/stayflow" className="h-9 text-[12px]"/>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Secret (optional, for HMAC signature)</label>
          <Input value={secret} onChange={e => setSecret(e.target.value)} placeholder="whsec_..." className="h-9 text-[12px]"/>
        </div>
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">Events</label>
          <div className="flex flex-wrap gap-2">
            {metadata?.events.map(event => (
              <button
                key={event}
                onClick={() => toggleEvent(event)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                  selectedEvents.includes(event)
                    ? 'bg-[#FBF1EA] border-[#8B4530] text-[#8B4530]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {event}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleCreate} disabled={create.isPending || !name.trim() || !url.trim()} size="sm" className="bg-[#8B4530] hover:bg-[#6E3323]">
          {create.isPending ? <Loader2 size={14} className="animate-spin"/> : <Webhook size={14}/>}
          Add Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">🔗 Configured Webhooks</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400"><Loader2 size={16} className="animate-spin inline"/> Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-[13px]">No webhooks yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {webhooks.map(wh => (
              <WebhookItem
                key={wh.id}
                webhook={wh}
                isExpanded={expanded === wh.id}
                onToggle={() => setExpanded(expanded === wh.id ? null : wh.id)}
                onToggleActive={() => update.mutate({ id: wh.id, data: { isActive: !wh.isActive } })}
                onDelete={() => remove.mutate(wh.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WebhookItem({ webhook, isExpanded, onToggle, onToggleActive, onDelete }: any) {
  const { data: deliveries = [], isLoading: deliveriesLoading } = useWebhookDeliveries(isExpanded ? webhook.id : '')

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-semibold text-gray-900">{webhook.name}</p>
            {webhook.isActive ? (
              <Badge className="bg-green-100 text-green-700 text-[10px] hover:bg-green-100">Active</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-mono mb-2 truncate">{webhook.url}</p>
          <div className="flex flex-wrap gap-1 mb-1">
            {webhook.events.map((e: string) => (
              <span key={e} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{e}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleActive} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title={webhook.isActive ? 'Deactivate' : 'Activate'}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
            <Trash2 size={15}/>
          </button>
          <button onClick={onToggle} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
            {isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-700 mb-2">Recent Deliveries</p>
          {deliveriesLoading ? (
            <Loader2 size={14} className="animate-spin text-gray-400"/>
          ) : deliveries.length === 0 ? (
            <p className="text-[11px] text-gray-400">No deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {deliveries.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      d.deliveredAt ? 'bg-green-500' : d.responseStatus ? 'bg-amber-500' : 'bg-red-500'
                    )}/>
                    <span className="text-gray-700">{d.event}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    {d.responseStatus && <span>HTTP {d.responseStatus}</span>}
                    {d.attemptCount > 1 && <span>{d.attemptCount} attempts</span>}
                    <span>{format(new Date(d.createdAt), 'dd MMM HH:mm')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
