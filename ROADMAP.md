# Job Tracker Roadmap

A personal job application tracker, built to learn TypeScript, Node.js, React, Docker, and working with Claude Code.

**How to build this:** one stage at a time. Finish a stage, understand every file in it, commit, then move on. Don't jump ahead.

---

## Stage 1: Core API
- Node.js + TypeScript + Express REST API
- SQLite database for applications. Fields are based on my current spreadsheet: company, role, date applied, status, link, contact, notes, and so on
- Endpoints: add, list, get one, update, delete an application
- **Done when:** I can add and list applications using Thunder Client or curl

## Stage 2: CSV import
- Endpoint to upload my exported spreadsheet (.csv) and load it into the database
- Handle messy rows: missing fields, bad dates, duplicates. Report what was skipped and why
- **Done when:** all my real applications are in the database

## Stage 3: Docker
- Dockerfile + docker-compose so the whole app runs with one command
- **Done when:** `docker compose up` starts the API from a clean machine

## Stage 4: React frontend
- React + TypeScript
- Board view with columns: Applied, Interviewing, Offer, Rejected (drag cards between them)
- Form to add or edit an application manually
- **Done when:** I use this instead of my spreadsheet

## Stage 5: Documents per application
- Upload and attach the resume and cover letter I used for each job (.docx / .pdf)
- See which resume version went to which company
- **Done when:** every application shows its resume and cover letter

## Stage 6: Polish
- Tests + GitHub Actions (tests run on every push)
- Deploy it so it has a live link for my portfolio
- Clean README with screenshots and a demo GIF

---

## Rules for Claude Code
- I'm learning. Explain new concepts and why you chose them, not just what the code does
- Propose a plan before writing code for each stage
- After each stage, I write at least one feature myself and you review it
- Keep my real CSV and any personal data out of git (use a fake sample CSV instead)
