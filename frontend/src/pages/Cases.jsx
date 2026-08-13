import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api.js";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const CASE_TYPES = ["Civil", "Criminal", "Family", "Property", "Corporate", "Writ", "Other"];

// Quick filter options
const FILTER_OPTIONS = [
  { value: "", label: "All Cases" },
  { value: "Running", label: "⚡ Running" },
  { value: "Pending", label: "⏳ Pending" },
  { value: "Closed", label: "✅ Closed" },
];

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    api.get("/cases", { params: { q: q || undefined, status: status || undefined } })
      .then((r) => setCases(r.data))
      .finally(() => setLoading(false));
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

  function handleClearSearch() {
    setQ("");
    setStatus("");
    setTimeout(() => load(), 0);
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

  // Get count by status
  const getStatusCount = (statusFilter) => {
    return cases.filter(c => c.status === statusFilter).length;
  };

  return (
    <div className="cases-page">
      {/* Page Header */}
      <div className="page-header premium">
        <div>
          <div className="page-breadcrumb">
            <span className="breadcrumb-item">📋 Chamber</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">Case Docket</span>
          </div>
          <h1 className="page-title">Case Docket</h1>
          <p className="page-subtitle">Manage all matters, proceedings, and chamber records.</p>
        </div>
        <button className="btn btn-primary premium" onClick={() => setShowAdd(true)}>
          <span className="btn-icon">+</span> New Case
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="status-summary-grid">
        <div className="status-summary-card total" onClick={() => { setStatus(""); load(); }}>
          <div className="status-summary-icon">📊</div>
          <div>
            <div className="status-summary-value">{cases.length}</div>
            <div className="status-summary-label">Total Cases</div>
          </div>
        </div>
        <div className="status-summary-card running" onClick={() => { setStatus("Running"); load(); }}>
          <div className="status-summary-icon">⚡</div>
          <div>
            <div className="status-summary-value">{getStatusCount("Running")}</div>
            <div className="status-summary-label">Running</div>
          </div>
        </div>
        <div className="status-summary-card pending" onClick={() => { setStatus("Pending"); load(); }}>
          <div className="status-summary-icon">⏳</div>
          <div>
            <div className="status-summary-value">{getStatusCount("Pending")}</div>
            <div className="status-summary-label">Pending</div>
          </div>
        </div>
        <div className="status-summary-card closed" onClick={() => { setStatus("Closed"); load(); }}>
          <div className="status-summary-icon">✅</div>
          <div>
            <div className="status-summary-value">{getStatusCount("Closed")}</div>
            <div className="status-summary-label">Closed</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="search-toolbar premium">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input premium"
              placeholder="Search by case number, client, court, or judge..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button type="button" className="clear-search" onClick={() => setQ("")}>
                ✕
              </button>
            )}
          </div>
          <div className="filter-group">
            <select 
              className="filter-select" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className="btn btn-search" type="submit">Search</button>
            {(q || status) && (
              <button type="button" className="btn btn-clear" onClick={handleClearSearch}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Cases Table */}
      <div className="cases-table-wrapper">
        <div className="cases-table-header">
          <span className="results-count">{cases.length} cases found</span>
          <span className="cases-sort">
            <span className="sort-label">Sort by:</span>
            <select className="sort-select" defaultValue="newest">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">Status</option>
              <option value="type">Case Type</option>
            </select>
          </span>
        </div>

        <div className="panel premium">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-shimmer">
                <div className="shimmer-row" />
                <div className="shimmer-row" />
                <div className="shimmer-row" />
                <div className="shimmer-row" />
              </div>
            ) : cases.length === 0 ? (
              <div className="empty-state premium">
                <span className="empty-icon">📂</span>
                <h3>No cases found</h3>
                <p>Try adjusting your search or filter criteria.</p>
                <button className="btn btn-accent btn-sm" onClick={() => setShowAdd(true)}>
                  + Create new case
                </button>
              </div>
            ) : (
              <table className="cases-table">
                <thead>
                  <tr>
                    <th className="col-case">Case No.</th>
                    <th className="col-client">Client</th>
                    <th className="col-type">Type</th>
                    <th className="col-court">Court</th>
                    <th className="col-judge">Judge</th>
                    <th className="col-opposite">Opposite Party</th>
                    <th className="col-status">Status</th>
                    <th className="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr 
                      key={c.id} 
                      className="case-row"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      <td className="col-case mono">
                        <span className="case-number">{c.case_number}</span>
                      </td>
                      <td className="col-client">
                        <div className="client-cell">
                          <span className="client-avatar">{c.client_name?.charAt(0) || "?"}</span>
                          <span className="client-name">{c.client_name}</span>
                        </div>
                      </td>
                      <td className="col-type">
                        <span className="case-type-badge">{c.case_type}</span>
                      </td>
                      <td className="col-court">
                        <span className="court-name">{c.court_name || "—"}</span>
                      </td>
                      <td className="col-judge">{c.judge_name || "—"}</td>
                      <td className="col-opposite">{c.opposite_party || "—"}</td>
                      <td className="col-status">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="col-action">
                        <button 
                          className="btn-view"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${c.id}`);
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Case Modal - Redesigned */}
      {showAdd && (
        <Modal title="📝 File New Case" onClose={() => setShowAdd(false)}>
          <div className="modal-premium">
            {error && <div className="error-msg premium">{error}</div>}
            <form onSubmit={handleAdd} className="modal-form">
              <div className="form-grid premium">
                <div className="field premium">
                  <label>
                    <span className="field-icon">📌</span>
                    Case Number <span className="required">*</span>
                  </label>
                  <input 
                    required 
                    placeholder="e.g., C-2024-001" 
                    value={form.case_number} 
                    onChange={(e) => setForm({ ...form, case_number: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">👤</span>
                    Client <span className="required">*</span>
                  </label>
                  <select 
                    required 
                    value={form.client_id} 
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">⚖️</span>
                    Case Type <span className="required">*</span>
                  </label>
                  <select 
                    value={form.case_type} 
                    onChange={(e) => setForm({ ...form, case_type: e.target.value })}
                  >
                    {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">📊</span>
                    Status
                  </label>
                  <select 
                    value={form.status} 
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Running">⚡ Running</option>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Closed">✅ Closed</option>
                  </select>
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">🏛️</span>
                    Court Name
                  </label>
                  <input 
                    placeholder="e.g., High Court Division" 
                    value={form.court_name} 
                    onChange={(e) => setForm({ ...form, court_name: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">👨‍⚖️</span>
                    Judge Name
                  </label>
                  <input 
                    placeholder="e.g., Justice A.B. Khan" 
                    value={form.judge_name} 
                    onChange={(e) => setForm({ ...form, judge_name: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">🔄</span>
                    Opposite Party
                  </label>
                  <input 
                    placeholder="e.g., Defendant name" 
                    value={form.opposite_party} 
                    onChange={(e) => setForm({ ...form, opposite_party: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">📅</span>
                    Filed Date
                  </label>
                  <input 
                    type="date" 
                    value={form.filed_date} 
                    onChange={(e) => setForm({ ...form, filed_date: e.target.value })} 
                  />
                </div>
              </div>
              <div className="field premium full-width">
                <label>
                  <span className="field-icon">📝</span>
                  Case Description
                </label>
                <textarea 
                  rows={3} 
                  placeholder="Brief description of the case..." 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary premium">
                  <span className="btn-icon">+</span> File Case
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}