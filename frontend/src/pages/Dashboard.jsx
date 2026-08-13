import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

const statsConfig = [
  {
    key: "totalCases",
    label: "Total Cases",
    description: "All matters in chamber records",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6M10 17h6" />
      </svg>
    ),
  },
  {
    key: "runningCases",
    label: "Running Cases",
    description: "Active proceedings in motion",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19h14" />
        <path d="M7 15l4-4 3 3 5-6" />
        <path d="M17 8h2v2" />
      </svg>
    ),
  },
  {
    key: "pendingCases",
    label: "Pending Cases",
    description: "Awaiting next action or update",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    ),
  },
  {
    key: "closedCases",
    label: "Closed Cases",
    description: "Resolved and archived matters",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12l4 4L19 6" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
  {
    key: "totalOutstanding",
    label: "Outstanding Fees",
    description: "Receivables pending collection",
    isCurrency: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12M8 11h8M10 15h4" />
        <path d="M7 3h10a2 2 0 0 1 2 2v14l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
];

const quickActions = [
  { 
    id: "new-case", 
    label: "New Case", 
    icon: "⚖️", 
    description: "File new matter",
    path: "/cases" 
  },
  { 
    id: "new-hearing", 
    label: "Schedule Hearing", 
    icon: "📅", 
    description: "Set court date",
    path: "/hearings" 
  },
  { 
    id: "new-clients", 
    label: "New Clients", 
    icon: "📄", 
    description: "Manage clients",
    path: "/clients" 
  },
  { 
    id: "payments", 
    label: "Payments", 
    icon: "🗓️", 
    description: "View Payments",
    path: "/payments" 
  },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [today, setToday] = useState([]);
  const [tomorrow, setTomorrow] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, todayRes, tomorrowRes] = await Promise.all([
          api.get("/reports/summary"),
          api.get("/hearings/today"),
          api.get("/hearings/tomorrow"),
        ]);
        setSummary(summaryRes.data);
        setToday(todayRes.data);
        setTomorrow(tomorrowRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const formatStatValue = (stat) => {
    const value = summary?.[stat.key] ?? 0;
    return stat.isCurrency ? `BDT ${Number(value).toLocaleString()}` : value.toLocaleString();
  };

  const hearingTime = (hearing) => hearing.hearing_time || hearing.time || "Time not set";

  const getStatusBadge = (purpose) => {
    if (!purpose) return "badge-pending";
    const lower = purpose.toLowerCase();
    if (lower.includes("urgent") || lower.includes("emergency")) return "badge-due";
    if (lower.includes("final") || lower.includes("judgment")) return "badge-closed";
    if (lower.includes("preliminary") || lower.includes("first")) return "badge-running";
    return "badge-pending";
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading chamber data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-date">
            <span className="date-badge">📌 {formattedDate}</span>
          </div>
          <h1 className="dashboard-title">
            Welcome Back, <span className="title-highlight">Advocate</span>
          </h1>
          <p className="dashboard-subtitle">
            Today's docket: <strong>{today.length}</strong> hearings scheduled.
            {today.length > 0 && ` ${today.length} matters require your attention.`}
          </p>
        </div>
        <div className="dashboard-header-right">
          <div className="advocate-card" aria-label="Advocate profile summary">
            <div className="advocate-avatar">A</div>
            <div>
              <div className="advocate-name">Advocate</div>
              <div className="advocate-meta">⚖️ Senior Counsel</div>
            </div>
            <div className="advocate-status online">
              <span className="status-dot" />
              Available
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-grid">
        {quickActions.map((action) => (
          <button
            key={action.id}
            className="quick-action-btn"
            onClick={() => navigate(action.path)}
            aria-label={action.label}
          >
            <span className="quick-action-icon">{action.icon}</span>
            <div>
              <div className="quick-action-label">{action.label}</div>
              <div className="quick-action-desc">{action.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      {summary && (
        <div className="dashboard-stat-grid">
          {statsConfig.map((stat) => (
            <div 
              className="dashboard-stat-card premium" 
              key={stat.key}
            >
              <div className="stat-card-header">
                <div className="dashboard-stat-icon">{stat.icon}</div>
              </div>
              <div className="dashboard-stat-value">{formatStatValue(stat)}</div>
              <div className="dashboard-stat-label">{stat.label}</div>
              <div className="dashboard-stat-desc">{stat.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="dashboard-two-column">
        {/* Today's Hearings */}
        <section className="dashboard-panel hearings-panel">
          <div className="dashboard-section-head">
            <div>
              <h2>⚖️ Today's Hearings</h2>
              <p>Priority appearances and court movements for today.</p>
            </div>
            <div className="section-actions">
              <span className="dashboard-count">{today.length}</span>
              {today.length > 0 && (
                <button className="btn btn-sm btn-accent" onClick={() => navigate("/hearings")}>
                  View All
                </button>
              )}
            </div>
          </div>
          {today.length === 0 ? (
            <div className="dashboard-empty">
              <span className="empty-icon">📋</span>
              <p>No hearings scheduled for today.</p>
              <span className="empty-sub">Enjoy a focused work day!</span>
            </div>
          ) : (
            <div className="hearing-list">
              {today.map((h, index) => (
                <div
                  key={h.id}
                  className="hearing-card premium"
                  onClick={() => navigate(`/cases/${h.case_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/cases/${h.case_id}`);
                  }}
                >
                  <div className="hearing-number">#{index + 1}</div>
                  <div className="hearing-main">
                    <div className="hearing-client">{h.client_name || "Unknown Client"}</div>
                    <div className="hearing-case mono">{h.case_number || "N/A"}</div>
                  </div>
                  <div className="hearing-detail">
                    <span className="hearing-court">🏛️ {h.court_name || "Court not set"}</span>
                    <span className="hearing-time">🕐 {hearingTime(h)}</span>
                  </div>
                  <span className={`dashboard-badge ${getStatusBadge(h.purpose)}`}>
                    {h.purpose || "General hearing"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tomorrow Reminder */}
        <aside className="dashboard-panel reminder-panel">
          <div className="dashboard-section-head compact">
            <div>
              <h2>📌 Tomorrow's Agenda</h2>
              <p>Prepare briefs, files, and client calls.</p>
            </div>
            <span className="dashboard-count">{tomorrow.length}</span>
          </div>
          {tomorrow.length === 0 ? (
            <div className="dashboard-empty small">
              <span className="empty-icon">✅</span>
              <p>No hearings scheduled for tomorrow.</p>
            </div>
          ) : (
            <div className="reminder-timeline">
              {tomorrow.map((h) => (
                <div
                  key={h.id}
                  className="reminder-item premium"
                  onClick={() => navigate(`/cases/${h.case_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/cases/${h.case_id}`);
                  }}
                >
                  <div className="reminder-dot" />
                  <div className="reminder-content">
                    <div className="reminder-title">{h.client_name || "Unknown Client"}</div>
                    <div className="reminder-meta mono">{h.case_number || "N/A"}</div>
                    <div className="reminder-copy">
                      {h.court_name || "Court not set"} • {h.purpose || "General hearing"}
                    </div>
                    <div className="reminder-time">{hearingTime(h)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Quick Stats Footer */}
      {summary && (
        <div className="dashboard-footer-stats">
          <div className="footer-stat">
            <span className="footer-stat-label">Total Clients</span>
            <span className="footer-stat-value">{summary?.totalClients || 0}</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat">
            <span className="footer-stat-label">Documents Filed</span>
            <span className="footer-stat-value">{summary?.totalDocuments || 0}</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat">
            <span className="footer-stat-label">Success Rate</span>
            <span className="footer-stat-value">{summary?.successRate || 0}%</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat">
            <span className="footer-stat-label">Avg. Case Duration</span>
            <span className="footer-stat-value">{summary?.avgDuration || 0} days</span>
          </div>
        </div>
      )}
    </div>
  );
}