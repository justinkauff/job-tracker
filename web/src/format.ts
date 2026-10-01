const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-09-08" → "Sep 8, 2026".
// Not new Date("2026-09-08"): that parses as midnight UTC, which is still Sep 7
// in US time zones, so the card would show the wrong day.
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${MONTHS[month - 1]} ${day}, ${year}`
}
