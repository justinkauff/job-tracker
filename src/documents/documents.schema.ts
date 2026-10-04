import { z } from "zod";

// Same values as the CHECK constraint in schema.sql
export const DOCUMENT_KINDS = ["resume", "cover_letter", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

// What the API sends to clients. stored_name (the file's name on disk) is left out:
// it's an internal detail, and clients open files by document id instead.
// Called ApplicationDocument, not Document, to avoid confusion with the browser's
// built-in Document type in the frontend.
export interface ApplicationDocument {
  id: number;
  application_id: number;
  kind: DocumentKind;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

// The full row, including where the file is on disk. Only used inside the server.
export interface StoredDocument extends ApplicationDocument {
  stored_name: string;
}

// The text fields sent alongside the file in the multipart upload
export const uploadDocumentSchema = z.strictObject({
  kind: z.enum(DOCUMENT_KINDS),
});
