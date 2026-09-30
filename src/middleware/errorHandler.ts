import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

// Thrown by routes when a record doesn't exist. The error handler turns it into a 404.
export class NotFoundError extends Error {}

// Runs when no route matched the URL (registered after all the routers)
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
};

// Express recognizes an error handler by its 4 parameters. When a route throws,
// Express skips the remaining routes and calls this instead.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Bad input: body, query string, or :id failed zod validation
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // The body wasn't valid JSON (thrown by express.json())
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Request body is not valid JSON" });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  // Anything else is a bug. Log the details on the server, but don't send
  // them to the client: stack traces and SQL errors reveal how the app works.
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
