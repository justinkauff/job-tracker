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
