// The ONLY file with SQL for contacts.
// Every value goes in through a placeholder (@name or ?), never pasted into the SQL text.
import { db } from "../db/connection.js";
import type { Contact, CreateContactInput, UpdateContactInput } from "./contacts.schema.js";

// Columns a client is allowed to set. application_id isn't here:
// it comes from the URL and is added separately in createContact.
const WRITABLE_COLUMNS = [
  "name",
  "title",
  "email",
  "linkedin_url",
  "how_met",
  "outreach_status",
  "referral_status",
  "last_contacted_on",
  "notes",
] as const;

// Keep only the writable columns that were actually sent
function sentColumns(input: Record<string, unknown>): string[] {
  return WRITABLE_COLUMNS.filter((column) => input[column] !== undefined);
}

export function createContact(applicationId: number, input: CreateContactInput): Contact {
  // Only insert the columns that were sent, so the database defaults
  // (statuses, timestamps) fill in the rest
  const columns = ["application_id", ...sentColumns(input)];
  const placeholders = columns.map((column) => `@${column}`);

  const sql = `
    INSERT INTO contacts (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *`;
  // Throws a FOREIGN KEY error if applicationId doesn't exist
  return db.prepare(sql).get({ ...input, application_id: applicationId }) as Contact;
}

export function updateContact(id: number, input: UpdateContactInput): Contact | undefined {
  // Build "name = @name, title = @title, ..." from only the fields that were sent
  const assignments = sentColumns(input).map((column) => `${column} = @${column}`);
  assignments.push("updated_at = datetime('now')");

  const sql = `
    UPDATE contacts
    SET ${assignments.join(", ")}
    WHERE id = @id
    RETURNING *`;
  // RETURNING gives no row if the id doesn't exist, so this is undefined for a missing id
  return db.prepare(sql).get({ ...input, id }) as Contact | undefined;
}

export function deleteContact(id: number): boolean {
  const result = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
  return result.changes > 0;
}
