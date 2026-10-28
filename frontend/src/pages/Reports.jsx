import React, { useEffect, useState } from "react";
import api from "../api.js";

function formatCurrency(value) {
  return `৳${Number(value || 0).toLocaleString()}`;
}

function formatMonthLabel(month) {
  if (!month) return "N/A";
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(date);
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [duePayments, setDuePayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const [summaryRes, monthlyRes, duePaymentsRes] = await Promise.all([
          api.get("/reports/summary"),
          api.get("/reports/monthly-cases"),
          api.get("/reports/due-payments"),
        ]);
        setSummary(summaryRes.data);
        setMonthly(monthlyRes.data);
        setDuePayments(duePaymentsRes.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  const lastTwelveMonths = monthly.slice(0, 12).reverse();
  const maxCount = Math.max(1, ...lastTwelveMonths.map((m) => Number(m.count || 0)));

  const caseOverview = [
    { label: "Total Cases", value: summary?.totalCases || 0, tone: "total" },
    { label: "Running Cases", value: summary?.runningCases || 0, tone: "running" },
    { label: "Pending Cases", value: summary?.pendingCases || 0, tone: "pending" },
    { label: "Closed Cases", value: summary?.closedCases || 0, tone: "closed" },
  ];

  const financialOverview = [
    { label: "Total Due", value: formatCurrency(summary?.totalDue), tone: "due" },
    { label: "Total Paid", value: formatCurrency(summary?.totalPaid), tone: "paid" },
    { label: "Outstanding", value: formatCurrency(summary?.totalOutstanding), tone: "outstanding" },
  ];

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
    <div className="reports-page">
      <div className="page-header reports-header">
        <div>
          <div className="reports-kicker">Chamber Analytics</div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Analytical view of case volume, payment health, and outstanding receivables.
          </p>
        </div>
        <button className="reports-export-btn" onClick={exportCsv}>
          Export monthly CSV
        </button>
      </div>

      {loading ? (
        <div className="reports-loading">
          <div className="loading-spinner" />
          <p>Preparing report data...</p>
        </div>
      ) : (
        <>
          <section className="reports-section">
            <div className="reports-section-head">
              <div>
                <span className="reports-section-label">Case Overview</span>
                <h2>Case portfolio status</h2>
              </div>
            </div>
            <div className="reports-metric-grid case-grid">
              {caseOverview.map((item) => (
                <div className={`reports-metric-card ${item.tone}`} key={item.label}>
                  <span className="metric-rule" />
                  <div className="reports-metric-value">{Number(item.value).toLocaleString()}</div>
                  <div className="reports-metric-label">{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="reports-section">
            <div className="reports-section-head">
              <div>
                <span className="reports-section-label">Financial Overview</span>
                <h2>Fees and collections</h2>
              </div>
            </div>
            <div className="reports-metric-grid finance-grid">
              {financialOverview.map((item) => (
                <div className={`reports-metric-card finance ${item.tone}`} key={item.label}>
                  <span className="metric-rule" />
                  <div className="reports-metric-value">{item.value}</div>
                  <div className="reports-metric-label">{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="reports-panel">
            <div className="reports-section-head">
              <div>
                <span className="reports-section-label">New Cases by Month</span>
                <h2>Last 12 months of filings</h2>
              </div>
              <span className="reports-pill">{lastTwelveMonths.length} months</span>
            </div>
            {lastTwelveMonths.length === 0 ? (
              <div className="empty-state">Not enough data yet.</div>
            ) : (
              <div className="monthly-chart" aria-label="New cases by month">
                {lastTwelveMonths.map((m) => {
                  const count = Number(m.count || 0);
                  const height = Math.max(8, (count / maxCount) * 100);
                  return (
                    <div className="month-bar-item" key={m.month}>
                      <div className="month-bar-value mono">{count}</div>
                      <div className="month-bar-track">
                        <div className="month-bar-fill" style={{ height: `${height}%` }} />
                      </div>
                      <div className="month-bar-label">{formatMonthLabel(m.month)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="reports-panel">
            <div className="reports-section-head">
              <div>
                <span className="reports-section-label">Outstanding Payments</span>
                <h2>Receivables requiring follow-up</h2>
              </div>
              <span className="reports-pill">{duePayments.length} records</span>
            </div>
            {duePayments.length === 0 ? (
              <div className="empty-state">No outstanding payment records found.</div>
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Case Number</th>
                      <th>Amount Due</th>
                      <th>Amount Paid</th>
                      <th>Outstanding Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duePayments.map((payment, index) => {
                      const amountDue = Number(payment.amount_due || 0);
                      const amountPaid = Number(payment.amount_paid || 0);
                      const outstanding = amountDue - amountPaid;
                      return (
                        <tr key={`${payment.case_number || "case"}-${index}`}>
                          <td>
                            <div className="reports-client-name">
                              {payment.client_name || payment.client || "Unknown Client"}
                            </div>
                          </td>
                          <td className="mono">{payment.case_number || "N/A"}</td>
                          <td>{formatCurrency(amountDue)}</td>
                          <td>{formatCurrency(amountPaid)}</td>
                          <td>
                            <span className={outstanding > 0 ? "outstanding-amount" : "settled-amount"}>
                              {formatCurrency(outstanding)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
