import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getPaymentStatus, getPaymentSummary, getOutstandingPayments } from "../services/automation.js";

const router = express.Router();
router.use(requireAuth);

router.get("/summary", (req, res) => {
  res.json(getPaymentSummary());
});

router.get("/", (req, res) => {
  const { client_id, case_id } = req.query;
  let sql = `SELECT payments.*, clients.name AS client_name, cases.case_number
             FROM payments
             JOIN clients ON payments.client_id = clients.id
             LEFT JOIN cases ON payments.case_id = cases.id
             WHERE 1=1`;
  const params = [];
  if (client_id) {
    sql += " AND payments.client_id = ?";
    params.push(client_id);
  }
  if (case_id) {
    sql += " AND payments.case_id = ?";
    params.push(case_id);
  }
  sql += " ORDER BY payments.created_at DESC";
  const status = String(req.query.status || "").toUpperCase();
  const rows = db.prepare(sql).all(...params).map((payment) => ({
    ...payment,
    remaining: Number(payment.amount_due || 0) - Number(payment.amount_paid || 0),
    status: getPaymentStatus(payment),
  }));
  res.json(status && status !== "ALL" ? rows.filter((payment) => payment.status === status) : rows);
});

router.get("/due", (req, res) => {
  res.json(getOutstandingPayments());
});

router.post("/", (req, res) => {
  const { client_id, case_id, amount_due, amount_paid, payment_date, due_date, note } = req.body;
  if (!client_id || amount_due === undefined) {
    return res.status(400).json({ error: "client_id and amount_due are required" });
  }
  const result = db
    .prepare(
      `INSERT INTO payments (client_id, case_id, amount_due, amount_paid, payment_date, due_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      client_id,
      case_id || null,
      amount_due,
      amount_paid || 0,
      payment_date || null,
      due_date || null,
      note || null
    );
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ...payment, remaining: payment.amount_due - payment.amount_paid, status: getPaymentStatus(payment) });
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Payment record not found" });
  const { amount_due, amount_paid, payment_date, due_date, note } = req.body;
  db.prepare(
    `UPDATE payments SET amount_due=?, amount_paid=?, payment_date=?, due_date=?, note=? WHERE id=?`
  ).run(
    amount_due ?? existing.amount_due,
    amount_paid ?? existing.amount_paid,
    payment_date ?? existing.payment_date,
    due_date === undefined ? existing.due_date : due_date,
    note ?? existing.note,
    req.params.id
  );
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  res.json({ ...payment, remaining: payment.amount_due - payment.amount_paid, status: getPaymentStatus(payment) });
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Payment record not found" });
  db.prepare("DELETE FROM payments WHERE id = ?").run(req.params.id);
  res.json({ message: "Payment record deleted" });
});

export default router;
