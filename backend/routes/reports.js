import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.get("/summary", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS c FROM cases").get().c;
  const running = db
    .prepare("SELECT COUNT(*) AS c FROM cases WHERE status = 'Running'")
    .get().c;
  const pending = db
    .prepare("SELECT COUNT(*) AS c FROM cases WHERE status = 'Pending'")
    .get().c;
  const closed = db
    .prepare("SELECT COUNT(*) AS c FROM cases WHERE status = 'Closed'")
    .get().c;
  const totalClients = db.prepare("SELECT COUNT(*) AS c FROM clients").get().c;
  const dueTotals = db
    .prepare(
      "SELECT COALESCE(SUM(amount_due),0) AS due, COALESCE(SUM(amount_paid),0) AS paid FROM payments"
    )
    .get();
  res.json({
    totalCases: total,
    runningCases: running,
    pendingCases: pending,
    closedCases: closed,
    totalClients,
    totalDue: dueTotals.due,
    totalPaid: dueTotals.paid,
    totalOutstanding: dueTotals.due - dueTotals.paid,
  });
});

router.get("/monthly-cases", (req, res) => {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
       FROM cases GROUP BY month ORDER BY month DESC LIMIT 12`
    )
    .all();
  res.json(rows);
});

router.get("/due-payments", (req, res) => {
  const rows = db
    .prepare(
      `SELECT payments.*, clients.name AS client_name, cases.case_number
       FROM payments
       JOIN clients ON payments.client_id = clients.id
       LEFT JOIN cases ON payments.case_id = cases.id
       WHERE amount_paid < amount_due
       ORDER BY (amount_due - amount_paid) DESC`
    )
    .all();
  res.json(rows);
});

export default router;
