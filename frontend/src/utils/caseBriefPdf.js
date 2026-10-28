export function caseBriefFilename(caseNumber) {
  const safeNumber = String(caseNumber || "case")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "")
    .slice(0, 80) || "case";
  return `Case_Brief_${safeNumber}.pdf`;
}

const MARGIN = 46;
const LINE_GAP = 12;
const VALUE_GAP = 5;
const NOT_AVAILABLE = "Not available";

function valueOf(value) {
  if (value === null || value === undefined || value === "") return NOT_AVAILABLE;
  return String(value);
}

function dateTime(value) {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

export async function createCaseBriefPdf(brief) {
  if (!brief?.case) throw new Error("Generate the Case Brief before exporting it.");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottom = pageHeight - MARGIN - 22;
  let y = MARGIN;

  function ensureSpace(height) {
    if (y + height <= bottom) return;
    pdf.addPage();
    y = MARGIN;
  }

  function wrapped(text, width, size = 9) {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(valueOf(text), width);
  }

  function paragraph(text, { indent = 0, size = 9, after = VALUE_GAP, bold = false } = {}) {
    const width = contentWidth - indent;
    const lines = wrapped(text, width, size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    lines.forEach((line) => {
      ensureSpace(LINE_GAP);
      pdf.text(line, MARGIN + indent, y);
      y += LINE_GAP;
    });
    y += after;
  }

  function section(title) {
    ensureSpace(58);
    y += 5;
    pdf.setDrawColor(190, 198, 207);
    pdf.setLineWidth(0.7);
    pdf.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 17;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(36, 53, 72);
    pdf.text(title, MARGIN, y);
    y += 17;
    pdf.setTextColor(35, 35, 35);
  }

  function field(label, value) {
    const labelWidth = 142;
    const valueX = MARGIN + labelWidth;
    const valueWidth = contentWidth - labelWidth;
    const labelLines = wrapped(label, labelWidth - 8, 9);
    const valueLines = wrapped(value, valueWidth, 9);
    if (valueLines.length > 3) {
      ensureSpace((labelLines.length + 1) * LINE_GAP);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      labelLines.forEach((line, index) => pdf.text(line, MARGIN, y + index * LINE_GAP));
      y += labelLines.length * LINE_GAP;
      paragraph(value, { indent: 8, after: 5 });
      return;
    }
    const rowHeight = Math.max(labelLines.length, valueLines.length) * LINE_GAP + 3;
    ensureSpace(rowHeight);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    labelLines.forEach((line, index) => pdf.text(line, MARGIN, y + index * LINE_GAP));
    pdf.setFont("helvetica", "normal");
    valueLines.forEach((line, index) => pdf.text(line, valueX, y + index * LINE_GAP));
    y += rowHeight;
  }

  function bullet(text, index) {
    const marker = index === undefined ? "•" : `${index + 1}.`;
    const lines = wrapped(text, contentWidth - 17, 9);
    const rowHeight = Math.max(1, lines.length) * LINE_GAP + 2;
    ensureSpace(rowHeight);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(marker, MARGIN, y);
    lines.forEach((line, lineIndex) => pdf.text(line, MARGIN + 17, y + lineIndex * LINE_GAP));
    y += rowHeight;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(75, 83, 91);
  pdf.text("LAWYER CASE MANAGEMENT SYSTEM", MARGIN, y);
  y += 26;
  pdf.setFontSize(20);
  pdf.setTextColor(25, 43, 61);
  pdf.text("CASE BRIEF", MARGIN, y);
  y += 21;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(55, 55, 55);
  pdf.text(`Case Number: ${valueOf(brief.case.case_number)}`, MARGIN, y);
  y += 14;
  pdf.text(`Generated: ${dateTime(brief.generated_at)}`, MARGIN, y);
  y += 9;

  section("1. CASE INFORMATION");
  [
    ["Case Number", brief.case.case_number], ["Client", brief.client?.name],
    ["Client Mobile", brief.client?.mobile], ["Case Type", brief.case.case_type],
    ["Status", brief.case.status], ["Filed Date", brief.case.filed_date],
    ["Court", brief.court?.name], ["Judge", brief.court?.judge],
    ["Opposite Party", brief.court?.opposite_party],
  ].forEach(([label, value]) => field(label, value));
  field("Case Description", brief.case.description);

  section("2. HEARING SUMMARY");
  field("Latest Hearing", brief.hearings?.latest?.date);
  field("Purpose", brief.hearings?.latest?.purpose);
  field("Outcome", brief.hearings?.latest?.outcome);
  field("Next Hearing", brief.hearings?.next?.date);
  field("Hearing Time", brief.hearings?.next?.time);
  field("Upcoming Status", brief.hearings?.upcoming_status);

  section("3. PAYMENT SUMMARY");
  field("Total Due", brief.payments?.total_due);
  field("Total Paid", brief.payments?.total_paid);
  field("Remaining", brief.payments?.remaining);
  field("Payment Status", brief.payments?.status);

  section("4. DOCUMENTS");
  field("Total Documents", brief.documents?.total ?? 0);
  paragraph("Recent Documents", { bold: true, after: 4 });
  if (brief.documents?.recent?.length) {
    brief.documents.recent.forEach((document) => bullet(
      `${valueOf(document.file_name)} — ${valueOf(document.doc_type)} — ${dateTime(document.uploaded_at)}`,
    ));
  } else bullet(NOT_AVAILABLE);

  section("5. RECENT ACTIVITY");
  paragraph("Recent Notes", { bold: true, after: 3 });
  if (brief.notes?.length) {
    brief.notes.forEach((note) => bullet(`${dateTime(note.created_at)} — ${valueOf(note.content)}`));
  } else bullet(NOT_AVAILABLE);

  paragraph("Case Activity", { bold: true, after: 3 });
  if (brief.recent_activity?.length) {
    brief.recent_activity.forEach((event) => bullet(
      `${dateTime(event.event_date)} — ${valueOf(event.title)}: ${valueOf(event.description)}`,
    ));
  } else bullet(NOT_AVAILABLE);

  section("6. CASE ATTENTION");
  field("Score", `${valueOf(brief.attention?.score)} / 100`);
  field("Level", brief.attention?.level);
  paragraph("Reasons", { bold: true, after: 3 });
  if (brief.attention?.reasons?.length) brief.attention.reasons.forEach((reason) => bullet(reason));
  else bullet(NOT_AVAILABLE);
  paragraph("Recommended Actions", { bold: true, after: 3 });
  if (brief.attention?.recommendations?.length) {
    brief.attention.recommendations.forEach((item, index) => bullet(
      `${valueOf(item.action)} (${valueOf(item.priority)})`, index,
    ));
  } else bullet(NOT_AVAILABLE);

  section("7. CASE SUMMARY");
  paragraph(brief.summary);

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(215, 219, 224);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, pageHeight - MARGIN - 12, pageWidth - MARGIN, pageHeight - MARGIN - 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 105, 110);
    pdf.text(`Case Brief | ${valueOf(brief.case.case_number)} | Page ${page} of ${pageCount}`, MARGIN, pageHeight - MARGIN + 2);
  }

  return pdf;
}

export async function exportCaseBriefPdf(brief) {
  const pdf = await createCaseBriefPdf(brief);
  pdf.save(caseBriefFilename(brief.case.case_number));
}
