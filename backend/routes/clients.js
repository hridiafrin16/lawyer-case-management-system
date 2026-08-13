import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// List / search clients
router.get("/", (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db
      .prepare(
        "SELECT * FROM clients WHERE name LIKE ? OR mobile LIKE ? ORDER BY name"
      )
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare("SELECT * FROM clients ORDER BY name").all();
  }
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const cases = db
    .prepare("SELECT * FROM cases WHERE client_id = ? ORDER BY created_at DESC")
    .all(req.params.id);
  res.json({ ...client, cases });
});

router.post("/", (req, res) => {
  const { name, mobile, address, national_id } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ error: "Name and mobile number are required" });
  }
  const nationalId = national_id || null;
  if (nationalId) {
    const existingNationalId = db
      .prepare("SELECT id FROM clients WHERE national_id = ?")
      .get(nationalId);
    if (existingNationalId) {
      return res.status(400).json({ error: "National ID already exists." });
    }
  }
  const result = db
    .prepare(
      "INSERT INTO clients (name, mobile, address, national_id) VALUES (?, ?, ?, ?)"
    )
    .run(name, mobile, address || null, nationalId);
  res.status(201).json(db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Client not found" });
  const { name, mobile, address, national_id } = req.body;
  db.prepare(
    "UPDATE clients SET name = ?, mobile = ?, address = ?, national_id = ? WHERE id = ?"
  ).run(
    name ?? existing.name,
    mobile ?? existing.mobile,
    address ?? existing.address,
    national_id ?? existing.national_id,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Client not found" });
  db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
  res.json({ message: "Client deleted" });
});

export default router;
