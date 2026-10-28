import db from "../db.js";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

const hearingRows = db.prepare(
  `SELECT hearings.id, hearings.case_id, cases.case_number, clients.name AS client_name,
          hearings.hearing_date, hearings.hearing_time, hearings.purpose, hearings.outcome,
          hearings.next_hearing_date, cases.court_name
   FROM hearings
   JOIN cases ON hearings.case_id = cases.id
   JOIN clients ON cases.client_id = clients.id
   ORDER BY hearings.hearing_date, hearings.hearing_time IS NULL, hearings.hearing_time`
);

function classifyHearing(hearing, today, now) {
  const completed = Boolean(hearing.outcome?.trim() || hearing.next_hearing_date);
  if (hearing.hearing_date < today) return completed ? null : "OVERDUE";
  if (hearing.hearing_date === today) {
    if (hearing.hearing_time && hearing.hearing_time.slice(0, 5) < now) {
      return completed ? null : "OVERDUE";
    }
    return "TODAY";
  }
  if (hearing.hearing_date === addDays(today, 1)) return "TOMORROW";
  if (hearing.hearing_date <= addDays(today, 7)) return "UPCOMING";
  return null;
}

export function getHearingReminders() {
  const nowDate = new Date();
  const today = localDateString(nowDate);
  const now = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;
  const reminders = hearingRows.all().flatMap((hearing) => {
    const status = classifyHearing(hearing, today, now);
    return status ? [{ ...hearing, reminderStatus: status }] : [];
  });
  const grouped = {
    today: reminders.filter((item) => item.reminderStatus === "TODAY"),
    tomorrow: reminders.filter((item) => item.reminderStatus === "TOMORROW"),
    upcoming: reminders.filter((item) => item.reminderStatus === "UPCOMING"),
    overdue: reminders.filter((item) => item.reminderStatus === "OVERDUE"),
  };
  return {
    ...grouped,
    counts: Object.fromEntries(Object.entries(grouped).map(([key, items]) => [key, items.length])),
  };
}

const paymentRows = db.prepare(
  `SELECT payments.*, clients.name AS client_name, cases.case_number
   FROM payments
   JOIN clients ON payments.client_id = clients.id
   LEFT JOIN cases ON payments.case_id = cases.id
   ORDER BY payments.created_at DESC`
);

export function getPaymentStatus(payment, today = localDateString()) {
  const due = Number(payment.amount_due || 0);
  const paid = Number(payment.amount_paid || 0);
  const remaining = due - paid;
  let status;
  if (paid >= due) status = "PAID";
  else if (paid > 0) status = "PARTIAL";
  else status = "DUE";
  if (remaining > 0 && payment.due_date && payment.due_date < today) status = "OVERDUE";
  return status;
}

export function getOutstandingPayments() {
  return paymentRows.all()
    .map((payment) => ({
      ...payment,
      remaining: Number(payment.amount_due || 0) - Number(payment.amount_paid || 0),
      status: getPaymentStatus(payment),
    }))
    .filter((payment) => payment.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);
}

export function getPaymentSummary() {
  const payments = paymentRows.all().map((payment) => ({
    ...payment,
    amount_due: Number(payment.amount_due || 0),
    amount_paid: Number(payment.amount_paid || 0),
    remaining: Number(payment.amount_due || 0) - Number(payment.amount_paid || 0),
    status: getPaymentStatus(payment),
  }));
  const outstanding = payments.filter((payment) => payment.remaining > 0);
  return {
    totalDue: payments.reduce((sum, payment) => sum + payment.amount_due, 0),
    totalPaid: payments.reduce((sum, payment) => sum + payment.amount_paid, 0),
    totalOutstanding: outstanding.reduce((sum, payment) => sum + payment.remaining, 0),
    paidCount: payments.filter((payment) => payment.status === "PAID").length,
    partialCount: payments.filter((payment) => payment.status === "PARTIAL").length,
    dueCount: payments.filter((payment) => payment.status === "DUE").length,
    overdueCount: payments.filter((payment) => payment.status === "OVERDUE").length,
    outstandingPayments: outstanding.sort((a, b) => b.remaining - a.remaining),
  };
}
