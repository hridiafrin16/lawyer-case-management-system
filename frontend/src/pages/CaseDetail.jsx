import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const TABS = ["Overview", "Hearings", "Documents", "Payments", "Notes"];

export default function CaseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const navigate = useNavigate();

  function load() {
    api.get(`/cases/${id}`).then((r) => { setData(r.data); setForm(r.data); });
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    await api.put(`/cases/${id}`, form);
    setEditMode(false);
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this case and all related hearings, documents, payments and notes?")) return;
    await api.delete(`/cases/${id}`);
    navigate("/cases");
  }

  if (!data) return null;

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
          <button className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setEditMode(true)}>Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab data={data} />}
      {tab === "Hearings" && <HearingsTab caseId={id} hearings={data.hearings} reload={load} />}
      {tab === "Documents" && <DocumentsTab caseId={id} documents={data.documents} reload={load} />}
      {tab === "Payments" && <PaymentsTab caseId={id} clientId={data.client_id} payments={data.payments} reload={load} />}
      {tab === "Notes" && <NotesTab caseId={id} notes={data.notes} reload={load} />}

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
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Running">Running</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
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

function OverviewTab({ data }) {
  const rows = [
    ["Court", data.court_name],
    ["Judge", data.judge_name],
    ["Opposite party", data.opposite_party],
    ["Filed date", data.filed_date],
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

function HearingsTab({ caseId, hearings, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ hearing_date: "", purpose: "", outcome: "", next_hearing_date: "" });

  async function handleAdd(e) {
    e.preventDefault();
    await api.post("/hearings", { case_id: caseId, ...form });
    setShow(false);
    setForm({ hearing_date: "", purpose: "", outcome: "", next_hearing_date: "" });
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
            <strong className="mono">{h.hearing_date}</strong> — {h.purpose || "General hearing"}
            {h.outcome && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>Outcome: {h.outcome}</div>}
            {h.next_hearing_date && <div className="page-subtitle" style={{ margin: "2px 0 0" }}>Next: {h.next_hearing_date}</div>}
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(h.id)}>Delete</button>
        </div>
      ))}

      {show && (
        <Modal title="Add hearing" onClose={() => setShow(false)}>
          <form onSubmit={handleAdd}>
            <div className="field">
              <label>Hearing date *</label>
              <input type="date" required value={form.hearing_date} onChange={(e) => setForm({ ...form, hearing_date: e.target.value })} />
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
  const [form, setForm] = useState({ amount_due: "", amount_paid: "", payment_date: "", note: "" });

  async function handleAdd(e) {
    e.preventDefault();
    await api.post("/payments", { client_id: clientId, case_id: caseId, ...form });
    setShow(false);
    setForm({ amount_due: "", amount_paid: "", payment_date: "", note: "" });
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
        const due = p.amount_due - p.amount_paid;
        return (
          <div className="list-item" key={p.id}>
            <div>
              <strong className="mono">৳{p.amount_paid} / ৳{p.amount_due}</strong>
              {due > 0 && <span className="badge badge-due" style={{ marginLeft: 8 }}>Due ৳{due}</span>}
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
