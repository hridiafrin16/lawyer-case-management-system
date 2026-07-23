import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
       ORDER BY hearings.hearing_date`
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
       ORDER BY hearings.hearing_date`
    )
    .all(tomorrowStr());
  res.json(rows);
});

// Upcoming hearings (calendar view feed) - next N days
router.get("/upcoming", (req, res) => {
  const days = parseInt(req.query.days || "30", 10);
  const end = new Date();
  end.setDate(end.getDate() + days);
  const rows = db
    .prepare(
      `SELECT hearings.*, cases.case_number, cases.court_name, clients.name AS client_name
       FROM hearings
       JOIN cases ON hearings.case_id = cases.id
       JOIN clients ON cases.client_id = clients.id
       WHERE hearings.hearing_date BETWEEN ? AND ?
       ORDER BY hearings.hearing_date`
    )
    .all(todayStr(), end.toISOString().slice(0, 10));
  res.json(rows);
});

router.post("/", (req, res) => {
  const { case_id, hearing_date, purpose, outcome, next_hearing_date } = req.body;
  if (!case_id || !hearing_date) {
    return res.status(400).json({ error: "case_id and hearing_date are required" });
  }
  const result = db
    .prepare(
      `INSERT INTO hearings (case_id, hearing_date, purpose, outcome, next_hearing_date)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(case_id, hearing_date, purpose || null, outcome || null, next_hearing_date || null);
  res
    .status(201)
    .json(db.prepare("SELECT * FROM hearings WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM hearings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Hearing not found" });
  const { hearing_date, purpose, outcome, next_hearing_date } = req.body;
  db.prepare(
    `UPDATE hearings SET hearing_date=?, purpose=?, outcome=?, next_hearing_date=? WHERE id=?`
  ).run(
    hearing_date ?? existing.hearing_date,
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
