import type { Application } from './types'

// True if the application matches what's typed in the search box.
// Matches the company, the role, or any contact's name. Not case-sensitive, and part
// of a word counts: "acm" finds "Acme Corp". An empty search matches everything.
export function matchesSearch(application: Application, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true

  const haystack = [application.company, application.role, ...application.contacts.map((c) => c.name)]
  // role can be null; ?. skips it instead of crashing
  return haystack.some((text) => text?.toLowerCase().includes(needle))
}
