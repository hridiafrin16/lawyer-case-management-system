import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api.js";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const CASE_TYPES = ["Civil", "Criminal", "Family", "Property", "Corporate", "Writ", "Other"];

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emptyForm = {
    case_number: "",
    client_id: searchParams.get("client") || "",
    case_type: "Civil",
    court_name: "",
    judge_name: "",
    opposite_party: "",
    status: "Running",
    filed_date: "",
    description: "",
  };
  const [form, setForm] = useState(emptyForm);

  function load() {
    api.get("/cases", { params: { q: q || undefined, status: status || undefined } })
      .then((r) => setCases(r.data));
  }

  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data));
    if (searchParams.get("new")) setShowAdd(true);
  }, []);

  useEffect(() => { load(); }, [status]);

  function handleSearch(e) {
    e.preventDefault();
    load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      const created = await api.post("/cases", form);
      setShowAdd(false);
      setForm(emptyForm);
      navigate(`/cases/${created.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create case");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cases</h1>
          <p className="page-subtitle">The full docket, searchable by number, client, or court.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowAdd(true)}>+ New case</button>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          className="search-input"
          placeholder="Search case no., client, court…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 6 }}>
          <option value="">All statuses</option>
          <option value="Running">Running</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
        <button className="btn btn-sm" type="submit">Search</button>
      </form>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Case No.</th><th>Client</th><th>Type</th><th>Court</th><th>Status</th></tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)}>
                  <td className="mono">{c.case_number}</td>
                  <td>{c.client_name}</td>
                  <td>{c.case_type}</td>
                  <td>{c.court_name || "—"}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {cases.length === 0 && <div className="empty-state">No cases match. Try a different search or add a new case.</div>}
        </div>
      </div>

      {showAdd && (
        <Modal title="New case" onClose={() => setShowAdd(false)}>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="field">
                <label>Case number *</label>
                <input required value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} />
              </div>
              <div className="field">
                <label>Client *</label>
                <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Case type *</label>
                <select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
                  {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
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
                <input value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Judge name</label>
                <input value={form.judge_name} onChange={(e) => setForm({ ...form, judge_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Opposite party</label>
                <input value={form.opposite_party} onChange={(e) => setForm({ ...form, opposite_party: e.target.value })} />
              </div>
              <div className="field">
                <label>Filed date</label>
                <input type="date" value={form.filed_date} onChange={(e) => setForm({ ...form, filed_date: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent">Create case</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
