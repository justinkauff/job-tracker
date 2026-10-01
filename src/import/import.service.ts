// Turns an exported tracker spreadsheet (.csv) into applications.
// Cleans each row, validates it with the same zod schema as the API, skips bad rows
// with a reason, and inserts the good ones in a single transaction.
import { parse } from "csv-parse/sync";
import {
  applicationExists,
  createApplications,
} from "../applications/applications.repository.js";
import {
  createApplicationSchema,
  type ApplicationStatus,
  type CreateApplicationInput,
} from "../applications/applications.schema.js";
import { BadRequestError } from "../middleware/errorHandler.js";

export interface SkippedRow {
  row: number; // spreadsheet row number, so it can be found in Excel
  reason: string;
}

export interface ImportReport {
  imported: number;
  skipped: SkippedRow[];
}

// Spreadsheet status (lowercase) → our status.
// A Map, not a plain object, so odd input like "toString" can't match a built-in property.
const STATUS_MAP = new Map<string, ApplicationStatus>([
  ["submitted", "applied"],
  ["applied", "applied"],
  // A networking state, not an application state: "no contacts yet" is now a query
  ["need to find contact", "applied"],
  ["in progress", "interviewing"],
  ["interviewing", "interviewing"],
  ["offer", "offer"],
  ["rejected", "rejected"],
  ["withdrawn", "withdrawn"],
  ["wishlist", "wishlist"],
]);

export function importTrackerCsv(csvText: string): ImportReport {
  const rows = parseCsv(csvText);

  // The real header is below a title and a Key/Count summary block, so search for it
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => cell.trim().toLowerCase() === "company"),
  );
  if (headerIndex === -1) {
    throw new BadRequestError('No header row with a "Company" column found');
  }

  // Look columns up by header name, not position, so reordering columns in the sheet is fine
  const header = rows[headerIndex].map((cell) => cell.trim().toLowerCase());
  const getter = (row: string[]) => (column: string) => {
    const index = header.indexOf(column);
    return index === -1 ? "" : (row[index] ?? "").trim();
  };

  const toInsert: CreateApplicationInput[] = [];
  const skipped: SkippedRow[] = [];
  const seenInFile = new Set<string>();

  rows.slice(headerIndex + 1).forEach((row, i) => {
    // +1 for the header, +1 because spreadsheet rows start at 1
    const rowNumber = headerIndex + 2 + i;

    // Excel exports formatted-but-empty rows; ignore them silently
    if (row.every((cell) => cell.trim() === "")) {
      return;
    }

    const result = rowToApplication(getter(row));
    if (typeof result === "string") {
      skipped.push({ row: rowNumber, reason: result });
      return;
    }

    const key = `${result.company}|${result.role ?? ""}`.toLowerCase();
    if (seenInFile.has(key)) {
      skipped.push({ row: rowNumber, reason: "duplicate of an earlier row in this file" });
      return;
    }
    seenInFile.add(key);
    if (applicationExists(result.company, result.role)) {
      skipped.push({ row: rowNumber, reason: "already in the database" });
      return;
    }

    toInsert.push(result);
  });

  createApplications(toInsert);
  return { imported: toInsert.length, skipped };
}

function parseCsv(csvText: string): string[][] {
  try {
    // bom: strip the invisible marker Excel puts at the start of "CSV UTF-8" files.
    // relax_column_count: summary rows can have fewer cells than data rows.
    return parse(csvText, { bom: true, relax_column_count: true }) as string[][];
  } catch (err) {
    throw new BadRequestError(`Could not read the CSV: ${(err as Error).message}`);
  }
}

// Returns the cleaned application, or a string explaining why the row was skipped
function rowToApplication(get: (column: string) => string): CreateApplicationInput | string {
  const company = get("company");
  if (!company) {
    return "missing company";
  }

  const rawDate = get("date applied");
  let dateApplied: string | undefined;
  if (rawDate) {
    dateApplied = toIsoDate(rawDate);
    if (!dateApplied) {
      return `unrecognized date "${rawDate}" (expected M/D/YY, M/D/YYYY, or YYYY-MM-DD)`;
    }
  }

  const rawStatus = get("application status");
  let status: ApplicationStatus | undefined;
  if (rawStatus) {
    status = STATUS_MAP.get(rawStatus.toLowerCase());
    if (!status) {
      return `unknown status "${rawStatus}"`;
    }
  } else {
    // No status: if there's a date it was sent, otherwise it's a company I'm still eyeing
    status = dateApplied ? "applied" : "wishlist";
  }

  // The portal column holds links but sometimes just a name like "Workday".
  // Real links go in url; anything else is kept in notes so nothing is lost.
  const notes = [get("details")];
  const portal = get("applicant portal");
  let url: string | undefined;
  if (portal) {
    if (isHttpUrl(portal)) {
      url = portal;
    } else {
      notes.push(`Applicant portal: ${portal}`);
    }
  }

  const candidate = {
    company,
    role: get("position") || undefined,
    status,
    date_applied: dateApplied,
    location: get("location") || undefined,
    url,
    notes: notes.filter((note) => note !== "").join("\n") || undefined,
  };

  // Same rules as POST /applications, e.g. catches impossible dates like 2/30/2026
  const parsed = createApplicationSchema.safeParse(candidate);
  if (!parsed.success) {
    return parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
  }
  return parsed.data;
}

// "9/8/26" or "9/21/2026" → "2026-09-08" / "2026-09-21". Already-ISO dates pass through.
// Returns undefined if the text isn't in a recognized shape.
function toIsoDate(text: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text);
  if (!match) {
    return undefined;
  }
  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isHttpUrl(text: string): boolean {
  const url = URL.parse(text);
  return url !== null && (url.protocol === "http:" || url.protocol === "https:");
}
