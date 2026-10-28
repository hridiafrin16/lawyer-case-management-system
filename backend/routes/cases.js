import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateCaseAttention, getCasesNeedingAttention } from "../services/caseAttention.js";
import { getHearingReminders, getPaymentStatus } from "../services/automation.js";

const router = express.Router();
router.use(requireAuth);

const VALID_STATUSES = ["Running", "Pending", "Closed"];
const VALID_OUTCOMES = ["Not decided", "Won", "Lost", "Settled", "Withdrawn"];

function buildCaseTimeline(caseId) {
  const caseRecord = db
    .prepare("SELECT id, case_number, case_type, filed_date, created_at FROM cases WHERE id = ?")
    .get(caseId);
  if (!caseRecord) return null;

  const events = [{
    id: `case-${caseRecord.id}`,
    event_type: "CASE_CREATED",
    event_date: caseRecord.filed_date || caseRecord.created_at,
    title: caseRecord.filed_date ? "Case filed" : "Case created",
    description: `Case ${caseRecord.case_number} · ${caseRecord.case_type}`,
    metadata: {
      case_id: caseRecord.id,
      case_number: caseRecord.case_number,
      case_type: caseRecord.case_type,
      filed_date: caseRecord.filed_date,
    },
  }];

  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const hearings = db.prepare(
    `SELECT id, hearing_date, hearing_time, purpose, outcome, next_hearing_date
     FROM hearings WHERE case_id = ?`
  ).all(caseId);
  for (const hearing of hearings) {
    const future = hearing.hearing_date > today;
    const details = [
      hearing.purpose && `Purpose: ${hearing.purpose}`,
      hearing.outcome && `Outcome: ${hearing.outcome}`,
      hearing.hearing_time && `Time: ${hearing.hearing_time}`,
      hearing.next_hearing_date && `Next hearing: ${hearing.next_hearing_date}`,
    ].filter(Boolean);
    events.push({
      id: `hearing-${hearing.id}`,
      event_type: "HEARING",
      event_date: hearing.hearing_date,
      title: future ? "Next hearing" : "Hearing conducted",
      description: details.join(" · ") || "Hearing record",
      metadata: { ...hearing },
    });
  }

  const documents = db.prepare(
    `SELECT id, file_name, doc_type, uploaded_at
     FROM documents WHERE case_id = ?`
  ).all(caseId);
  for (const document of documents) {
    events.push({
      id: `document-${document.id}`,
      event_type: "DOCUMENT",
      event_date: document.uploaded_at,
      title: "Document added",
      description: [document.file_name, document.doc_type].filter(Boolean).join(" · "),
      metadata: { ...document },
    });
  }

  const payments = db.prepare(
    `SELECT id, amount_due, amount_paid, payment_date, due_date, note, created_at
     FROM payments WHERE case_id = ?`
  ).all(caseId);
  for (const payment of payments) {
    const remaining = Number(payment.amount_due || 0) - Number(payment.amount_paid || 0);
    events.push({
      id: `payment-${payment.id}`,
      event_type: "PAYMENT",
      event_date: payment.payment_date || payment.created_at,
      title: "Payment received",
      description: `Amount paid: BDT ${Number(payment.amount_paid || 0).toLocaleString()} · Remaining: BDT ${remaining.toLocaleString()}`,
      metadata: { ...payment, remaining },
    });
  }

  const notes = db.prepare(
    "SELECT id, content, created_at FROM notes WHERE case_id = ?"
  ).all(caseId);
  for (const note of notes) {
    events.push({
      id: `note-${note.id}`,
      event_type: "NOTE",
      event_date: note.created_at,
      title: "Case note added",
      description: note.content,
      metadata: { ...note },
    });
  }

  events.sort((a, b) => {
    const aTime = Date.parse(String(a.event_date).replace(" ", "T"));
    const bTime = Date.parse(String(b.event_date).replace(" ", "T"));
    return aTime - bTime || a.event_type.localeCompare(b.event_type) || a.id.localeCompare(b.id);
  });
  return events;
}

