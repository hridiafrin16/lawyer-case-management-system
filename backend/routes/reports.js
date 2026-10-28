import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getHearingReminders, getPaymentSummary } from "../services/automation.js";

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
  const totalDocuments = db.prepare("SELECT COUNT(*) AS c FROM documents").get().c;
  const outcomeTotals = db
    .prepare(
      `SELECT
       SUM(CASE WHEN outcome = 'Won' THEN 1 ELSE 0 END) AS won,
       SUM(CASE WHEN outcome = 'Lost' THEN 1 ELSE 0 END) AS lost
       FROM cases
       WHERE status = 'Closed'`
    )
    .get();
  const wonCases = Number(outcomeTotals.won || 0);
  const lostCases = Number(outcomeTotals.lost || 0);
  const decidedCases = wonCases + lostCases;
  const successRate = decidedCases === 0 ? 0 : Math.round((wonCases / decidedCases) * 100);
  const durationTotals = db
    .prepare(
      `SELECT AVG(julianday(closed_date) - julianday(filed_date)) AS avgDuration
       FROM cases
       WHERE status = 'Closed'
         AND filed_date IS NOT NULL
         AND filed_date != ''
         AND closed_date IS NOT NULL
         AND closed_date != ''`
    )
    .get();
  const avgDuration = Math.round(Number(durationTotals.avgDuration || 0));
  const paymentSummary = getPaymentSummary();
  const hearingReminders = getHearingReminders();
  res.json({
    totalCases: total,
    runningCases: running,
    pendingCases: pending,
    closedCases: closed,
    totalClients,
    totalDocuments,
    successRate,
    avgDuration,
    totalDue: paymentSummary.totalDue,
    totalPaid: paymentSummary.totalPaid,
    totalOutstanding: paymentSummary.totalOutstanding,
    hearingToday: hearingReminders.counts.today,
    hearingTomorrow: hearingReminders.counts.tomorrow,
    upcomingHearings: hearingReminders.counts.upcoming,
    overdueHearings: hearingReminders.counts.overdue,
    paidPayments: paymentSummary.paidCount,
    partialPayments: paymentSummary.partialCount,
    duePayments: paymentSummary.dueCount,
    overduePayments: paymentSummary.overdueCount,
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
  const rows = getPaymentSummary().outstandingPayments;
  res.json(rows);
});

export default router;
