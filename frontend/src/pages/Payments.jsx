import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

const filters = ["ALL", "PAID", "PARTIAL", "DUE", "OVERDUE"];

function statusClass(status) {
  if (status === "PAID") return "badge-running";
  if (status === "OVERDUE" || status === "DUE") return "badge-due";
  return "badge-pending";
}

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString()}`;
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get("/payments", { params: { status: filter } })
      .then((response) => setPayments(response.data))
      .catch((error) => console.error("Error fetching payments:", error))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Fee tracking across all clients and cases.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter payments by status">
        {filters.map((status) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === status}
            key={status}
            className={`tab ${filter === status ? "active" : ""}`}
            onClick={() => setFilter(status)}
          >
            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Case</th><th>Due</th><th>Paid</th><th>Remaining</th><th>Due Date</th><th>Status</th><th>Payment Date</th></tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} onClick={() => payment.case_number && navigate(`/cases/${payment.case_id}`)}>
                  <td>{payment.client_name}</td>
                  <td className="mono">{payment.case_number || "—"}</td>
                  <td className="mono">{formatMoney(payment.amount_due)}</td>
                  <td className="mono">{formatMoney(payment.amount_paid)}</td>
                  <td className="mono">{formatMoney(payment.remaining)}</td>
                  <td>{payment.due_date || "—"}</td>
                  <td><span className={`badge ${statusClass(payment.status)}`}>{payment.status}</span></td>
                  <td>{payment.payment_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && payments.length === 0 && <div className="empty-state">No payment records to show.</div>}
          {loading && <div className="empty-state">Loading payments…</div>}
        </div>
      </div>
    </div>
  );
}
