import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/case/:caseId", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM notes WHERE case_id = ? ORDER BY created_at DESC")
    .all(req.params.caseId);
  res.json(rows);
});

router.post("/case/:caseId", (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Note content is required" });
  const result = db
    .prepare("INSERT INTO notes (case_id, content) VALUES (?, ?)")
    .run(req.params.caseId, content);
  res.status(201).json(db.prepare("SELECT * FROM notes WHERE id = ?").get(result.lastInsertRowid));
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Note not found" });
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ message: "Note deleted" });
});

export default router;
