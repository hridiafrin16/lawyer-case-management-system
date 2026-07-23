import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  function load() {
    api.get(showAll ? "/payments" : "/payments/due").then((r) => setPayments(r.data));
  }

  useEffect(() => { load(); }, [showAll]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Fee tracking across all clients and cases.</p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${!showAll ? "active" : ""}`} onClick={() => setShowAll(false)}>Due only</div>
        <div className={`tab ${showAll ? "active" : ""}`} onClick={() => setShowAll(true)}>All records</div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Case</th><th>Due</th><th>Paid</th><th>Outstanding</th><th>Date</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} onClick={() => p.case_number && navigate(`/cases/${p.case_id}`)}>
                  <td>{p.client_name}</td>
                  <td className="mono">{p.case_number || "—"}</td>
                  <td className="mono">৳{p.amount_due}</td>
                  <td className="mono">৳{p.amount_paid}</td>
                  <td className="mono">
                    {p.amount_due - p.amount_paid > 0
                      ? <span className="badge badge-due">৳{p.amount_due - p.amount_paid}</span>
                      : <span className="badge badge-running">Settled</span>}
                  </td>
                  <td>{p.payment_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <div className="empty-state">No payment records to show.</div>}
        </div>
      </div>
    </div>
  );
}
