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

// What GET /applications returns: each row plus its contacts and documents.
// "&" combines two types: everything in ApplicationRow, plus these two fields.
export type Application = ApplicationRow & {
  contacts: Contact[]
  documents: ApplicationDocument[]
}

// The fields a PATCH can change: any subset of everything except what the server sets
export type ApplicationChanges = Partial<Omit<ApplicationRow, 'id' | 'created_at' | 'updated_at'>>

// ---------- Contacts ----------
// Copies of the API's contact types (src/contacts/contacts.schema.ts)

export const OUTREACH_STATUSES = ['not_contacted', 'reached_out', 'responded', 'no_response'] as const
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export const OUTREACH_LABELS: Record<OutreachStatus, string> = {
  not_contacted: 'Not contacted',
  reached_out: 'Reached out',
  responded: 'Responded',
  no_response: 'No response',
}

export const REFERRAL_STATUSES = ['none', 'asked', 'referred', 'declined'] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]

export const REFERRAL_LABELS: Record<ReferralStatus, string> = {
  none: 'No referral',
  asked: 'Asked for referral',
  referred: 'Referred',
  declined: 'Declined',
}

export interface Contact {
  id: number
  application_id: number
  name: string
  title: string | null
  email: string | null
  linkedin_url: string | null
  how_met: string | null
  outreach_status: OutreachStatus
  referral_status: ReferralStatus
  last_contacted_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// What you can send when creating or updating a contact: any subset of the fields a person
// sets. application_id isn't here; it goes in the URL when creating.
export type ContactChanges = Partial<
  Omit<Contact, 'id' | 'application_id' | 'created_at' | 'updated_at'>
>

// ---------- Documents ----------
// Copies of the API's document types (src/documents/documents.schema.ts).
// Named ApplicationDocument because "Document" is already the browser's type for the page.

export const DOCUMENT_KINDS = ['resume', 'cover_letter', 'other'] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  other: 'Other',
}

export interface ApplicationDocument {
  id: number
  application_id: number
  kind: DocumentKind
  original_name: string
  mime_type: string
  size_bytes: number
  created_at: string
}

// Same limits as the server (src/documents/documents.files.ts), checked in the browser
// first so you get an instant message instead of waiting for a large upload to fail
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx']
