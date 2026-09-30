// The ONLY file with SQL for applications.
// Every value goes in through a placeholder (@name or ?), never pasted into the SQL text.
import { db } from "../db/connection.js";
import type {
  Application,
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationInput,
} from "./applications.schema.js";

// Columns a client is allowed to set. Column names can't be placeholders,
// so dynamic SQL only ever uses names from this fixed list, never from user input.
const WRITABLE_COLUMNS = [
  "company",
  "role",
  "status",
  "date_applied",
  "location",
  "url",
  "notes",
] as const;

// Keep only the writable columns that were actually sent
function sentColumns(input: Record<string, unknown>): string[] {
  return WRITABLE_COLUMNS.filter((column) => input[column] !== undefined);
}

export interface ApplicationWithContacts extends Application {
  // Typed loosely for now; becomes Contact[] once the contacts feature exists
  contacts: Record<string, unknown>[];
}

export function createApplication(input: CreateApplicationInput): Application {
  // Only insert the columns that were sent, so the database defaults
  // (status = 'wishlist', timestamps) fill in the rest
  const columns = sentColumns(input);
  const placeholders = columns.map((column) => `@${column}`);

  const sql = `
    INSERT INTO applications (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *`;
  return db.prepare(sql).get(input) as Application;
}

export function listApplications(filters: ListApplicationsQuery): Application[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    conditions.push("status = @status");
    params.status = filters.status;
  }
  if (filters.company) {
    // LIKE with % on both sides = "contains". Case-insensitive for plain letters in SQLite.
    conditions.push("company LIKE @company");
    params.company = `%${filters.company}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM applications ${where} ORDER BY created_at DESC, id DESC`;
  return db.prepare(sql).all(params) as Application[];
}

export function getApplicationById(id: number): ApplicationWithContacts | undefined {
  const application = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(id) as Application | undefined;
  if (!application) {
    return undefined;
  }

  const contacts = db
    .prepare("SELECT * FROM contacts WHERE application_id = ? ORDER BY id")
    .all(id) as Record<string, unknown>[];
  return { ...application, contacts };
}

export function updateApplication(
  id: number,
  input: UpdateApplicationInput,
): Application | undefined {
  // Build "company = @company, status = @status, ..." from only the fields that were sent
  const assignments = sentColumns(input).map((column) => `${column} = @${column}`);
  assignments.push("updated_at = datetime('now')");

  const sql = `
    UPDATE applications
    SET ${assignments.join(", ")}
    WHERE id = @id
    RETURNING *`;
  // RETURNING gives no row if the id doesn't exist, so this is undefined for a missing id
  return db.prepare(sql).get({ ...input, id }) as Application | undefined;
}

export function deleteApplication(id: number): boolean {
  // Contacts are removed too, by ON DELETE CASCADE
  const result = db.prepare("DELETE FROM applications WHERE id = ?").run(id);
  return result.changes > 0;
}
