import React, { useEffect, useState } from "react";
import api from "../api.js";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setSummary(r.data));
    api.get("/reports/monthly-cases").then((r) => setMonthly(r.data));
  }, []);

  const maxCount = Math.max(1, ...monthly.map((m) => m.count));

  function exportCsv() {
    const rows = [["Month", "New cases"], ...monthly.map((m) => [m.month, m.count])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Case load and fee statistics.</p>
        </div>
        <button className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={exportCsv}>Export monthly CSV</button>
      </div>

      {summary && (
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">{summary.totalCases}</div><div className="stat-label">Total cases</div></div>
          <div className="stat-card"><div className="stat-value">{summary.runningCases}</div><div className="stat-label">Running</div></div>
          <div className="stat-card"><div className="stat-value">{summary.pendingCases}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card"><div className="stat-value">{summary.closedCases}</div><div className="stat-label">Closed</div></div>
          <div className="stat-card"><div className="stat-value">{summary.totalClients}</div><div className="stat-label">Clients</div></div>
          <div className="stat-card"><div className="stat-value">৳{summary.totalOutstanding.toLocaleString()}</div><div className="stat-label">Outstanding</div></div>
        </div>
      )}

      <div className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>New cases by month</div>
        {monthly.length === 0 && <div className="empty-state">Not enough data yet.</div>}
        {monthly.slice().reverse().map((m) => (
          <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div className="mono" style={{ width: 70, fontSize: 12.5, color: "var(--ink-muted)" }}>{m.month}</div>
            <div style={{ flex: 1, background: "var(--paper)", borderRadius: 4, height: 18 }}>
              <div style={{ width: `${(m.count / maxCount) * 100}%`, background: "var(--brass)", height: "100%", borderRadius: 4 }} />
            </div>
            <div className="mono" style={{ width: 24, fontSize: 12.5 }}>{m.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
