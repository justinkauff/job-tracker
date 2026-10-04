// Everything about the files on disk: where they go, which types are allowed,
// how uploads are received, and how files are removed.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { BadRequestError } from "../middleware/errorHandler.js";

// Uploads live next to the database (data/uploads/), so they share its gitignore
// rule and its Docker volume. The folder is created on startup if it doesn't exist.
export const UPLOADS_DIR = path.resolve(path.dirname(process.env.DB_PATH ?? "data/jobtracker.db"), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Allowed file types, decided by extension. The MIME type stored in the database comes
// from this table, not from the upload: clients (like curl) often send a generic one.
const ALLOWED_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeTypeFor(filename: string): string | undefined {
  return ALLOWED_TYPES[path.extname(filename).toLowerCase()];
}

// multer reads multipart/form-data requests (the format browsers use to send files)
// and saves the file to disk before the route runs.
export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Never use the uploader's filename as the path: "../../x" could escape the folder,
    // and two "Resume.pdf" uploads would overwrite each other. A random UUID can't do either.
    filename: (req, file, done) => {
      done(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  // Reject other file types before anything is written to disk
  fileFilter: (req, file, done) => {
    if (mimeTypeFor(file.originalname)) {
      done(null, true);
    } else {
      done(new BadRequestError("Only PDF and DOCX files can be uploaded"));
    }
  },
});

// Remove a stored file. A file that's already gone is fine (the goal is "not on disk").
export function deleteStoredFile(storedName: string): void {
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(storedName)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Could not delete uploaded file ${storedName}:`, err);
    }
  }
}

export function storedFilePath(storedName: string): string {
  // basename() strips any folder parts, as a second guard against path tricks
  return path.join(UPLOADS_DIR, path.basename(storedName));
}
