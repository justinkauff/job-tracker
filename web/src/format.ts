const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Today's date as "YYYY-MM-DD" in local time (toISOString() would use UTC,
// which is already tomorrow during US evenings)
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// "2026-09-08" → "Sep 8, 2026".
// Not new Date("2026-09-08"): that parses as midnight UTC, which is still Sep 7
// in US time zones, so the card would show the wrong day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

// 34 → "34 B", 52400 → "51 KB", 2400000 → "2.3 MB"
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
