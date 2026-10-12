/**
 * Local-time date helpers. Date.toISOString() is UTC, so slicing it gives
 * tomorrow's date in the evening (and the wrong month near month boundaries).
 */

export function toLocalISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocal(): string {
  return toLocalISODate(new Date())
}

export function firstOfMonthLocal(d: Date = new Date()): string {
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return toLocalISODate(d)
}
