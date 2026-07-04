'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, Settings, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useAiStatus, useAiChat, type ChatMessage } from '@/hooks/useAI'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AIChatDrawer() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Habari! Mimi ni Buffalo, AI assistant wako wa hoteli. Unaweza kuniuliza maswalo kuhusu hoteli, bookings, staff, au msaada wowote.' }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: status, isLoading: loadingSettings } = useAiStatus()
  const { mutate: sendMessage, isPending } = useAiChat()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isPending) return

    if (!status?.enabled) {
      toast.error('Buffalo haijawashwa. Tafadhali wasiliana na admin.')
      return
    }

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')

    sendMessage(
      { messages: updatedMessages },
      {
        onSuccess: (reply) => {
          setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        },
        onError: (err: any) => {
          const message = err.response?.data?.error?.message || 'Imeshindwa kupata jibu'
          toast.error(message)
          setMessages(prev => [...prev, { role: 'assistant', content: `Samahani, ${message}` }])
        }
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="relative w-[34px] h-[34px] flex items-center justify-center bg-white border border-[#e5e7eb] rounded-lg text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
        title="Buffalo AI Assistant"
      >
        <Sparkles size={16} />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col" showCloseButton={false}>
        <SheetHeader className="px-4 py-3 border-b border-[#f3f4f6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <Bot size={16} />
              </div>
              <div>
                <SheetTitle className="text-[15px] font-bold text-[#111827]">Buffalo</SheetTitle>
                <p className="text-[11px] text-[#9ca3af]">
                  {loadingSettings ? 'Inapakia...' : status?.enabled ? `Powered by ${status.provider}` : 'Haijawashwa'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/settings?tab=ai" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="icon-sm" className="text-[#6b7280] h-8 w-8" title="AI Settings">
                  <Settings size={15} />
                </Button>
              </Link>
              <Button variant="ghost" size="icon-sm" className="text-[#6b7280] h-8 w-8" onClick={() => setOpen(false)} title="Close">
                <X size={15} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
          {loadingSettings ? (
            <div className="flex items-center justify-center h-full text-[#9ca3af]">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-[12px]">Inapakia...</span>
            </div>
          ) : (
            <>
              {!status?.enabled && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-amber-800">Buffalo haijawashwa</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Admin anaweza kumwasha katika <Link href="/settings?tab=ai" onClick={() => setOpen(false)} className="underline">Settings &gt; AI</Link>
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                      msg.role === 'user' ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#e5e7eb] text-[#2563EB]'
                    )}
                  >
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white rounded-br-md'
                        : 'bg-white border border-[#e5e7eb] text-[#374151] rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-white border border-[#e5e7eb] text-[#2563EB] flex items-center justify-center flex-shrink-0">
                    <Bot size={13} />
                  </div>
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#9ca3af]" />
                    <span className="text-[12px] text-[#9ca3af]">AI inafikiria...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-[#f3f4f6]">
          <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#dbeafe]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status?.enabled ? 'Andika ujumbe wako...' : 'Andika ujumbe... (AI haijawashwa)'}
              disabled={isPending}
              className="flex-1 bg-transparent text-[13px] text-[#374151] placeholder:text-[#9ca3af] outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending || loadingSettings || !status?.enabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2563EB] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1d4ed8] transition-colors"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-[#9ca3af] mt-2 text-center">
            AI inaweza kukosea. Thibitisha taarifa muhimu.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}
