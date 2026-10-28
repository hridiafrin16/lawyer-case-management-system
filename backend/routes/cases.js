import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const VALID_STATUSES = ["Running", "Pending", "Closed"];
const VALID_OUTCOMES = ["Not decided", "Won", "Lost", "Settled", "Withdrawn"];

function normalizeCasePayload(body, existing = {}) {
  const status = body.status ?? existing.status ?? "Running";
  const requestedOutcome = body.outcome ?? existing.outcome ?? "Not decided";
  const outcome = status === "Closed" ? requestedOutcome : "Not decided";
  const closedDate = status === "Closed" ? (body.closed_date ?? existing.closed_date ?? null) : null;

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Invalid case status" };
  }
  if (!VALID_OUTCOMES.includes(outcome)) {
    return { error: "Invalid case outcome" };
  }

  return {
    status,
    outcome,
    closed_date: closedDate || null,
  };
}

// List / search / filter cases
router.get("/", (req, res) => {
  const { q, status, case_type, court_name, client_id } = req.query;
  let sql = `
    SELECT cases.*, clients.name AS client_name, clients.mobile AS client_mobile
    FROM cases JOIN clients ON cases.client_id = clients.id
    WHERE 1=1
  `;
  const params = [];
  if (q) {
    sql += ` AND (cases.case_number LIKE ? OR clients.name LIKE ? OR cases.court_name LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    sql += ` AND cases.status = ?`;
    params.push(status);
  }
  if (case_type) {
    sql += ` AND cases.case_type = ?`;
    params.push(case_type);
  }
  if (court_name) {
    sql += ` AND cases.court_name LIKE ?`;
    params.push(`%${court_name}%`);
  }
  if (client_id) {
    sql += ` AND cases.client_id = ?`;
    params.push(client_id);
  }
  sql += ` ORDER BY cases.created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get("/:id", (req, res) => {
  const c = db
    .prepare(
      `SELECT cases.*, clients.name AS client_name, clients.mobile AS client_mobile
       FROM cases JOIN clients ON cases.client_id = clients.id WHERE cases.id = ?`
    )
    .get(req.params.id);
  if (!c) return res.status(404).json({ error: "Case not found" });
  const hearings = db
    .prepare("SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date DESC, hearing_time DESC")
    .all(req.params.id);
  const documents = db
    .prepare("SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at DESC")
    .all(req.params.id);
  const notes = db
    .prepare("SELECT * FROM notes WHERE case_id = ? ORDER BY created_at DESC")
    .all(req.params.id);
  const payments = db
    .prepare("SELECT * FROM payments WHERE case_id = ? ORDER BY created_at DESC")
    .all(req.params.id);
  res.json({ ...c, hearings, documents, notes, payments });
});

router.post("/", (req, res) => {
  const {
    case_number,
    client_id,
    case_type,
    court_name,
    judge_name,
    opposite_party,
    status,
    outcome,
    filed_date,
    closed_date,
    description,
  } = req.body;
  if (!case_number || !client_id || !case_type) {
    return res
      .status(400)
      .json({ error: "case_number, client_id and case_type are required" });
  }
  const normalized = normalizeCasePayload({ status, outcome, closed_date });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    const result = db
      .prepare(
        `INSERT INTO cases (case_number, client_id, case_type, court_name, judge_name, opposite_party, status, outcome, filed_date, closed_date, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        case_number,
        client_id,
        case_type,
        court_name || null,
        judge_name || null,
        opposite_party || null,
        normalized.status,
        normalized.outcome,
        filed_date || null,
        normalized.closed_date,
        description || null
      );
    res
      .status(201)
      .json(db.prepare("SELECT * FROM cases WHERE id = ?").get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Case number already exists" });
    }
    res.status(500).json({ error: "Failed to create case" });
  }
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Case not found" });
  const fields = [
    "case_number",
    "client_id",
    "case_type",
    "court_name",
    "judge_name",
    "opposite_party",
    "status",
    "outcome",
    "filed_date",
    "closed_date",
    "description",
  ];
  const updated = {};
  fields.forEach((f) => (updated[f] = req.body[f] ?? existing[f]));
  const normalized = normalizeCasePayload(updated, existing);
  if (normalized.error) return res.status(400).json({ error: normalized.error });
  updated.status = normalized.status;
  updated.outcome = normalized.outcome;
  updated.closed_date = normalized.closed_date;

  db.prepare(
    `UPDATE cases SET case_number=?, client_id=?, case_type=?, court_name=?, judge_name=?, opposite_party=?, status=?, outcome=?, filed_date=?, closed_date=?, description=? WHERE id=?`
  ).run(
    updated.case_number,
    updated.client_id,
    updated.case_type,
    updated.court_name,
    updated.judge_name,
    updated.opposite_party,
    updated.status,
    updated.outcome,
    updated.filed_date,
    updated.closed_date,
    updated.description,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Case not found" });
  db.prepare("DELETE FROM cases WHERE id = ?").run(req.params.id);
  res.json({ message: "Case deleted" });
});

export default router;
