// Temporary check for the database setup. Replaced by the real server in build step 3.
import { db } from "./db/connection.js";

const tables = db
  .prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'")
  .all();
console.log("Database objects:", tables);
console.log("foreign_keys =", db.pragma("foreign_keys", { simple: true }));
