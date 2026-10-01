import { z } from "zod";

// Same values as the CHECK constraints in schema.sql
export const OUTREACH_STATUSES = [
  "not_contacted",
  "reached_out",
  "responded",
  "no_response",
] as const;

export const REFERRAL_STATUSES = ["none", "asked", "referred", "declined"] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

// A row from the contacts table, as the database returns it
export interface Contact {
  id: number;
  application_id: number;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  how_met: string | null;
  outreach_status: OutreachStatus;
  referral_status: ReferralStatus;
  last_contacted_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Optional text: can be left out, or sent as null to clear it
const optionalText = z.string().trim().nullable().optional();

// POST /applications/:id/contacts body.
// application_id isn't here: it comes from the URL, not the body.
export const createContactSchema = z.strictObject({
  name: z.string().trim().min(1, "name is required"),
  title: optionalText,
  email: z.email().nullable().optional(),
  linkedin_url: z.url({ protocol: /^https?$/ }).nullable().optional(),
  how_met: optionalText,
  outreach_status: z.enum(OUTREACH_STATUSES).optional(),
  referral_status: z.enum(REFERRAL_STATUSES).optional(),
  last_contacted_on: z.iso.date().nullable().optional(),
  notes: optionalText,
});

// PATCH /contacts/:id body: same rules, but every field is optional
export const updateContactSchema = createContactSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to update",
  });

// TypeScript types generated from the schemas above
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
