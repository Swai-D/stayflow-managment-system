'use client'

import { useState } from 'react'
import { COUNTRIES } from '@/lib/countries'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronsUpDown, Check } from 'lucide-react'

interface CountrySelectProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CountrySelect({ value, onChange, placeholder = 'Chagua nchi...', className }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const selected = COUNTRIES.find(c => c.name === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#2563eb] transition-all flex items-center justify-between",
          className
        )}
      >
        <span className={cn(!selected && "text-[#9ca3af]/60 font-medium")}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown size={16} className="text-[#9ca3af] shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-2xl border-gray-100 shadow-xl" align="start">
        <Command>
          <CommandInput placeholder="Tafuta nchi..." className="h-10" />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>Hakuna nchi iliyopatikana.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map(country => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.name)
                    setOpen(false)
                  }}
                  className="cursor-pointer text-sm"
                >
                  <span className="flex-1">{country.name}</span>
                  {value === country.name && <Check size={16} className="text-[#2563eb]" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
