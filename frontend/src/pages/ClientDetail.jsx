import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const navigate = useNavigate();

  function load() {
    api.get(`/clients/${id}`).then((r) => setClient(r.data));
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this client and all associated records? This cannot be undone.")) return;
    await api.delete(`/clients/${id}`);
    navigate("/clients");
  }

  if (!client) return null;

  return (
    <div>
      <Link to="/clients" className="back-link">← Back to clients</Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle mono">{client.mobile} {client.national_id ? `· ID ${client.national_id}` : ""}</p>
        </div>
        <button className="btn btn-danger" onClick={handleDelete}>Delete client</button>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Details</div>
        <p style={{ fontSize: 13.5, color: "var(--ink-muted)" }}>{client.address || "No address on file."}</p>
      </div>

      <div className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>
          Cases
          <button className="btn btn-sm btn-accent" onClick={() => navigate(`/cases?new=1&client=${client.id}`)}>+ New case</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Case No.</th><th>Type</th><th>Court</th><th>Status</th></tr>
            </thead>
            <tbody>
              {client.cases.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)}>
                  <td className="mono">{c.case_number}</td>
                  <td>{c.case_type}</td>
                  <td>{c.court_name || "—"}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {client.cases.length === 0 && <div className="empty-state">No cases filed for this client yet.</div>}
        </div>
      </div>
    </div>
  );
}
