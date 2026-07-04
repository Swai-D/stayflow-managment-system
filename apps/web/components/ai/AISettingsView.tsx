'use client'

import { useState, useEffect } from 'react'
import { useAiSettings, useUpdateAiSettings, useValidateAiKey, type AiProvider } from '@/hooks/useAI'
import { Sparkles, Save, CheckCircle2, XCircle, Loader2, Bot, KeyRound, MessageSquare, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PROVIDERS: { value: AiProvider; label: string; color: string; bg: string; border: string }[] = [
  { value: 'openai', label: 'OpenAI', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'deepseek', label: 'DeepSeek', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  { value: 'gemini', label: 'Google Gemini', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' }
]

const MODELS: Record<AiProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro']
}

export default function AISettingsView() {
  const { data: settings, isLoading } = useAiSettings()
  const { mutate: updateSettings, isPending: saving } = useUpdateAiSettings()
  const { mutate: validateKey, isPending: validating } = useValidateAiKey()

  const [form, setForm] = useState({
    enabled: false,
    provider: 'openai' as AiProvider,
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    deepseekKey: '',
    deepseekModel: 'deepseek-chat',
    geminiKey: '',
    geminiModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
    language: 'swahili',
    responseStyle: 'professional',
    includeCharts: false,
    autoAnalyze: false
  })

  const [validation, setValidation] = useState<Record<AiProvider, { valid?: boolean; message?: string }>>({
    openai: {},
    deepseek: {},
    gemini: {}
  })

  useEffect(() => {
    if (settings) {
      setForm({
        enabled: settings.enabled,
        provider: settings.provider,
        openaiKey: settings.openaiKey || '',
        openaiModel: settings.openaiModel,
        deepseekKey: settings.deepseekKey || '',
        deepseekModel: settings.deepseekModel,
        geminiKey: settings.geminiKey || '',
        geminiModel: settings.geminiModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt || '',
        language: settings.language,
        responseStyle: settings.responseStyle,
        includeCharts: settings.includeCharts,
        autoAnalyze: settings.autoAnalyze
      })
    }
  }, [settings])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(form, {
      onSuccess: () => toast.success('Mipangilio ya AI imesasishwa'),
      onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Imeshindwa kusasisha')
    })
  }

  const handleValidate = (provider: AiProvider) => {
    const key = form[`${provider}Key` as keyof typeof form] as string
    if (!key) {
      toast.error('Weka API key kwanza')
      return
    }
    validateKey(
      { provider, apiKey: key },
      {
        onSuccess: (result) => {
          setValidation(prev => ({ ...prev, [provider]: result }))
          toast[result.valid ? 'success' : 'error'](result.message)
        }
      }
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-[#9ca3af]">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-[13px]">Inapakia mipangilio ya AI...</span>
      </div>
    )
  }

  const currentProvider = form.provider

  return (
    <div className="p-0 animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]/50">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827] tracking-tight leading-none">Buffalo</h2>
          <p className="text-[12px] text-[#9ca3af] font-medium mt-1">Sanidi AI provider, API keys, na mienendo ya Buffalo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-3xl">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#111827]">Washa Buffalo</h3>
              <p className="text-[11px] text-[#6b7280]">Watumiaji wataweza kuuliza maswali kwa Buffalo kupitia navbar</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
          </label>
        </div>

        {/* Provider Selection */}
        <div className="space-y-3">
          <label className="text-[12px] font-bold text-[#6b7280] uppercase">Chagua AI Provider</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, provider: p.value })}
                className={cn(
                  'p-4 rounded-2xl border-2 text-left transition-all',
                  currentProvider === p.value
                    ? `${p.bg} ${p.border} ${p.color}`
                    : 'bg-white border-gray-100 hover:border-gray-200 text-[#6b7280]'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-[14px] font-bold', currentProvider === p.value ? p.color : 'text-[#111827]')}>
                    {p.label}
                  </span>
                  {currentProvider === p.value && <CheckCircle2 size={16} className={p.color} />}
                </div>
                <p className="text-[11px] text-[#6b7280]">
                  {p.value === 'openai' && 'GPT-4o, GPT-3.5'}
                  {p.value === 'deepseek' && 'DeepSeek Chat / Coder'}
                  {p.value === 'gemini' && 'Gemini 1.5 Pro / Flash'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827]">
            <KeyRound size={16} className="text-[#2563EB]" />
            API Key
          </div>

          {PROVIDERS.map(p => {
            const keyField = `${p.value}Key` as keyof typeof form
            const keyValue = form[keyField] as string
            return (
              <div key={p.value} className={cn('space-y-2', currentProvider !== p.value && 'hidden')}>
                <label className="text-[11px] font-bold text-[#6b7280] uppercase">{p.label} API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyValue}
                    onChange={e => setForm({ ...form, [keyField]: e.target.value } as any)}
                    placeholder={p.value === 'gemini' ? 'AIza...' : 'sk-...'}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleValidate(p.value)}
                    disabled={validating || !keyValue}
                    className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-[12px] font-bold hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {validating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Hakiki
                  </button>
                </div>
                {validation[p.value]?.message && (
                  <div className={cn(
                    'text-[11px] flex items-center gap-1',
                    validation[p.value]?.valid ? 'text-green-600' : 'text-red-600'
                  )}>
                    {validation[p.value]?.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {validation[p.value]?.message}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Model Configuration */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827]">
            <SlidersHorizontal size={16} className="text-[#2563EB]" />
            Model Configuration
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">Model</label>
              <select
                value={form[`${currentProvider}Model` as keyof typeof form] as string}
                onChange={e => setForm({ ...form, [`${currentProvider}Model`]: e.target.value } as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
              >
                {MODELS[currentProvider].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">Temperature</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-[#9ca3af] mt-0.5">0 = focused, 2 = creative</p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">Max Tokens</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={form.maxTokens}
                onChange={e => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827]">
            <MessageSquare size={16} className="text-[#2563EB]" />
            AI Personality
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">System Prompt</label>
            <textarea
              rows={5}
              value={form.systemPrompt}
              onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 resize-none"
              placeholder="Define how the AI should behave..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">Response Language</label>
              <select
                value={form.language}
                onChange={e => setForm({ ...form, language: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
              >
                <option value="swahili">Kiswahili</option>
                <option value="english">English</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6b7280] uppercase block mb-1">Response Style</label>
              <select
                value={form.responseStyle}
                onChange={e => setForm({ ...form, responseStyle: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="detailed">Detailed</option>
                <option value="concise">Concise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-[13px] font-bold text-[#111827]">Advanced Features</h3>
          <label className="flex items-center gap-3 text-[13px] text-[#374151] cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeCharts}
              onChange={e => setForm({ ...form, includeCharts: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Include Charts & Visualizations
          </label>
          <label className="flex items-center gap-3 text-[13px] text-[#374151] cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoAnalyze}
              onChange={e => setForm({ ...form, autoAnalyze: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-analyze Business Data
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="h-12 px-8 bg-[#2563EB] text-white rounded-2xl font-bold text-[14px] hover:bg-[#1d4ed8] disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Hifadhi Mipangilio
          </button>
        </div>
      </form>
    </div>
  )
}
