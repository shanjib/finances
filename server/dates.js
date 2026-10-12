/** Local-time date helpers. toISOString() is UTC and gives the wrong day in the evening. */

export function toLocalISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocal() {
  return toLocalISODate(new Date())
}

export function tomorrowLocal() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalISODate(d)
}
