import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api.js";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { caseBriefFilename, exportCaseBriefPdf } from "../utils/caseBriefPdf.js";

const TABS = ["Overview", "Timeline", "Case Brief", "Hearings", "Documents", "Payments", "Notes"];
const CASE_OUTCOMES = ["Not decided", "Won", "Lost", "Settled", "Withdrawn"];

function normalizeCaseId(value) {
  const candidate = String(value ?? "").trim();
  return /^[1-9]\d*$/.test(candidate) ? candidate : null;
}

export default function CaseDetail() {
  const { id: routeId } = useParams();
  const location = useLocation();
  const pathId = location.pathname.match(/^\/cases\/([^/]+)\/?$/)?.[1];
  const caseId = normalizeCaseId(routeId)
    || normalizeCaseId(location.state?.caseId)
    || normalizeCaseId(pathId);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [attention, setAttention] = useState(null);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionError, setAttentionError] = useState("");
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const briefContentRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [caseError, setCaseError] = useState("");
  const navigate = useNavigate();

  function load() {
    if (!caseId) return Promise.resolve();
    setCaseError("");
    return api.get(`/cases/${caseId}`)
      .then((r) => { setData(r.data); setForm(r.data); })
      .catch((error) => {
        setData(null);
        setForm(null);
        setCaseError(error.response?.data?.error || "Could not load this case.");
      });
  }

  useEffect(() => {
    setBrief(null);
    setBriefError("");
    setTimeline([]);
    setTimelineError("");
    if (!caseId) {
      setData(null);
      setForm(null);
      return;
    }
    setData(null);
    setForm(null);
    load();
  }, [caseId]);

  useEffect(() => {
    if (tab !== "Timeline") return;
    if (!caseId) {
      setTimeline([]);
      setTimelineError("This case has no valid ID. Return to the Cases page and open the case again.");
      setTimelineLoading(false);
      return;
    }
    let active = true;
    setTimelineLoading(true);
    setTimelineError("");
    api.get(`/cases/${caseId}/timeline`)
      .then((response) => { if (active) setTimeline(response.data); })
      .catch((error) => {
        if (active) setTimelineError(error.response?.data?.error || "Could not load this case timeline.");
      })
      .finally(() => { if (active) setTimelineLoading(false); });
    return () => { active = false; };
  }, [tab, caseId]);

  useEffect(() => {
    setAttention(null);
    if (!caseId) {
      setAttention(null);
      setAttentionError("A valid case ID is required to calculate attention.");
      setAttentionLoading(false);
      return;
    }
    let active = true;
    setAttentionLoading(true);
    setAttentionError("");
    api.get(`/cases/${caseId}/attention`)
      .then((response) => { if (active) setAttention(response.data); })
      .catch((error) => {
        if (active) setAttentionError(error.response?.data?.error || "Could not load case attention.");
      })
      .finally(() => { if (active) setAttentionLoading(false); });
    return () => { active = false; };
  }, [caseId]);

  async function handleSave(e) {
    e.preventDefault();
    if (!caseId) return;
    await api.put(`/cases/${caseId}`, form);
    setEditMode(false);
    load();
  }

  async function handleGenerateBrief() {
    if (!caseId) return;
    setBriefLoading(true);
    setBriefError("");
    try {
      const response = await api.get(`/cases/${caseId}/brief`);
      setBrief(response.data);
      setTab("Case Brief");
    } catch (error) {
      setBriefError(error.response?.data?.error || "Could not generate the Case Brief.");
      setTab("Case Brief");
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleExportBrief() {
    if (!brief) return;
    setPdfLoading(true);
    setBriefError("");
    try {
      await exportCaseBriefPdf(brief);
    } catch (error) {
      setBriefError(error.message || "Could not export the Case Brief PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePrintBrief() {
    if (!brief) return;
    const previousTitle = document.title;
    document.title = caseBriefFilename(brief.case.case_number).replace(/\.pdf$/i, "");
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 2000);
  }

  async function handleDelete() {
    if (!confirm("Delete this case and all related hearings, documents, payments and notes?")) return;
    if (!caseId) return;
    await api.delete(`/cases/${caseId}`);
    navigate("/cases");
  }

  if (!caseId) {
    return (
      <div className="panel" role="alert">
        <div className="section-title" style={{ marginTop: 0 }}>Case unavailable</div>
        <p className="page-subtitle">This Case Details URL does not contain a valid case ID.</p>
        <Link to="/cases" className="back-link">← Return to cases</Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="panel" role={caseError ? "alert" : undefined}>
        <div className="empty-state">{caseError || "Loading case details…"}</div>
        {caseError && <Link to="/cases" className="back-link">← Return to cases</Link>}
      </div>
    );
  }

  return (
    <div>
      <Link to="/cases" className="back-link">← Back to cases</Link>
      <div className="page-header">
        <div>
          <h1 className="page-title mono">{data.case_number}</h1>
          <p className="page-subtitle">
            {data.client_name} · {data.case_type} <StatusBadge status={data.status} />
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-accent" onClick={handleGenerateBrief} disabled={briefLoading}>
            {briefLoading ? "Generating…" : "Generate Case Brief"}
          </button>
          <button className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setEditMode(true)}>Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <CaseAttention data={attention} loading={attentionLoading} error={attentionError} />

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab data={data} />}
      {tab === "Timeline" && <CaseTimeline events={timeline} loading={timelineLoading} error={timelineError} />}
      {tab === "Case Brief" && (
        <CaseBriefPanel
          data={brief}
          loading={briefLoading}
          error={briefError}
          contentRef={briefContentRef}
          pdfLoading={pdfLoading}
          onGenerate={handleGenerateBrief}
          onExport={handleExportBrief}
          onPrint={handlePrintBrief}
        />
      )}
      {tab === "Hearings" && <HearingsTab caseId={caseId} hearings={data.hearings} reload={load} />}
      {tab === "Documents" && <DocumentsTab caseId={caseId} documents={data.documents} reload={load} />}
      {tab === "Payments" && <PaymentsTab caseId={caseId} clientId={data.client_id} payments={data.payments} reload={load} />}
      {tab === "Notes" && <NotesTab caseId={caseId} notes={data.notes} reload={load} />}

      {editMode && (
        <Modal title="Edit case" onClose={() => setEditMode(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Case number</label>
                <input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} />
              </div>
              <div className="field">
                <label>Case type</label>
                <input value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })} />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({
                    ...form,
                    status: e.target.value,
                    outcome: e.target.value === "Closed" ? (form.outcome || "Not decided") : "Not decided",
                    closed_date: e.target.value === "Closed" ? (form.closed_date || "") : "",
                  })}
                >
                  <option value="Running">Running</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="field">
                <label>Case outcome</label>
                <select
                  value={form.outcome || "Not decided"}
                  disabled={form.status !== "Closed"}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                >
                  {CASE_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>{outcome}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Filed date</label>
                <input type="date" value={form.filed_date || ""} onChange={(e) => setForm({ ...form, filed_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Closed date</label>
                <input
                  type="date"
                  value={form.closed_date || ""}
                  disabled={form.status !== "Closed"}
                  onChange={(e) => setForm({ ...form, closed_date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Court name</label>
                <input value={form.court_name || ""} onChange={(e) => setForm({ ...form, court_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Judge name</label>
                <input value={form.judge_name || ""} onChange={(e) => setForm({ ...form, judge_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Opposite party</label>
                <input value={form.opposite_party || ""} onChange={(e) => setForm({ ...form, opposite_party: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setEditMode(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent">Save changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CaseAttention({ data, loading, error }) {
  return (
    <section className={`case-attention-panel ${data ? `attention-level-${data.level.toLowerCase()}` : ""}`} aria-label="Case attention">
      <div className="case-attention-heading">
        <div>
          <span className="case-attention-kicker">Case attention</span>
          <h2>Attention score</h2>
        </div>
        {loading ? <span className="case-attention-loading">Calculating…</span> : data && (
          <div className="case-attention-score">
            <strong>{data.score}<small> / 100</small></strong>
            <span>{data.level}</span>
          </div>
        )}
      </div>
      {error ? (
        <p className="case-attention-message" role="status">{error}</p>
      ) : loading ? (
        <p className="case-attention-message">Reviewing current case activity…</p>
      ) : data ? (
        <div className="case-attention-details">
          <div>
            <h3>Reasons</h3>
            {data.reasons.length ? (
              <ul>{data.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            ) : <p>No current attention issues. This case is at a normal level.</p>}
          </div>
          {data.recommendations.length > 0 && (
            <div>
              <h3>Recommended actions</h3>
              <ol>
                {data.recommendations.map((item) => (
                  <li key={`${item.priority}-${item.action}`}>
                    <span className={`case-action-priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
                    {item.action}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function formatBriefTimestamp(value) {
  if (!value || value === "Not available") return "Not available";
  const raw = String(value);
  const hasTime = raw.includes("T") || raw.includes(" ");
  const date = new Date(hasTime ? raw.replace(" ", "T") : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function briefAmount(value) {
  return value === null || value === undefined
    ? "Not available"
    : `BDT ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function BriefField({ label, value }) {
  return (
    <div className="case-brief-field">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

function CaseBriefPanel({ data, loading, error, contentRef, pdfLoading, onGenerate, onExport, onPrint }) {
  if (loading && !data) {
    return <section className="panel"><div className="empty-state">Generating Case Brief…</div></section>;
  }
  if (!data) {
    return (
      <section className="panel case-brief-empty" role={error ? "alert" : undefined}>
        {error ? <p className="error-msg">{error}</p> : <p className="page-subtitle">Generate a current, database-based summary for this case.</p>}
        <button className="btn btn-accent" onClick={onGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate Case Brief"}
        </button>
      </section>
    );
  }

  const brief = data;
  const latest = brief.hearings.latest;
  const next = brief.hearings.next;
  const attention = brief.attention;

  return (
    <div className="case-brief-shell">
      <div className="case-brief-actions">
        <span>{error && <span className="case-brief-export-error" role="status">{error}</span>}</span>
        <div>
          <button className="btn btn-sm" onClick={onGenerate} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh Brief"}
          </button>
          <button className="btn btn-sm btn-accent" onClick={onExport} disabled={pdfLoading}>
            {pdfLoading ? "Creating PDF…" : "Export Case Brief as PDF"}
          </button>
          <button className="btn btn-sm" onClick={onPrint}>Print Case Brief</button>
        </div>
      </div>

      <article className="case-brief-document" ref={contentRef}>
        <header className="case-brief-header">
          <div className="case-brief-app-title">Lawyer Case Management System</div>
          <h2>CASE BRIEF</h2>
          <div className="case-brief-generated">Generated {formatBriefTimestamp(brief.generated_at)}</div>
        </header>

        <section className="case-brief-section">
          <h3>Case Information</h3>
          <div className="case-brief-grid">
            <BriefField label="Case Number" value={brief.case.case_number} />
            <BriefField label="Client" value={brief.client.name} />
            <BriefField label="Client Mobile" value={brief.client.mobile} />
            <BriefField label="Case Type" value={brief.case.case_type} />
            <BriefField label="Current Status" value={brief.case.status} />
            <BriefField label="Filed Date" value={brief.case.filed_date} />
          </div>
          <div className="case-brief-description"><span>Case Description</span><p>{brief.case.description || "Not available"}</p></div>
        </section>

        <section className="case-brief-section">
          <h3>Court Information</h3>
          <div className="case-brief-grid">
            <BriefField label="Court" value={brief.court.name} />
            <BriefField label="Judge" value={brief.court.judge} />
            <BriefField label="Opposite Party" value={brief.court.opposite_party} />
          </div>
        </section>

        <section className="case-brief-section">
          <h3>Hearing Summary</h3>
          <div className="case-brief-grid">
            <BriefField label="Latest Hearing Date" value={latest?.date} />
            <BriefField label="Latest Hearing Purpose" value={latest?.purpose} />
            <BriefField label="Latest Hearing Outcome" value={latest?.outcome} />
            <BriefField label="Next Hearing Date" value={next?.date} />
            <BriefField label="Next Hearing Time" value={next?.time} />
            <BriefField label="Upcoming Hearing Status" value={brief.hearings.upcoming_status} />
          </div>
        </section>

        <section className="case-brief-section">
          <h3>Payment Summary</h3>
          <div className="case-brief-grid">
            <BriefField label="Total Amount Due" value={briefAmount(brief.payments.total_due)} />
            <BriefField label="Total Amount Paid" value={briefAmount(brief.payments.total_paid)} />
            <BriefField label="Remaining Amount" value={briefAmount(brief.payments.remaining)} />
            <BriefField label="Payment Status" value={brief.payments.status} />
          </div>
        </section>

        <section className="case-brief-section">
          <h3>Documents</h3>
          <p className="case-brief-count">Total documents: {brief.documents.total}</p>
          {brief.documents.recent.length ? (
            <ul className="case-brief-list">
              {brief.documents.recent.map((document) => (
                <li key={document.id}>
                  <strong>{document.file_name}</strong>
                  <span>{document.doc_type || "Not available"} · {formatBriefTimestamp(document.uploaded_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p>Not available</p>}
        </section>

        <section className="case-brief-section">
          <h3>Recent Case Notes</h3>
          {brief.notes.length ? (
            <ul className="case-brief-list">
              {brief.notes.map((note) => (
                <li key={note.id}><span>{note.content}</span><small>{formatBriefTimestamp(note.created_at)}</small></li>
              ))}
            </ul>
          ) : <p>Not available</p>}
        </section>

        <section className="case-brief-section">
          <h3>Recent Activity</h3>
          {brief.recent_activity.length ? (
            <ul className="case-brief-list">
              {brief.recent_activity.map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <span>{formatBriefTimestamp(event.event_date)} · {event.description || "Not available"}</span>
                </li>
              ))}
            </ul>
          ) : <p>Not available</p>}
        </section>

        <section className="case-brief-section">
          <h3>Case Attention</h3>
          <div className="case-brief-attention-score">{attention.score} / 100 — {attention.level}</div>
          <div className="case-brief-grid">
            <div><strong>Reasons</strong>{attention.reasons.length ? <ul>{attention.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>Not available</p>}</div>
            <div><strong>Recommended Actions</strong>{attention.recommendations.length ? <ol>{attention.recommendations.map((item) => <li key={`${item.priority}-${item.action}`}>{item.action} ({item.priority})</li>)}</ol> : <p>Not available</p>}</div>
          </div>
        </section>

        <section className="case-brief-section case-brief-summary">
          <h3>Summary</h3>
          <p>{brief.summary}</p>
        </section>
      </article>
    </div>
  );
}

function formatTimelineDate(value) {
  if (!value) return "Date not set";
  const raw = String(value);
  const hasTime = raw.includes("T") || raw.includes(" ");
  const dateValue = new Date(hasTime ? raw.replace(" ", "T") : `${raw}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(dateValue);
}

function CaseTimeline({ events, loading, error }) {
  const indicators = {
    CASE_CREATED: "§",
    HEARING: "⚖",
    DOCUMENT: "▤",
    PAYMENT: "৳",
    NOTE: "✎",
  };

  return (
    <section className="panel case-timeline-panel">
      <div className="section-title" style={{ marginTop: 0 }}>Case Timeline</div>
      {loading ? (
        <div className="empty-state">Loading case timeline…</div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No timeline events recorded for this case yet.</div>
      ) : (
        <ol className="case-timeline-list">
          {events.map((event) => (
            <li className={`case-timeline-event timeline-${event.event_type.toLowerCase()}`} key={event.id}>
              <span className="case-timeline-indicator" aria-hidden="true">{indicators[event.event_type] || "•"}</span>
              <div className="case-timeline-content">
                <div className="case-timeline-meta">
                  <span className="case-timeline-type">{event.event_type.replaceAll("_", " ")}</span>
                  <time>{formatTimelineDate(event.event_date)}</time>
                </div>
                <strong>{event.title}</strong>
                {event.description && <p>{event.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function OverviewTab({ data }) {
  const rows = [
    ["Court", data.court_name],
    ["Judge", data.judge_name],
    ["Opposite party", data.opposite_party],
    ["Filed date", data.filed_date],
    ["Case outcome", data.outcome],
    ["Closed date", data.closed_date],
  ];
  return (
    <div className="panel">
      {rows.map(([label, val]) => (
        <div className="list-item" key={label}>
          <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>{label}</span>
          <span style={{ fontWeight: 500 }}>{val || "—"}</span>
        </div>
      ))}
      {data.description && (
        <>
          <div className="section-title">Description</div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{data.description}</p>
        </>
      )}
    </div>
  );
}

function formatHearingDate(dateValue) {
  if (!dateValue) return "Date not set";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatHearingTime(time) {
  if (!time) return "Time not set";
  const [hoursValue, minutesValue] = time.split(":");
  const date = new Date();
  date.setHours(Number(hoursValue), Number(minutesValue || 0), 0, 0);
  if (Number.isNaN(date.getTime())) return time;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HearingsTab({ caseId, hearings, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    hearing_date: "",
    hearing_time: "",
    purpose: "",
    outcome: "",
    next_hearing_date: "",
  });

  async function handleAdd(e) {
    e.preventDefault();
    await api.post("/hearings", { case_id: caseId, ...form });
    setShow(false);
    setForm({ hearing_date: "", hearing_time: "", purpose: "", outcome: "", next_hearing_date: "" });
    reload();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this hearing record?")) return;
    await api.delete(`/hearings/${id}`);
    reload();
  }

  const nextHearing = hearings.find((h) => h.next_hearing_date)?.next_hearing_date;

  return (
    <div className="panel">
      <div className="section-title" style={{ marginTop: 0 }}>
        Hearing history
        <button className="btn btn-sm btn-accent" onClick={() => setShow(true)}>+ Add hearing</button>
      </div>
      {nextHearing && (
        <div className="success-msg">Next hearing date: <strong>{nextHearing}</strong></div>
      )}
      {hearings.length === 0 && <div className="empty-state">No hearings recorded yet.</div>}
      {hearings.map((h) => (
        <div className="list-item" key={h.id}>
          <div>
            <strong>{formatHearingDate(h.hearing_date)}</strong>
            <span className="hearing-time-chip">{formatHearingTime(h.hearing_time)}</span>
            <span> — {h.purpose || "General hearing"}</span>
            {h.outcome && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>Outcome: {h.outcome}</div>}
            {h.next_hearing_date && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>Next: {h.next_hearing_date}</div>}
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(h.id)}>Delete</button>
        </div>
      ))}

      {show && (
        <Modal title="Add hearing" onClose={() => setShow(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-grid hearing-date-time-grid">
              <div className="field">
                <label>Hearing Date *</label>
                <input type="date" required value={form.hearing_date} onChange={(e) => setForm({ ...form, hearing_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Hearing Time</label>
                <input type="time" value={form.hearing_time} onChange={(e) => setForm({ ...form, hearing_time: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Purpose</label>
              <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <div className="field">
              <label>Outcome</label>
              <input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            </div>
            <div className="field">
              <label>Next hearing date</label>
              <input type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DocumentsTab({ caseId, documents, reload }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("Petition");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    try {
      await api.post(`/documents/case/${caseId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      reload();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    reload();
  }

  return (
    <div className="panel">
      <div className="section-title" style={{ marginTop: 0 }}>Documents</div>
      <form onSubmit={handleUpload} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Document type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option>Petition</option>
            <option>Order Sheet</option>
            <option>Judgment</option>
            <option>Evidence</option>
            <option>General</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>File (PDF, Word, image)</label>
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button className="btn btn-accent" disabled={!file || uploading}>{uploading ? "Uploading…" : "Upload"}</button>
      </form>
      {documents.length === 0 && <div className="empty-state">No documents attached yet.</div>}
      {documents.map((d) => (
        <div className="list-item" key={d.id}>
          <div>
            <strong>{d.file_name}</strong>
            <div className="page-subtitle" style={{ margin: "2px 0 0" }}>{d.doc_type} · uploaded {d.uploaded_at?.slice(0, 10)}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn btn-sm" style={{ background: "#e5e3d9", color: "var(--ink)", textDecoration: "none" }} href={`/api/documents/download/${d.id}`} target="_blank" rel="noreferrer">Download</a>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ caseId, clientId, payments, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ amount_due: "", amount_paid: "", payment_date: "", due_date: "", note: "" });

  async function handleAdd(e) {
    e.preventDefault();
    await api.post("/payments", { client_id: clientId, case_id: caseId, ...form });
    setShow(false);
    setForm({ amount_due: "", amount_paid: "", payment_date: "", due_date: "", note: "" });
    reload();
  }

  return (
    <div className="panel">
      <div className="section-title" style={{ marginTop: 0 }}>
        Fees & payments
        <button className="btn btn-sm btn-accent" onClick={() => setShow(true)}>+ Add record</button>
      </div>
      {payments.length === 0 && <div className="empty-state">No payment records yet.</div>}
      {payments.map((p) => {
        const due = Number(p.amount_due || 0) - Number(p.amount_paid || 0);
        const today = new Date();
        const todayString = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
        const status = due <= 0 ? "PAID" : p.due_date && p.due_date < todayString ? "OVERDUE" : Number(p.amount_paid || 0) > 0 ? "PARTIAL" : "DUE";
        return (
          <div className="list-item" key={p.id}>
            <div>
              <strong className="mono">৳{p.amount_paid} / ৳{p.amount_due}</strong>
              <span className={`badge ${status === "PAID" ? "badge-running" : status === "PARTIAL" ? "badge-pending" : "badge-due"}`} style={{ marginLeft: 8 }}>{status} · ৳{Math.max(0, due)} remaining</span>
              {p.due_date && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>Due date: {p.due_date}</div>}
              {p.note && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>{p.note}</div>}
            </div>
            <span className="page-subtitle">{p.payment_date || "—"}</span>
          </div>
        );
      })}

      {show && (
        <Modal title="Add payment record" onClose={() => setShow(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="field">
                <label>Amount due *</label>
                <input type="number" step="0.01" required value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} />
              </div>
              <div className="field">
                <label>Amount paid</label>
                <input type="number" step="0.01" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
              </div>
              <div className="field">
                <label>Payment date</label>
                <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Due date (optional)</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Note</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setShow(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function NotesTab({ caseId, notes, reload }) {
  const [content, setContent] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!content.trim()) return;
    await api.post(`/notes/case/${caseId}`, { content });
    setContent("");
    reload();
  }

  async function handleDelete(id) {
    await api.delete(`/notes/${id}`);
    reload();
  }

  return (
    <div className="panel">
      <div className="section-title" style={{ marginTop: 0 }}>Private notes</div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input className="search-input" style={{ flex: 1 }} placeholder="Add a note or instruction…" value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="btn btn-accent" type="submit">Add</button>
      </form>
      {notes.length === 0 && <div className="empty-state">No notes yet.</div>}
      {notes.map((n) => (
        <div className="list-item" key={n.id}>
          <div>
            <p style={{ margin: 0, fontSize: 13.5 }}>{n.content}</p>
            <div className="page-subtitle" style={{ margin: "4px 0 0" }}>{n.created_at?.slice(0, 16).replace("T", " ")}</div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
