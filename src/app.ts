import express from "express";

// Builds the Express app: middleware + routes. No app.listen() here,
// so tests can import the app without opening a network port.
export const app = express();

// Middleware: parse JSON request bodies into req.body
app.use(express.json());

// Health check: confirms the server is up
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
