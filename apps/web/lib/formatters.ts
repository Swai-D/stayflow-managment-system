export function formatDate(date: string | Date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatDateShort(date: string | Date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  })
}

export function formatDateTime(date: string | Date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTZS(amount: number | string | undefined | null) {
  if (amount === undefined || amount === null) return 'TZS 0'
  return `TZS ${Math.round(Number(amount)).toLocaleString()}`
}

export function formatTZSShort(amount: number | string | undefined | null) {
  if (amount === undefined || amount === null) return 'TZS 0'
  const val = Number(amount)
  if (val >= 1000000) return `TZS ${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `TZS ${(val / 1000).toFixed(0)}K`
  return `TZS ${val}`
}

export function getInitials(name: string) {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}
