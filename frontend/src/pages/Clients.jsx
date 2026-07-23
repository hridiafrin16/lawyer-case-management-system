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
  const navigate = useNavigate();

  function load(query = "") {
    api.get("/clients", { params: query ? { q: query } : {} }).then((r) => setClients(r.data));
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/clients", form);
      setShowAdd(false);
      setForm({ name: "", mobile: "", address: "", national_id: "" });
      load(q);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add client");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Everyone you represent, in one registry.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowAdd(true)}>+ Add client</button>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          className="search-input"
          placeholder="Search by name or mobile…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-sm" type="submit">Search</button>
      </form>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>National ID</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)}>
                  <td><strong>{c.name}</strong></td>
                  <td className="mono">{c.mobile}</td>
                  <td>{c.address || "—"}</td>
                  <td className="mono">{c.national_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <div className="empty-state">No clients yet. Add your first client to get started.</div>}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add client" onClose={() => setShowAdd(false)}>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleAdd}>
            <div className="field">
              <label>Full name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Mobile number *</label>
              <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>National ID (optional)</label>
              <input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#e5e3d9", color: "var(--ink)" }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent">Save client</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
