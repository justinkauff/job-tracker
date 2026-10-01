import express, { Router } from "express";
import { BadRequestError } from "../middleware/errorHandler.js";
import { importTrackerCsv } from "./import.service.js";

export const importRouter = Router();

// POST /import with the CSV file as the body (Content-Type: text/csv).
// express.text() is added for this route only: it reads the body into req.body as a string.
importRouter.post("/import", express.text({ type: "text/csv", limit: "1mb" }), (req, res) => {
  if (typeof req.body !== "string" || req.body.trim() === "") {
    throw new BadRequestError("Send the CSV file as the request body with Content-Type: text/csv");
  }
  res.json(importTrackerCsv(req.body));
});
