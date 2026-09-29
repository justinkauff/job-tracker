# Stage 1 Design: Core API

Agreed design for Stage 1 of [ROADMAP.md](../ROADMAP.md): a Node.js + TypeScript + Express REST API backed by SQLite.
**Done when:** I can add and list applications using Thunder Client or curl.

## Where the data model came from
The model is based on my original spreadsheet. That file isn't committed because it contains personal data.

| What the spreadsheet had | What it means for the data model |
|---|---|
| A summary block ("Key / Count") above the real header row | Counts are **computed** with queries, not stored. (The Stage 2 importer must skip these rows.) |
| Columns: Company, Position, Date Applied, Application Status, Details, Location, Applicant Portal | These become the core `applications` columns. |
| Mixed date formats (`9/8/26` and `9/21/2026`) and blank dates | Every date is stored as ISO `YYYY-MM-DD`. The field is nullable because I may not have applied yet. |
| Status values `Submitted` and `Need to find contact` | "Need to find contact" is a networking state, not an application state. So application status and networking are separated. |
| A company I'm targeting with no role chosen yet | Adds a `wishlist` status and makes `role` optional. |
| A Details column mixing notes ("top choice") with people ("asked X to refer", "emailed Y", "met Z at career fair") | People get their own `contacts` table. Details becomes plain `notes`. |
| One company row that mentions two people | One application can have **many** contacts. |
| The same company appearing twice with different roles | `company` is not unique. Every row gets its own numeric `id`. |
| Messy locations ("Remot", "Many") | Location stays free text for now. Cleanup belongs to the Stage 2 import. |

## Database (SQLite, 2 tables)

### `applications`: the job itself and where the application stands
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Assigned automatically |
| `company` | TEXT NOT NULL | The only required field |
| `role` | TEXT | Nullable |
| `status` | TEXT NOT NULL DEFAULT `'wishlist'` | `CHECK` limits it to `wishlist`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn` |
| `date_applied` | TEXT | ISO `YYYY-MM-DD`, nullable |
| `location` | TEXT | Free text |
| `url` | TEXT | Posting or portal link |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | Timestamps set by the server |

### `contacts`: the people involved, and networking status
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | |
| `application_id` | INTEGER NOT NULL | **Foreign key** to `applications.id`, with `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | |
| `title` | TEXT | e.g. "Recruiter" |
| `email` / `linkedin_url` | TEXT | |
| `how_met` | TEXT | e.g. "career fair" |
| `outreach_status` | TEXT NOT NULL DEFAULT `'not_contacted'` | `not_contacted`, `reached_out`, `responded`, `no_response` |
| `referral_status` | TEXT NOT NULL DEFAULT `'none'` | `none`, `asked`, `referred`, `declined` |
| `last_contacted_on` | TEXT | ISO date |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT | |

### Why
- **Two tables, not one.** An application has one status but zero or more people. Each "thing" gets its own table, linked by a foreign key (`application_id`), and queried together with `JOIN`.
- **"Need to find contact" is a query, not a status:** applications with no contacts (`LEFT JOIN ... WHERE contacts.id IS NULL`). Nothing has to be kept up to date by hand.
- **Two status fields on a contact.** "Did I message them?" and "did they refer me?" are separate questions. "Asked someone to refer me" means `outreach_status=reached_out` and `referral_status=asked`.
- **`CHECK` constraints on the status columns.** The database itself rejects typos like "Submited".
- **Dates stored as ISO text.** SQLite has no real date type, and `YYYY-MM-DD` strings sort correctly as plain text.
- **`ON DELETE CASCADE`.** Deleting an application deletes its contacts, so no rows are left pointing at nothing.
- **Left out on purpose, to add later with a migration:** pay, deadline, and skills (Stage 6), and document links (Stage 5).

## Folder structure
```
job-tracker/
├─ src/
│  ├─ index.ts                  # entry point: loads config, starts the server (app.listen)
│  ├─ app.ts                    # builds the Express app (middleware + routes), no listen
│  ├─ db/
│  │  ├─ schema.sql             # CREATE TABLE statements
│  │  └─ connection.ts          # opens data/jobtracker.db, turns on foreign keys, runs schema
│  ├─ applications/
│  │  ├─ applications.schema.ts     # zod validation rules + TypeScript types
│  │  ├─ applications.repository.ts # the ONLY file with SQL for applications
│  │  └─ applications.routes.ts     # HTTP: reads the request, calls the repository, sends the response
│  ├─ contacts/                 # same 3-file pattern (I write this one)
│  └─ middleware/
│     └─ errorHandler.ts        # turns errors into JSON 400/404/500 responses
├─ data/                        # jobtracker.db lives here (gitignored)
├─ .env.example                 # PORT=3000, DB_PATH=data/jobtracker.db
├─ package.json / tsconfig.json
```

### Why
- **Grouped by feature, not by kind.** Everything about one resource sits together, so adding contacts means copying a folder I already understand.
- **Three layers per feature.** Routes handle HTTP, the repository handles SQL, and the schema handles validation. Each file has one job.
- **`app.ts` is separate from `index.ts`.** Tests can import the app without opening a network port.

### Libraries
- `express`: the web framework.
- `better-sqlite3`: a simple, synchronous SQLite driver. Raw SQL, **no ORM**.
- `zod`: validates request bodies at runtime, because TypeScript types disappear after compiling. It also produces the TS types.
- `tsx`: dev runner with reload on save.
- `typescript` and `@types/*`: the compiler and type definitions.

## API endpoints (JSON in and out)
| Method & path | What it does | Success | Errors |
|---|---|---|---|
| `GET /health` | Confirms the server is up | 200 | |
| `POST /applications` | Create an application | 201 + the created row | 400 |
| `GET /applications` | List them, with optional `?status=` and `?company=` filters | 200 + array | 400 |
| `GET /applications/:id` | Get one, including its `contacts` array | 200 | 404 |
| `PATCH /applications/:id` | Update only the fields sent | 200 + the updated row | 400, 404 |
| `DELETE /applications/:id` | Delete it (its contacts go too) | 204 | 404 |
| `POST /applications/:id/contacts` | Add a contact to an application | 201 | 400, 404 |
| `PATCH /contacts/:id` | Update a contact | 200 | 400, 404 |
| `DELETE /contacts/:id` | Remove a contact | 204 | 404 |

### Why
- **URLs name things (nouns), and the HTTP method is the action.** That's the core REST convention.
- **PATCH instead of PUT.** PATCH changes only the fields sent, e.g. `{ "status": "interviewing" }`. PUT would replace the whole record.
- **Status codes carry meaning:** 201 created, 204 done with nothing to return, 400 bad request, 404 not found.
- **Contacts are created under their application**, because a contact can't exist without one. After that, a contact is edited and deleted by its own id.

## Build order
1. `package.json` and `tsconfig.json`
2. `schema.sql` and `connection.ts`
3. Applications: schema, then repository, then routes, plus the error handler
4. Check with curl or Thunder Client: POST an application, then GET the list
5. **I write the contacts endpoints myself** following the same pattern, and Claude reviews them
