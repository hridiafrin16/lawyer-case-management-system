import db from "../db.js";

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function localDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateOnly(value) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function daysBetween(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86400000);
}

export function evaluateCaseAttention({ caseRecord, hearings = [], payments = [], documents = [], notes = [] }, today = localDateString()) {
  const issues = [];
  const issueKeys = new Set();
  const addIssue = (key, points, reason, priority, action) => {
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push({ points, reason, priority, action });
  };

  const hearingDays = hearings
    .map((hearing) => ({ hearing, days: daysBetween(today, hearing.hearing_date) }))
    .filter(({ days }) => days >= 0)
    .sort((a, b) => a.days - b.days || String(a.hearing.hearing_time || "").localeCompare(String(b.hearing.hearing_time || "")));
  const nearestHearing = hearingDays[0];

  if (nearestHearing?.days === 0) {
    addIssue("hearing-today", 60, "Hearing today", "HIGH", "Review the case timeline before today's hearing");
  } else if (nearestHearing?.days === 1) {
    addIssue("hearing-tomorrow", 40, "Hearing tomorrow", "HIGH", "Review previous hearing notes");
  } else if (nearestHearing && nearestHearing.days <= 7) {
    addIssue("hearing-week", 20, "Hearing within 7 days", "MEDIUM", "Review case documents before the upcoming hearing");
  }

  const missedHearing = hearings.some((hearing) =>
    hearing.hearing_date < today && !String(hearing.outcome || "").trim() && !hearing.next_hearing_date
  );
  if (missedHearing) {
    addIssue(
      "overdue-hearing",
      35,
      "Past hearing has no outcome or next hearing recorded",
      "HIGH",
      "Review the past hearing record and update its outcome or next date"
    );
  }

  const outstandingPayments = payments.filter((payment) =>
    Number(payment.amount_due || 0) > Number(payment.amount_paid || 0)
  );
  const overduePayment = outstandingPayments.some((payment) => {
    const dueDate = dateOnly(payment.due_date);
    return Boolean(dueDate && dueDate < today);
  });
  if (overduePayment) {
    addIssue("overdue-payment", 25, "Payment overdue", "HIGH", "Follow up regarding the outstanding payment");
  } else if (outstandingPayments.length > 0) {
    addIssue("outstanding-payment", 15, "Outstanding payment", "MEDIUM", "Review the client's payment status");
  }

  const activityDates = [
    caseRecord.created_at,
    ...hearings.map((hearing) => hearing.hearing_date),
    ...documents.map((document) => document.uploaded_at),
    ...payments.map((payment) => payment.payment_date || payment.created_at),
    ...notes.map((note) => note.created_at),
  ].map(dateOnly).filter((date) => date && date <= today);
  const lastActivity = activityDates.sort().at(-1);
  const daysSinceActivity = lastActivity ? daysBetween(lastActivity, today) : Number.POSITIVE_INFINITY;
  if (daysSinceActivity >= 90) {
    addIssue("inactive-90", 20, "No case activity in 90+ days", "MEDIUM", "Update the case notes");
  } else if (daysSinceActivity >= 30) {
    addIssue("inactive-30", 10, "No recent case activity", "MEDIUM", "Update the case notes");
  }

  if (documents.length === 0) {
    addIssue("no-documents", 10, "No case documents recorded", "MEDIUM", "Review and upload relevant case documents");
  } else if (documents.length === 1) {
    addIssue("limited-documents", 5, "Limited case documents recorded", "LOW", "Review and upload relevant case documents");
  }

  const score = Math.min(100, issues.reduce((total, issue) => total + issue.points, 0));
  const level = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  const reasons = [...new Set([...issues].sort((a, b) => b.points - a.points).map((issue) => issue.reason))];
  const recommendations = [];
  const actionKeys = new Set();
  for (const issue of [...issues].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.points - a.points)) {
    if (actionKeys.has(issue.action)) continue;
    actionKeys.add(issue.action);
    recommendations.push({ priority: issue.priority, action: issue.action, reason: issue.reason });
  }

  return { score, level, reasons, recommendations };
}

export function calculateCaseAttention(caseId, today = localDateString()) {
  const caseRecord = db.prepare("SELECT id, created_at FROM cases WHERE id = ?").get(caseId);
  if (!caseRecord) return null;
  const hearings = db.prepare(
    "SELECT hearing_date, hearing_time, outcome, next_hearing_date FROM hearings WHERE case_id = ?"
  ).all(caseId);
  const documents = db.prepare(
    "SELECT uploaded_at FROM documents WHERE case_id = ?"
  ).all(caseId);
  const payments = db.prepare(
    "SELECT amount_due, amount_paid, due_date, payment_date, created_at FROM payments WHERE case_id = ?"
  ).all(caseId);
  const notes = db.prepare(
    "SELECT created_at FROM notes WHERE case_id = ?"
  ).all(caseId);

  return evaluateCaseAttention({ caseRecord, hearings, documents, payments, notes }, today);
}

export function getCasesNeedingAttention(limit = 5, today = localDateString()) {
  const cases = db.prepare(
    `SELECT cases.id, cases.case_number, cases.created_at, clients.name AS client_name
     FROM cases JOIN clients ON cases.client_id = clients.id`
  ).all();

  return cases
    .map((caseRecord) => {
      const attention = calculateCaseAttention(caseRecord.id, today);
      return {
        case_id: caseRecord.id,
        case_number: caseRecord.case_number,
        client_name: caseRecord.client_name,
        ...attention,
        main_reason: attention.reasons[0] || "No current attention issues",
      };
    })
    .filter((caseRecord) => caseRecord.score > 0)
    .sort((a, b) => b.score - a.score || a.case_number.localeCompare(b.case_number))
    .slice(0, limit);
}
