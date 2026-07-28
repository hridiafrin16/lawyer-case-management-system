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

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [today, setToday] = useState([]);
  const [tomorrow, setTomorrow] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/reports/summary").then((r) => setSummary(r.data));
    api.get("/hearings/today").then((r) => setToday(r.data));
    api.get("/hearings/tomorrow").then((r) => setTomorrow(r.data));
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const formatStatValue = (stat) => {
    const value = summary?.[stat.key] ?? 0;
    return stat.isCurrency ? `BDT ${Number(value).toLocaleString()}` : value;
  };

  const hearingTime = (hearing) => hearing.hearing_time || hearing.time || "Time not set";

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-date">{formattedDate}</div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back. Review today's docket, chamber priorities, and fee position at a glance.</p>
        </div>
        <div className="advocate-card" aria-label="Advocate profile summary">
          <div className="advocate-avatar">A</div>
          <div>
            <div className="advocate-name">Advocate</div>
            <div className="advocate-meta">Legal Chamber</div>
          </div>
        </div>
      </div>

      {summary && (
        <div className="dashboard-stat-grid">
          {statsConfig.map((stat) => (
            <div className="dashboard-stat-card" key={stat.key}>
              <div className="dashboard-stat-icon">{stat.icon}</div>
              <div className="dashboard-stat-label">{stat.label}</div>
              <div className="dashboard-stat-value">{formatStatValue(stat)}</div>
              <div className="dashboard-stat-desc">{stat.description}</div>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-two-column">
        <section className="dashboard-panel hearings-panel">
          <div className="dashboard-section-head">
            <div>
              <h2>Today's Hearings</h2>
              <p>Priority appearances and court movements for today.</p>
            </div>
            <span className="dashboard-count">{today.length}</span>
          </div>
          {today.length === 0 ? (
            <div className="dashboard-empty">No hearings scheduled for today.</div>
          ) : (
            <div className="hearing-list">
              {today.map((h) => (
                <div
                  key={h.id}
                  className="hearing-card"
                  onClick={() => navigate(`/cases/${h.case_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/cases/${h.case_id}`);
                  }}
                >
                  <div className="hearing-main">
                    <div className="hearing-client">{h.client_name}</div>
                    <div className="hearing-case mono">{h.case_number}</div>
                  </div>
                  <div className="hearing-detail">
                    <span>{h.court_name || "Court not set"}</span>
                    <span>{hearingTime(h)}</span>
                  </div>
                  <span className="dashboard-badge badge-warning">{h.purpose || "General hearing"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="dashboard-panel reminder-panel">
          <div className="dashboard-section-head compact">
            <div>
              <h2>Tomorrow Reminder</h2>
              <p>Prepare briefs, files, and client calls.</p>
            </div>
          </div>
          {tomorrow.length === 0 ? (
            <div className="dashboard-empty small">No hearings scheduled for tomorrow.</div>
          ) : (
            <div className="reminder-timeline">
              {tomorrow.map((h) => (
                <div
                  key={h.id}
                  className="reminder-item"
                  onClick={() => navigate(`/cases/${h.case_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/cases/${h.case_id}`);
                  }}
                >
                  <div className="reminder-dot" />
                  <div>
                    <div className="reminder-title">{h.client_name}</div>
                    <div className="reminder-meta mono">{h.case_number}</div>
                    <div className="reminder-copy">{h.court_name || "Court not set"} - {h.purpose || "General hearing"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

    </div>
  );
}
