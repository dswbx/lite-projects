/** local calendar date as YYYY-MM-DD (not UTC midnight) */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function previousLocalDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d - 1)
  return localDateString(dt)
}

export function nextLocalDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return localDateString(dt)
}

const longFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatEntryDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return longFmt.format(new Date(y, m - 1, d))
}
