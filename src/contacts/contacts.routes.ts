// HTTP layer: read the request, validate it, call the repository, send the response.
// No SQL here. zod's parse() throws on bad input, and the error handler turns that into a 400.

import { Router } from "express";
import { NotFoundError } from "../middleware/errorHandler.js";

import {
  createContact,
  deleteContact,
  updateContact,
} from "./contacts.repository.js";

import {
  createContactSchema,
  updateContactSchema,
} from "./contacts.schema.js";

import {
  idParamSchema,
} from "../applications/applications.schema.js";

import {
  getApplicationById,
} from "../applications/applications.repository.js";

export const contactsRouter = Router();

// POST /applications/:id/contacts
contactsRouter.post("/applications/:id/contacts", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = createContactSchema.parse(req.body);

  const application = getApplicationById(id);

  if (!application) {
    throw new NotFoundError(`Application ${id} not found`);
  }

  const contact = createContact(id, input);

  res.status(201).json(contact);
});

// PATCH /contacts/:id
contactsRouter.patch("/contacts/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateContactSchema.parse(req.body);

  const contact = updateContact(id, input);

  if (!contact) {
    throw new NotFoundError(`Contact ${id} not found`);
  }

  res.json(contact);
});

// DELETE /contacts/:id
contactsRouter.delete("/contacts/:id", (req, res) => {
  const { id } = idParamSchema.parse(req.params);

  if (!deleteContact(id)) {
    throw new NotFoundError(`Contact ${id} not found`);
  }

  res.status(204).end();
});