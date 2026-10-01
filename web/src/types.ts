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

export interface Application {
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
