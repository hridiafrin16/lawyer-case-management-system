import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    api.get(`/clients/${id}`)
      .then((r) => setClient(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this client and all associated records? This cannot be undone.")) return;
    try {
      await api.delete(`/clients/${id}`);
      navigate("/clients");
    } catch (error) {
      alert("Failed to delete client. Please try again.");
    }
  }

  // Get case counts by status
  const getCaseCount = (status) => {
    if (!client?.cases) return 0;
    return client.cases.filter(c => c.status === status).length;
  };

  if (loading) {
    return (
      <div className="client-detail-page">
        <div className="loading-shimmer">
          <div className="shimmer-row" style={{ height: 60, marginBottom: 16 }} />
          <div className="shimmer-row" style={{ height: 120, marginBottom: 16 }} />
          <div className="shimmer-row" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="client-detail-page">
      {/* Back Navigation */}
      <Link to="/clients" className="back-link premium">
        <span className="back-icon">←</span> Back to Clients
      </Link>

      {/* Header Section */}
      <div className="client-header premium">
        <div className="client-header-left">
          <div className="client-avatar-large">
            {client.name?.charAt(0) || "?"}
          </div>
          <div className="client-info">
            <h1 className="client-name-title">{client.name}</h1>
            <div className="client-meta">
              <span className="client-meta-item">
                <span className="meta-icon">📱</span>
                {client.mobile || "No mobile"}
              </span>
              {client.national_id && (
                <span className="client-meta-item">
                  <span className="meta-icon">🆔</span>
                  ID: {client.national_id}
                </span>
              )}
              <span className="client-meta-item">
                <span className="meta-icon">📂</span>
                {client.cases?.length || 0} Cases
              </span>
            </div>
          </div>
        </div>
        <div className="client-header-actions">
          <button 
            className="btn btn-primary premium"
            onClick={() => navigate(`/cases?new=1&client=${client.id}`)}
          >
            <span className="btn-icon">+</span> New Case
          </button>
          <button 
            className="btn btn-danger premium"
            onClick={handleDelete}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Case Status Summary */}
      <div className="client-status-grid">
        <div className="client-status-card total">
          <div className="status-card-icon">📊</div>
          <div>
            <div className="status-card-value">{client.cases?.length || 0}</div>
            <div className="status-card-label">Total Cases</div>
          </div>
        </div>
        <div className="client-status-card running">
          <div className="status-card-icon">⚡</div>
          <div>
            <div className="status-card-value">{getCaseCount("Running")}</div>
            <div className="status-card-label">Running</div>
          </div>
        </div>
        <div className="client-status-card pending">
          <div className="status-card-icon">⏳</div>
          <div>
            <div className="status-card-value">{getCaseCount("Pending")}</div>
            <div className="status-card-label">Pending</div>
          </div>
        </div>
        <div className="client-status-card closed">
          <div className="status-card-icon">✅</div>
          <div>
            <div className="status-card-value">{getCaseCount("Closed")}</div>
            <div className="status-card-label">Closed</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="client-two-column">
        {/* Left Column - Client Details */}
        <div className="client-details-panel">
          <div className="panel-section-header">
            <h2>👤 Client Profile</h2>
            <span className="section-badge">Details</span>
          </div>
          
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{client.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mobile Number</span>
              <span className="detail-value">{client.mobile || "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">National ID</span>
              <span className="detail-value">{client.national_id || "—"}</span>
            </div>
            <div className="detail-item full-width">
              <span className="detail-label">Address</span>
              <span className="detail-value">{client.address || "No address on file."}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Client Since</span>
              <span className="detail-value">
                {client.created_at ? new Date(client.created_at).toLocaleDateString() : "—"}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total Cases</span>
              <span className="detail-value">{client.cases?.length || 0}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="client-quick-actions">
            <button 
              className="quick-action-item"
              onClick={() => navigate(`/cases?new=1&client=${client.id}`)}
            >
              <span className="qa-icon">⚖️</span>
              <div>
                <div className="qa-label">File New Case</div>
                <div className="qa-desc">Start a new matter</div>
              </div>
            </button>
            <button 
              className="quick-action-item"
              onClick={() => navigate(`/hearings/new?client=${client.id}`)}
            >
              <span className="qa-icon">📅</span>
              <div>
                <div className="qa-label">Schedule Hearing</div>
                <div className="qa-desc">Set court date</div>
              </div>
            </button>
            <button 
              className="quick-action-item"
              onClick={() => navigate(`/documents?client=${client.id}`)}
            >
              <span className="qa-icon">📄</span>
              <div>
                <div className="qa-label">Manage Documents</div>
                <div className="qa-desc">Upload or view files</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column - Cases List */}
        <div className="client-cases-panel">
          <div className="panel-section-header">
            <h2>⚖️ Client Cases</h2>
            <div className="section-actions">
              <span className="section-count">{client.cases?.length || 0}</span>
              <button 
                className="btn btn-sm btn-accent"
                onClick={() => navigate(`/cases?new=1&client=${client.id}`)}
              >
                + Add
              </button>
            </div>
          </div>

          {client.cases?.length === 0 ? (
            <div className="empty-state premium">
              <span className="empty-icon">📂</span>
              <h3>No cases filed yet</h3>
              <p>Start by filing a new case for this client.</p>
              <button 
                className="btn btn-accent btn-sm"
                onClick={() => navigate(`/cases?new=1&client=${client.id}`)}
              >
                + File New Case
              </button>
            </div>
          ) : (
            <div className="client-cases-list">
              {client.cases.map((c) => (
                <div
                  key={c.id}
                  className="client-case-item"
                  onClick={() => navigate(`/cases/${c.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/cases/${c.id}`);
                  }}
                >
                  <div className="case-item-header">
                    <span className="case-item-number mono">{c.case_number}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="case-item-details">
                    <span className="case-item-type">{c.case_type}</span>
                    <span className="case-item-court">🏛️ {c.court_name || "Court not set"}</span>
                  </div>
                  <div className="case-item-footer">
                    <span className="case-item-date">
                      Filed: {c.filed_date ? new Date(c.filed_date).toLocaleDateString() : "N/A"}
                    </span>
                    <span className="case-item-arrow">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}