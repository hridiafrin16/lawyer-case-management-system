import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

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
    .prepare("SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date DESC")
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
    filed_date,
    description,
  } = req.body;
  if (!case_number || !client_id || !case_type) {
    return res
      .status(400)
      .json({ error: "case_number, client_id and case_type are required" });
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO cases (case_number, client_id, case_type, court_name, judge_name, opposite_party, status, filed_date, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        case_number,
        client_id,
        case_type,
        court_name || null,
        judge_name || null,
        opposite_party || null,
        status || "Running",
        filed_date || null,
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
    "filed_date",
    "description",
  ];
  const updated = {};
  fields.forEach((f) => (updated[f] = req.body[f] ?? existing[f]));
  db.prepare(
    `UPDATE cases SET case_number=?, client_id=?, case_type=?, court_name=?, judge_name=?, opposite_party=?, status=?, filed_date=?, description=? WHERE id=?`
  ).run(
    updated.case_number,
    updated.client_id,
    updated.case_type,
    updated.court_name,
    updated.judge_name,
    updated.opposite_party,
    updated.status,
    updated.filed_date,
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
