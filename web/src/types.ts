// Copies of the API's types (src/applications/applications.schema.ts).
// Kept separate for now because the frontend is its own package; keep them in sync by hand.

export const APPLICATION_STATUSES = [
  'wishlist',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

// Column headings. Record<ApplicationStatus, string> makes TypeScript require a label
// for every status: adding a status without a label is a compile error.
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

// One row of the applications table. POST and PATCH return this shape.
export interface ApplicationRow {
  id: number
  company: string
  role: string | null
  status: ApplicationStatus
  date_applied: string | null
  location: string | null
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// What GET /applications returns: each row plus its contacts.
// "&" combines two types: everything in ApplicationRow, plus a contacts field.
export type Application = ApplicationRow & { contacts: Contact[] }

// The fields a PATCH can change: any subset of everything except what the server sets
export type ApplicationChanges = Partial<Omit<ApplicationRow, 'id' | 'created_at' | 'updated_at'>>

// Copy of the API's Contact type (src/contacts/contacts.schema.ts), trimmed to what the board shows
export type OutreachStatus = 'not_contacted' | 'reached_out' | 'responded' | 'no_response'

export const OUTREACH_LABELS: Record<OutreachStatus, string> = {
  not_contacted: 'Not contacted',
  reached_out: 'Reached out',
  responded: 'Responded',
  no_response: 'No response',
}

export interface Contact {
  id: number
  application_id: number
  name: string
  title: string | null
  email: string | null
  linkedin_url: string | null
  outreach_status: OutreachStatus
}
