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
        className="relative w-[34px] h-[34px] flex items-center justify-center bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-lg text-[#8B4530] hover:bg-[#FBF1EA] dark:hover:bg-blue-900/20 transition-colors"
        title="Buffalo AI Assistant"
      >
        <Sparkles size={16} />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-[#1f2937] border-l border-[#e5e7eb] dark:border-gray-700" showCloseButton={false}>
        <SheetHeader className="px-4 py-3 border-b border-[#f3f4f6] dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FBF1EA] flex items-center justify-center text-[#8B4530]">
                <Bot size={16} />
              </div>
              <div>
                <SheetTitle className="text-[15px] font-bold text-[#111827] dark:text-gray-100">Buffalo</SheetTitle>
                <p className="text-[11px] text-[#9ca3af] dark:text-gray-400">
                  {loadingSettings ? 'Inapakia...' : status?.enabled ? `Powered by ${status.provider}` : 'Haijawashwa'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/settings?tab=ai" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="icon-sm" className="text-[#6b7280] dark:text-gray-400 h-8 w-8" title="AI Settings">
                  <Settings size={15} />
                </Button>
              </Link>
              <Button variant="ghost" size="icon-sm" className="text-[#6b7280] dark:text-gray-400 h-8 w-8" onClick={() => setOpen(false)} title="Close">
                <X size={15} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] dark:bg-[#111827]">
          {loadingSettings ? (
            <div className="flex items-center justify-center h-full text-[#9ca3af] dark:text-gray-500">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-[12px]">Inapakia...</span>
            </div>
          ) : (
            <>
              {!status?.enabled && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-amber-800 dark:text-amber-300">Buffalo haijawashwa</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
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
                      msg.role === 'user' ? 'bg-[#8B4530] text-white' : 'bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 text-[#8B4530] dark:text-blue-300'
                    )}
                  >
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[#8B4530] text-white rounded-br-md'
                        : 'bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 text-[#374151] dark:text-gray-200 rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 text-[#8B4530] dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                    <Bot size={13} />
                  </div>
                  <div className="bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#9ca3af] dark:text-gray-500" />
                    <span className="text-[12px] text-[#9ca3af] dark:text-gray-400">AI inafikiria...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-[#1f2937] border-t border-[#f3f4f6] dark:border-gray-700">
          <div className="flex items-center gap-2 bg-[#f8f9fa] dark:bg-[#111827] border border-[#e5e7eb] dark:border-gray-700 rounded-xl px-3 py-2 focus-within:border-[#8B4530] focus-within:ring-2 focus-within:ring-[#f5dfce] dark:focus-within:ring-blue-900/40">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status?.enabled ? 'Andika ujumbe wako...' : 'Andika ujumbe... (AI haijawashwa)'}
              disabled={isPending}
              className="flex-1 bg-transparent text-[13px] text-[#374151] dark:text-gray-200 placeholder:text-[#9ca3af] dark:placeholder:text-gray-500 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending || loadingSettings || !status?.enabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#8B4530] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6e3323] transition-colors"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 mt-2 text-center">
            AI inaweza kukosea. Thibitisha taarifa muhimu.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}