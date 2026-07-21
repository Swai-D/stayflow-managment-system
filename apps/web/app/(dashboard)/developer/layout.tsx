'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { KeyRound, Webhook, Activity, ScrollText, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'API Keys', href: '/developer/api-keys', icon: KeyRound },
  { label: 'Webhooks', href: '/developer/webhooks', icon: Webhook },
  { label: 'API Logs', href: '/developer/logs', icon: Activity },
  { label: 'Documentation', href: '/developer/docs', icon: ScrollText },
]

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Code2 size={20} className="text-[#8B4530]"/>
          <h1 className="text-[18px] font-bold text-gray-900">Developer Portal</h1>
        </div>
        <p className="text-[12px] text-gray-500">
          Manage API keys, webhooks, and integrate external systems with Buffalo Hotel.
        </p>
      </div>

      <div className="border-b border-gray-200 mb-5">
        <nav className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors',
                  isActive
                    ? 'text-[#8B4530] border-[#8B4530]'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon size={14}/>
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