function localDateString(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function daysBetweenDates(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  return Math.round((Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) / 86400000);
}

function briefValue(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "Not available";
  return value;
}

function formatBriefAmount(value) {
  return `BDT ${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

function buildCaseBrief(caseId) {
  const row = db.prepare(
    `SELECT cases.*, clients.id AS brief_client_id, clients.name AS client_name,
            clients.mobile AS client_mobile
     FROM cases JOIN clients ON cases.client_id = clients.id
     WHERE cases.id = ?`
  ).get(caseId);
  if (!row) return null;

  const today = localDateString();
  const allHearings = db.prepare(
    `SELECT id, hearing_date, hearing_time, purpose, outcome, next_hearing_date
     FROM hearings WHERE case_id = ?`
  ).all(caseId);
  const byDateAscending = (a, b) => a.hearing_date.localeCompare(b.hearing_date)
    || String(a.hearing_time || "99:99").localeCompare(String(b.hearing_time || "99:99"));
  const latestHearing = allHearings
    .filter((hearing) => hearing.hearing_date <= today)
    .sort((a, b) => -byDateAscending(a, b))[0] || null;
  const upcomingHearing = allHearings
    .filter((hearing) => hearing.hearing_date > today)
    .sort(byDateAscending)[0] || null;
  const recordedNextDate = !upcomingHearing
    ? allHearings.map((hearing) => hearing.next_hearing_date).filter((date) => date && date > today).sort()[0]
    : null;
  const nextHearing = upcomingHearing || (recordedNextDate ? {
    id: null,
    hearing_date: recordedNextDate,
    hearing_time: null,
    purpose: null,
    outcome: null,
    next_hearing_date: null,
  } : null);
  let upcomingStatus = "Not available";
  if (nextHearing) {
    const daysUntil = daysBetweenDates(today, nextHearing.hearing_date);
    upcomingStatus = daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : daysUntil <= 7 ? "UPCOMING" : "SCHEDULED";
    if (upcomingHearing?.id) {
      const reminders = getHearingReminders();
      const reminder = [...reminders.today, ...reminders.tomorrow, ...reminders.upcoming, ...reminders.overdue]
        .find((item) => item.id === upcomingHearing.id);
      if (reminder?.reminderStatus) upcomingStatus = reminder.reminderStatus;
    }
  }

  const paymentRows = db.prepare(
    `SELECT id, amount_due, amount_paid, payment_date, due_date, note, created_at
     FROM payments WHERE case_id = ? ORDER BY created_at DESC`
  ).all(caseId).map((payment) => ({
    ...payment,
    amount_due: Number(payment.amount_due || 0),
    amount_paid: Number(payment.amount_paid || 0),
    remaining: Number(payment.amount_due || 0) - Number(payment.amount_paid || 0),
    status: getPaymentStatus(payment),
  }));
  const totalDue = paymentRows.reduce((sum, payment) => sum + payment.amount_due, 0);
  const totalPaid = paymentRows.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const remaining = paymentRows.reduce((sum, payment) => sum + Math.max(0, payment.remaining), 0);
  const paymentStatus = paymentRows.length === 0
    ? "Not available"
    : paymentRows.some((payment) => payment.status === "OVERDUE")
      ? "OVERDUE"
      : getPaymentStatus({ amount_due: totalDue, amount_paid: totalPaid });

  const documentTotal = db.prepare("SELECT COUNT(*) AS count FROM documents WHERE case_id = ?").get(caseId).count;
  const recentDocuments = db.prepare(
    `SELECT id, file_name, doc_type, uploaded_at
     FROM documents WHERE case_id = ? ORDER BY uploaded_at DESC, id DESC LIMIT 5`
  ).all(caseId);
  const notes = db.prepare(
    `SELECT id, content, created_at FROM notes
     WHERE case_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`
  ).all(caseId);
  const timeline = buildCaseTimeline(caseId) || [];
  const recentActivity = timeline.slice(-5).reverse();
  const attention = calculateCaseAttention(caseId);

  const hearingDescription = (hearing) => hearing
    ? `${briefValue(hearing.hearing_date)}${hearing.hearing_time ? ` at ${hearing.hearing_time}` : ""}${hearing.purpose ? ` — ${hearing.purpose}` : ""}${hearing.outcome ? ` — Outcome: ${hearing.outcome}` : ""}`
    : "Not available";
  const paymentDescription = paymentRows.length
    ? `Due: ${formatBriefAmount(totalDue)}; Paid: ${formatBriefAmount(totalPaid)}; Remaining: ${formatBriefAmount(remaining)}; Status: ${paymentStatus}`
    : "Not available";
  const documentDescription = documentTotal
    ? `${documentTotal} recorded: ${recentDocuments.map((document) => document.file_name).join(", ")}`
    : "0 recorded; Not available";
  const activityDescription = recentActivity.length
    ? recentActivity.map((event) => `${event.event_date} — ${event.title}${event.description ? `: ${event.description}` : ""}`).join("\n")
    : "Not available";
  const recommendationText = attention.recommendations.length
    ? attention.recommendations.map((item) => item.action).join("\n")
    : "Not available";
  const reasonText = attention.reasons.length ? attention.reasons.join("\n") : "Not available";
  const summary = [
    `Case ${briefValue(row.case_number)} is a ${briefValue(row.case_type)} case for client ${briefValue(row.client_name)}, currently marked as ${briefValue(row.status)}.`,
    `Court: ${briefValue(row.court_name)}\nJudge: ${briefValue(row.judge_name)}\nOpposite Party: ${briefValue(row.opposite_party)}\nFiled Date: ${briefValue(row.filed_date)}\nDescription: ${briefValue(row.description)}`,
    `Latest Hearing: ${hearingDescription(latestHearing)}\nNext Hearing: ${hearingDescription(nextHearing)}\nUpcoming Hearing Status: ${upcomingStatus}`,
    `Payment: ${paymentDescription}`,
    `Documents: ${documentDescription}`,
    `Recent Activity:\n${activityDescription}`,
    `Attention: ${attention.score} / 100 — ${attention.level}\nReasons:\n${reasonText}\nRecommended Actions:\n${recommendationText}`,
  ].join("\n\n");

  return {
    generated_at: new Date().toISOString(),
    case: {
      id: row.id,
      case_number: briefValue(row.case_number),
      case_type: briefValue(row.case_type),
      status: briefValue(row.status),
      filed_date: briefValue(row.filed_date),
      description: briefValue(row.description),
    },
    client: {
      id: row.brief_client_id,
      name: briefValue(row.client_name),
      mobile: briefValue(row.client_mobile),
    },
    court: {
      name: briefValue(row.court_name),
      judge: briefValue(row.judge_name),
      opposite_party: briefValue(row.opposite_party),
    },
    hearings: {
      latest: latestHearing ? {
        id: latestHearing.id,
        date: briefValue(latestHearing.hearing_date),
        time: briefValue(latestHearing.hearing_time),
        purpose: briefValue(latestHearing.purpose),
        outcome: briefValue(latestHearing.outcome),
      } : null,
      next: nextHearing ? {
        id: nextHearing.id,
        date: briefValue(nextHearing.hearing_date),
        time: briefValue(nextHearing.hearing_time),
        purpose: briefValue(nextHearing.purpose),
      } : null,
      upcoming_status: upcomingStatus,
      count: allHearings.length,
    },
    payments: {
      count: paymentRows.length,
      total_due: paymentRows.length ? totalDue : null,
      total_paid: paymentRows.length ? totalPaid : null,
      remaining: paymentRows.length ? remaining : null,
      status: paymentStatus,
      records: paymentRows,
    },
    documents: {
      total: documentTotal,
      recent: recentDocuments,
    },
    notes,
    timeline,
    recent_activity: recentActivity,
    attention,
    summary,
  };
}

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

router.get("/:id/brief", (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid case ID" });
  }
  const brief = buildCaseBrief(req.params.id);
  if (!brief) return res.status(404).json({ error: "Case not found" });
  res.json(brief);
});

router.get("/attention", (req, res) => {
  res.json(getCasesNeedingAttention(5));
});

router.get("/:id/attention", (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid case ID" });
  }
  const attention = calculateCaseAttention(req.params.id);
  if (!attention) return res.status(404).json({ error: "Case not found" });
  res.json(attention);
});

router.get("/:id/timeline", (req, res) => {
  const timeline = buildCaseTimeline(req.params.id);
  if (!timeline) return res.status(404).json({ error: "Case not found" });
  res.json(timeline);
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
