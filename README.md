# Chambers — Lawyer Case Management System

A full case management system for a solo advocate's practice: clients, cases,
hearings, documents, payments, notes, and reports — all in one place.

## Stack

- **Backend:** Node.js + Express + SQLite (via `better-sqlite3`), JWT auth, file
  uploads via `multer`. No external database server needed — everything lives
  in a single `case_system.db` file.
- **Frontend:** React + Vite, talking to the backend over a REST API.

## What's included (from your feature list)

| Module | Status |
|---|---|
| Login & password change | ✅ |
| Client management (add, search, view cases per client) | ✅ |
| Case management (create, search/filter, update, delete) | ✅ |
| Hearing management (history, next date, today/tomorrow feeds) | ✅ |
| Document upload (PDF, Word, images) | ✅ |
| Reminders — today's & tomorrow's hearings, upcoming calendar list | ✅ |
| Payment management (due/paid tracking, history) | ✅ |
| Private notes per case | ✅ |
| Reports (case counts, monthly stats, due payments) | ✅ |
| Search & filter (case no., client, court, status) | ✅ |
| CSV export of monthly report | ✅ |
| PDF export, Excel export, backup/restore, audit log, role-based access, SMS/email, OCR, AI summaries | 🔲 not built — see "What's not built yet" below |

Role-based access control is scaffolded (each user has a `role` column) but
only one role is enforced today since you're a solo advocate. Multi-user
support is straightforward to extend later.

## Project structure

```
case-system/
  backend/          Express API + SQLite database
    server.js        entry point
    db.js             schema + seed data
    routes/           one file per feature area
    uploads/          uploaded case documents land here
  frontend/          React app (Vite)
    src/pages/         one file per screen
    src/components/    shared UI bits
    src/styles.css      design system (colors, type, layout)
```

## Running it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

**1. Start the backend**

```bash
cd backend
npm install
npm start
```

This starts the API on `http://localhost:4000` and creates `case_system.db`
in the `backend/` folder on first run, seeded with one login:

- **Email:** `admin@example.com`
- **Password:** `admin123`

Change this password immediately from **Settings** after your first login.

**2. Start the frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

This opens the app at `http://localhost:5173`. The dev server proxies `/api`
requests to the backend automatically, so both need to be running.

**3. Log in** with the seeded credentials above.

## Backing up your data

Since everything lives in SQLite, backup is just copying two things:

```bash
cp backend/case_system.db  backup/case_system-$(date +%F).db
cp -r backend/uploads      backup/uploads-$(date +%F)
```

Restoring is the reverse: stop the server, copy your backup files back over
`backend/case_system.db` and `backend/uploads/`, then restart. A one-click
backup/restore button in Settings is a natural next addition if you want it
built out.

## Deploying so you can use it from anywhere (not just your own computer)

Right now this runs locally. To access it from your phone or another device,
you'd deploy the backend somewhere it stays running (e.g. a small VPS or a
platform like Render/Railway) and the frontend as a static build (`npm run
build` in `frontend/`, then serve the `dist/` folder). Happy to help with
that when you're ready — it's a different kind of setup than local
development.

## What's not built yet (flagged honestly)

These were on your list but are genuinely separate pieces of work, so I
didn't fake them:

- **PDF/Excel export of case summaries** — CSV export exists on the Reports
  page; PDF/Excel export needs a couple more libraries wired in.
- **Backup/restore button in the UI** — the data is backup-able (see above)
  but there's no in-app button yet.
- **SMS/email reminders** — needs a paid SMS provider (e.g. Twilio) or email
  service (e.g. SendGrid) account; wiring is straightforward once you pick
  one.
- **OCR, AI case summaries, cause-list search, voice notes, Bengali UI,
  audit log** — all listed as "future advanced features" in your brief, and
  I left them there. Each is a scoped follow-up.

## Next steps I'd suggest

1. Run it locally, log in, change your password, and add a real client and
   case to get a feel for it.
2. Tell me which of the "not built yet" items matters most and I'll build
   it next — PDF export and the backup button are the quickest wins.
