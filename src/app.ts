import express from "express";
import { applicationsRouter } from "./applications/applications.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { contactsRouter } from "./contacts/contacts.routes.js";
import { importRouter } from "./import/import.routes.js";

// Builds the Express app: middleware + routes. No app.listen() here,
// so tests can import the app without opening a network port.
export const app = express();

// Middleware: parse JSON request bodies into req.body
app.use(express.json());



// Health check: confirms the server is up
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/applications", applicationsRouter);
app.use("/", contactsRouter);
app.use("/", importRouter);

// Order matters: these must come after all the routes
app.use(notFoundHandler);
app.use(errorHandler);
