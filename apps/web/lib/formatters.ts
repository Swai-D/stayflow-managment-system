export function formatDate(date: string | Date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatTZS(amount: number | string | undefined | null) {
  if (amount === undefined || amount === null) return 'TZS 0'
  return `TZS ${Math.round(Number(amount)).toLocaleString()}`
}
