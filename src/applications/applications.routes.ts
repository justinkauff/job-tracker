// HTTP layer: read the request, validate it, call the repository, send the response.
// No SQL here. zod's parse() throws on bad input, and the error handler turns that into a 400.
import { Router } from "express";
import { deleteStoredFile } from "../documents/documents.files.js";
import { storedNamesForApplication } from "../documents/documents.repository.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import {
  createApplication,
  deleteApplication,
  getApplicationById,
  listApplications,
  updateApplication,
} from "./applications.repository.js";
import {
  createApplicationSchema,
  idParamSchema,
  listApplicationsQuerySchema,
  updateApplicationSchema,
} from "./applications.schema.js";

// Mounted at /applications in app.ts, so "/" here means /applications
export const applicationsRouter = Router();

// POST /applications
applicationsRouter.post("/", (req, res) => {
  const input = createApplicationSchema.parse(req.body);
  const application = createApplication(input);
  res.status(201).json(application);
});

// GET /applications?status=...&company=...
applicationsRouter.get("/", (req, res) => {
  const filters = listApplicationsQuerySchema.parse(req.query);
  res.json(listApplications(filters));
});

// GET /applications/:id
applicationsRouter.get("/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const application = getApplicationById(id);
  if (!application) {
    throw new NotFoundError(`Application ${id} not found`);
  }
  res.json(application);
});

// PATCH /applications/:id
applicationsRouter.patch("/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateApplicationSchema.parse(req.body);
  const application = updateApplication(id, input);
  if (!application) {
    throw new NotFoundError(`Application ${id} not found`);
  }
  res.json(application);
});

// DELETE /applications/:id
applicationsRouter.delete("/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  // ON DELETE CASCADE removes the document rows, but the database can't delete files
  // on disk. Look up the file names first, then remove the files after the delete.
  const storedNames = storedNamesForApplication(id);
  if (!deleteApplication(id)) {
    throw new NotFoundError(`Application ${id} not found`);
  }
  storedNames.forEach(deleteStoredFile);
  res.status(204).end();
});
