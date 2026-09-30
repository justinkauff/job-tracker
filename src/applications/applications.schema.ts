import { z } from "zod";

// Same values as the CHECK constraint in schema.sql.
// "as const" keeps the exact strings as the type, not just string[].
export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// A row from the applications table, as the database returns it
export interface Application {
  id: number;
  company: string;
  role: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  location: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Optional text: can be left out, or sent as null to clear it
const optionalText = z.string().trim().nullable().optional();

// POST /applications body. strictObject rejects unknown fields (e.g. a typo like "stauts").
export const createApplicationSchema = z.strictObject({
  company: z.string().trim().min(1, "company is required"),
  role: optionalText,
  status: z.enum(APPLICATION_STATUSES).optional(),
  date_applied: z.iso.date().nullable().optional(),
  location: optionalText,
  url: z.url({ protocol: /^https?$/ }).nullable().optional(),
  notes: optionalText,
});

// PATCH /applications/:id body: same rules, but every field is optional
export const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to update",
  });

// GET /applications query string, e.g. ?status=applied&company=acme
export const listApplicationsQuerySchema = z.strictObject({
  status: z.enum(APPLICATION_STATUSES).optional(),
  company: z.string().trim().min(1).optional(),
});

// TypeScript types generated from the schemas above
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
