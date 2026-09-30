import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// DB_PATH comes from .env (loaded by the --env-file flag in the npm scripts)
const dbPath = process.env.DB_PATH;
if (!dbPath) {
  throw new Error("DB_PATH is not set. Copy .env.example to .env");
}

// Create the data/ folder if it doesn't exist yet (SQLite creates the file, not the folder)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Opens the database file, creating it on first run.
// Exported once and shared: every file that imports db gets this same connection.
export const db = new Database(dbPath);

// SQLite ignores foreign keys unless this is turned on for each connection.
// Without it, REFERENCES and ON DELETE CASCADE in schema.sql do nothing.
db.pragma("foreign_keys = ON");

// Create the tables. Safe to run on every start because schema.sql uses IF NOT EXISTS.
// Read from src/ (not next to this file) because tsc doesn't copy .sql files into dist/.
// npm scripts always run from the project root, so this relative path works for dev and start.
const schema = fs.readFileSync(path.join("src", "db", "schema.sql"), "utf8");
db.exec(schema);
