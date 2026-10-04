// The ONLY file with SQL for documents.
import { db } from "../db/connection.js";
import type { ApplicationDocument, DocumentKind, StoredDocument } from "./documents.schema.js";

// Every column except stored_name, for anything sent to clients
const PUBLIC_COLUMNS = "id, application_id, kind, original_name, mime_type, size_bytes, created_at";

interface NewDocument {
  applicationId: number;
  kind: DocumentKind;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}

export function createDocument(doc: NewDocument): ApplicationDocument {
  return db
    .prepare(
      `INSERT INTO documents (application_id, kind, original_name, stored_name, mime_type, size_bytes)
       VALUES (@applicationId, @kind, @originalName, @storedName, @mimeType, @sizeBytes)
       RETURNING ${PUBLIC_COLUMNS}`,
    )
    .get(doc) as ApplicationDocument;
}

// Includes stored_name, because the caller needs to find the file on disk
export function getStoredDocument(id: number): StoredDocument | undefined {
  return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as StoredDocument | undefined;
}

// Public documents for every application, grouped by application id (one query, not N+1)
export function documentsByApplication(): Map<number, ApplicationDocument[]> {
  const rows = db
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM documents ORDER BY created_at DESC, id DESC`)
    .all() as ApplicationDocument[];
  const grouped = new Map<number, ApplicationDocument[]>();
  for (const row of rows) {
    const list = grouped.get(row.application_id) ?? [];
    list.push(row);
    grouped.set(row.application_id, list);
  }
  return grouped;
}

export function documentsForApplication(applicationId: number): ApplicationDocument[] {
  return db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM documents WHERE application_id = ? ORDER BY created_at DESC, id DESC`,
    )
    .all(applicationId) as ApplicationDocument[];
}

// The disk names of an application's files, so they can be deleted along with it
export function storedNamesForApplication(applicationId: number): string[] {
  const rows = db
    .prepare("SELECT stored_name FROM documents WHERE application_id = ?")
    .all(applicationId) as { stored_name: string }[];
  return rows.map((row) => row.stored_name);
}

export function deleteDocument(id: number): boolean {
  return db.prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
}
