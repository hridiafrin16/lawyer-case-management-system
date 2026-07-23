import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Today's docket and case standing at a glance.</p>
        </div>
      </div>

      {summary && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{summary.totalCases}</div>
            <div className="stat-label">Total cases</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.runningCases}</div>
            <div className="stat-label">Running</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.pendingCases}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.closedCases}</div>
            <div className="stat-label">Closed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">৳{summary.totalOutstanding.toLocaleString()}</div>
            <div className="stat-label">Outstanding fees</div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Today's hearings</div>
        {today.length === 0 ? (
          <div className="empty-state">No hearings scheduled for today.</div>
        ) : (
          today.map((h) => (
            <div
              key={h.id}
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/cases/${h.case_id}`)}
            >
              <div>
                <strong className="mono">{h.case_number}</strong> — {h.client_name}
                <div className="page-subtitle" style={{ margin: "2px 0 0" }}>
                  {h.court_name || "Court not set"} · {h.purpose || "General hearing"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>Tomorrow's hearings — reminder</div>
        {tomorrow.length === 0 ? (
          <div className="empty-state">No hearings scheduled for tomorrow.</div>
        ) : (
          tomorrow.map((h) => (
            <div
              key={h.id}
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/cases/${h.case_id}`)}
            >
              <div>
                <strong className="mono">{h.case_number}</strong> — {h.client_name}
                <div className="page-subtitle" style={{ margin: "2px 0 0" }}>
                  {h.court_name || "Court not set"} · {h.purpose || "General hearing"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
