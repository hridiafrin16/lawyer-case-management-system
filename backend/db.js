import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { selectDatabasePath } from "./storagePaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDatabasePath = path.join(__dirname, "case_system.db");
const databasePath = selectDatabasePath(process.env.DATABASE_PATH, localDatabasePath);
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'advocate',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  national_id TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL,
  case_type TEXT NOT NULL,
  court_name TEXT,
  judge_name TEXT,
  opposite_party TEXT,
  status TEXT NOT NULL DEFAULT 'Running',
  outcome TEXT NOT NULL DEFAULT 'Not decided',
  filed_date TEXT,
  closed_date TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hearings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  hearing_date TEXT NOT NULL,
  hearing_time TEXT,
  purpose TEXT,
  outcome TEXT,
  next_hearing_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  doc_type TEXT,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  case_id INTEGER,
  amount_due REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_date TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_national_id
ON clients(national_id)
WHERE national_id IS NOT NULL;
`);

const hearingColumns = db.prepare("PRAGMA table_info(hearings)").all();
if (!hearingColumns.some((column) => column.name === "hearing_time")) {
  db.prepare("ALTER TABLE hearings ADD COLUMN hearing_time TEXT").run();
}

const caseColumns = db.prepare("PRAGMA table_info(cases)").all();
if (!caseColumns.some((column) => column.name === "outcome")) {
  db.prepare("ALTER TABLE cases ADD COLUMN outcome TEXT NOT NULL DEFAULT 'Not decided'").run();
}
if (!caseColumns.some((column) => column.name === "closed_date")) {
  db.prepare("ALTER TABLE cases ADD COLUMN closed_date TEXT").run();
}

const paymentColumns = db.prepare("PRAGMA table_info(payments)").all();
if (!paymentColumns.some((column) => column.name === "due_date")) {
  db.prepare("ALTER TABLE payments ADD COLUMN due_date TEXT").run();
}

// Seed a default advocate user if none exists
const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  ).run("Advocate", "admin@example.com", hash, "advocate");
  console.log("Seeded default user -> email: admin@example.com  password: admin123");
}

export default db;
