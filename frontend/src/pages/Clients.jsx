import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import Modal from "../components/Modal.jsx";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", national_id: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function load(query = "") {
    setLoading(true);
    api.get("/clients", { params: query ? { q: query } : {} })
      .then((r) => setClients(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  function handleClearSearch() {
    setQ("");
    setTimeout(() => load(""), 0);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/clients", form);
      setShowAdd(false);
      setForm({ name: "", mobile: "", address: "", national_id: "" });
      setQ("");
      load("");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to add client");
    } finally {
      setSaving(false);
    }
  }

  // Get client initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="clients-page">
      {/* Page Header */}
      <div className="page-header premium">
        <div>
          <div className="page-breadcrumb">
            <span className="breadcrumb-item">👥 Chamber</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">Client Registry</span>
          </div>
          <h1 className="page-title">Client Registry</h1>
          <p className="page-subtitle">Manage all clients, contacts, and represented parties.</p>
        </div>
        <button className="btn btn-primary premium" onClick={() => setShowAdd(true)}>
          <span className="btn-icon">+</span> Add Client
        </button>
      </div>

      {/* Stats Summary */}
      <div className="clients-stats-grid">
        <div className="clients-stat-card total">
          <div className="stat-emoji">👥</div>
          <div>
            <div className="stat-number">{clients.length}</div>
            <div className="stat-label">Total Clients</div>
          </div>
        </div>
        <div className="clients-stat-card active">
          <div className="stat-emoji">⚡</div>
          <div>
            <div className="stat-number">
              {clients.filter(c => c.cases?.some(cs => cs.status === "Running")).length}
            </div>
            <div className="stat-label">With Active Cases</div>
          </div>
        </div>
        <div className="clients-stat-card new">
          <div className="stat-emoji">🆕</div>
          <div>
            <div className="stat-number">
              {clients.filter(c => {
                if (!c.created_at) return false;
                const days = (Date.now() - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
                return days <= 30;
              }).length}
            </div>
            <div className="stat-label">New (30 days)</div>
          </div>
        </div>
        <div className="clients-stat-card total-cases">
          <div className="stat-emoji">📂</div>
          <div>
            <div className="stat-number">
              {clients.reduce((acc, c) => acc + (c.cases?.length || 0), 0)}
            </div>
            <div className="stat-label">Total Cases</div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="search-toolbar premium">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input premium"
              placeholder="Search clients by name, mobile, or ID..."
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
            <button className="btn btn-search" type="submit">Search</button>
            {q && (
              <button type="button" className="btn btn-clear" onClick={handleClearSearch}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Clients Grid */}
      <div className="clients-grid-wrapper">
        <div className="clients-grid-header">
          <span className="results-count">
            {clients.length} {clients.length === 1 ? "client" : "clients"} found
          </span>
        </div>

        {loading ? (
          <div className="loading-shimmer">
            <div className="shimmer-row" style={{ height: 80, marginBottom: 12 }} />
            <div className="shimmer-row" style={{ height: 80, marginBottom: 12 }} />
            <div className="shimmer-row" style={{ height: 80, marginBottom: 12 }} />
            <div className="shimmer-row" style={{ height: 80 }} />
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state premium">
            <span className="empty-icon">👤</span>
            <h3>No clients registered</h3>
            <p>Start by adding your first client to the registry.</p>
            <button 
              className="btn btn-accent btn-sm" 
              onClick={() => setShowAdd(true)}
            >
              + Add Client
            </button>
          </div>
        ) : (
          <div className="clients-grid">
            {clients.map((client) => (
              <div
                key={client.id}
                className="client-card"
                onClick={() => navigate(`/clients/${client.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/clients/${client.id}`);
                }}
              >
                <div className="client-card-header">
                  <div className="client-avatar">
                    {getInitials(client.name)}
                  </div>
                  <div className="client-info">
                    <div className="client-name">{client.name}</div>
                    <div className="client-mobile">📱 {client.mobile || "No mobile"}</div>
                  </div>
                  <div className="client-card-arrow">→</div>
                </div>
                <div className="client-card-body">
                  {client.address && (
                    <div className="client-address">📍 {client.address}</div>
                  )}
                  {client.national_id && (
                    <div className="client-national-id">🆔 {client.national_id}</div>
                  )}
                </div>
                <div className="client-card-footer">
                  <div className="client-case-count">
                    <span className="count-number">{client.cases?.length || 0}</span>
                    <span className="count-label">Cases</span>
                  </div>
                  <div className="client-case-status">
                    {client.cases?.some(c => c.status === "Running") && (
                      <span className="status-badge running">Running</span>
                    )}
                    {client.cases?.some(c => c.status === "Pending") && (
                      <span className="status-badge pending">Pending</span>
                    )}
                    {!client.cases?.length && (
                      <span className="status-badge no-cases">No Cases</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal - Redesigned */}
      {showAdd && (
        <Modal title="👤 Add New Client" onClose={() => setShowAdd(false)}>
          <div className="modal-premium">
            {error && <div className="error-msg premium">{error}</div>}
            <form onSubmit={handleAdd} className="modal-form">
              <div className="form-grid premium">
                <div className="field premium full-width">
                  <label>
                    <span className="field-icon">📝</span>
                    Full Name <span className="required">*</span>
                  </label>
                  <input 
                    required 
                    placeholder="e.g., John Doe" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">📱</span>
                    Mobile Number <span className="required">*</span>
                  </label>
                  <input 
                    required 
                    placeholder="e.g., 017XXXXXXXX" 
                    value={form.mobile} 
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })} 
                  />
                </div>
                <div className="field premium">
                  <label>
                    <span className="field-icon">🆔</span>
                    National ID
                  </label>
                  <input 
                    placeholder="e.g., 1234567890" 
                    value={form.national_id} 
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })} 
                  />
                </div>
                <div className="field premium full-width">
                  <label>
                    <span className="field-icon">📍</span>
                    Address
                  </label>
                  <input 
                    placeholder="e.g., 123 Main Street, City" 
                    value={form.address} 
                    onChange={(e) => setForm({ ...form, address: e.target.value })} 
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary premium" disabled={saving}>
                  <span className="btn-icon">{saving ? "…" : "+"}</span> {saving ? "Saving…" : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
