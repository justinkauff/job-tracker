import { Router } from "express";
import { getApplicationById } from "../applications/applications.repository.js";
import { idParamSchema } from "../applications/applications.schema.js";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler.js";
import {
  deleteStoredFile,
  mimeTypeFor,
  storedFilePath,
  upload,
} from "./documents.files.js";
import { createDocument, deleteDocument, getStoredDocument } from "./documents.repository.js";
import { uploadDocumentSchema } from "./documents.schema.js";

// Mounted at "/" in app.ts, so these are full paths
export const documentsRouter = Router();

// POST /applications/:id/documents  (multipart/form-data: a "file" and a "kind" field)
// upload.single("file") runs first: it saves the file to disk and fills in req.file and req.body.
documentsRouter.post("/applications/:id/documents", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    throw new BadRequestError('Attach a PDF or DOCX file in a field named "file"');
  }

  // The file is already on disk at this point. If anything below fails,
  // delete it again so failed uploads don't leave files behind.
  try {
    const { id } = idParamSchema.parse(req.params);
    const { kind } = uploadDocumentSchema.parse(req.body);
    if (!getApplicationById(id)) {
      throw new NotFoundError(`Application ${id} not found`);
    }

    const document = createDocument({
      applicationId: id,
      kind,
      originalName: decodeFilename(file.originalname),
      storedName: file.filename,
      mimeType: mimeTypeFor(file.originalname)!, // fileFilter already guaranteed a known type
      sizeBytes: file.size,
    });
    res.status(201).json(document);
  } catch (err) {
    deleteStoredFile(file.filename);
    throw err;
  }
});

// GET /documents/:id → the file itself. PDFs open in the browser; DOCX files download.
documentsRouter.get("/documents/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const document = getStoredDocument(id);
  if (!document) {
    throw new NotFoundError(`Document ${id} not found`);
  }

  const disposition = document.mime_type === "application/pdf" ? "inline" : "attachment";
  // filename* with UTF-8 encoding keeps names like "Résumé.pdf" intact
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename*=UTF-8''${encodeURIComponent(document.original_name)}`,
  );
  res.type(document.mime_type);
  res.sendFile(storedFilePath(document.stored_name), (err) => {
    // The row exists but the file is missing from disk (e.g. deleted by hand)
    if (err && !res.headersSent) {
      res.status(404).json({ error: `The file for document ${id} is missing` });
    }
  });
});

// DELETE /documents/:id → removes the row and the file on disk
documentsRouter.delete("/documents/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const document = getStoredDocument(id);
  if (!document || !deleteDocument(id)) {
    throw new NotFoundError(`Document ${id} not found`);
  }
  deleteStoredFile(document.stored_name);
  res.status(204).end();
});

// Browsers send filenames as UTF-8, but the multipart parser reads them as Latin-1,
// so "Résumé.pdf" would arrive as "RÃ©sumÃ©.pdf". Re-decode the bytes as UTF-8.
function decodeFilename(name: string): string {
  return Buffer.from(name, "latin1").toString("utf8");
}
