// Entry point: opens the database, then starts the HTTP server.
import "./db/connection.js";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Job Tracker API listening on http://localhost:${port}`);
});
