import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { selectDocumentsDirectory } from "../storagePaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadsDir = path.join(__dirname, "..", "uploads");
const uploadDir = selectDocumentsDirectory(process.env.DOCUMENTS_DIR, localUploadsDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedExt = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif"];
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

const router = express.Router();
router.use(requireAuth);

router.get("/case/:caseId", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM documents WHERE case_id = ? ORDER BY uploaded_at DESC")
    .all(req.params.caseId);
  res.json(rows);
});

router.post("/case/:caseId", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { doc_type } = req.body;
  const result = db
    .prepare(
      "INSERT INTO documents (case_id, file_name, stored_name, doc_type) VALUES (?, ?, ?, ?)"
    )
    .run(req.params.caseId, req.file.originalname, req.file.filename, doc_type || "General");
  res
    .status(201)
    .json(db.prepare("SELECT * FROM documents WHERE id = ?").get(result.lastInsertRowid));
});

router.get("/download/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.download(path.join(uploadDir, doc.stored_name), doc.file_name);
});

router.delete("/:id", (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  const filePath = path.join(uploadDir, doc.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  res.json({ message: "Document deleted" });
});

export default router;
