import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getHearingReminders } from "../services/automation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/reminders", (req, res) => {
  res.json(getHearingReminders());
});

router.get("/overdue", (req, res) => {
  res.json(getHearingReminders().overdue);
});

function todayStr() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function dateAfterDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function normalizeHearingTime(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):([0-5]\d)/);
  if (!match) return text;
  const hours = Number(match[1]);
  if (hours > 23) return text;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

// Today's hearing schedule
router.get("/today", (req, res) => {
  const rows = db
    .prepare(
      `SELECT hearings.*, cases.case_number, cases.court_name, clients.name AS client_name
       FROM hearings
       JOIN cases ON hearings.case_id = cases.id
       JOIN clients ON cases.client_id = clients.id
       WHERE hearings.hearing_date = ?
       ORDER BY hearings.hearing_date, hearings.hearing_time IS NULL, hearings.hearing_time`
    )
    .all(todayStr());
  res.json(rows);
});

// Tomorrow's hearings (reminder feed)
router.get("/tomorrow", (req, res) => {
  const rows = db
    .prepare(
      `SELECT hearings.*, cases.case_number, cases.court_name, clients.name AS client_name
       FROM hearings
       JOIN cases ON hearings.case_id = cases.id
       JOIN clients ON cases.client_id = clients.id
       WHERE hearings.hearing_date = ?
       ORDER BY hearings.hearing_date, hearings.hearing_time IS NULL, hearings.hearing_time`
    )
    .all(tomorrowStr());
  res.json(rows);
});

// Upcoming hearings (calendar view feed) - next N days
router.get("/upcoming", (req, res) => {
  const days = parseInt(req.query.days || "30", 10);
  const endDate = dateAfterDays(Number.isFinite(days) ? Math.max(0, Math.min(days, 3650)) : 30);
  const rows = db
    .prepare(
      `SELECT hearings.*, cases.case_number, cases.court_name, clients.name AS client_name
       FROM hearings
       JOIN cases ON hearings.case_id = cases.id
       JOIN clients ON cases.client_id = clients.id
       WHERE hearings.hearing_date BETWEEN ? AND ?
       ORDER BY hearings.hearing_date, hearings.hearing_time IS NULL, hearings.hearing_time`
    )
    .all(todayStr(), endDate);
  res.json(rows);
});

router.post("/", (req, res) => {
  const { case_id, hearing_date, hearing_time, purpose, outcome, next_hearing_date } = req.body;
  if (!case_id || !hearing_date) {
    return res.status(400).json({ error: "case_id and hearing_date are required" });
  }
  const normalizedHearingTime = normalizeHearingTime(hearing_time);
  const result = db
    .prepare(
      `INSERT INTO hearings (case_id, hearing_date, hearing_time, purpose, outcome, next_hearing_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      case_id,
      hearing_date,
      normalizedHearingTime ?? null,
      purpose || null,
      outcome || null,
      next_hearing_date || null
    );
  res
    .status(201)
    .json(db.prepare("SELECT * FROM hearings WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM hearings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Hearing not found" });
  const { hearing_date, hearing_time, purpose, outcome, next_hearing_date } = req.body;
  const normalizedHearingTime = normalizeHearingTime(hearing_time);
  db.prepare(
    `UPDATE hearings SET hearing_date=?, hearing_time=?, purpose=?, outcome=?, next_hearing_date=? WHERE id=?`
  ).run(
    hearing_date ?? existing.hearing_date,
    normalizedHearingTime === undefined ? existing.hearing_time : normalizedHearingTime,
    purpose ?? existing.purpose,
    outcome ?? existing.outcome,
    next_hearing_date ?? existing.next_hearing_date,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM hearings WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM hearings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Hearing not found" });
  db.prepare("DELETE FROM hearings WHERE id = ?").run(req.params.id);
  res.json({ message: "Hearing deleted" });
});

export default router;
