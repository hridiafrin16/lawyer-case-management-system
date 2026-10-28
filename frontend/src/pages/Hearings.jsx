import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

function formatHearingDate(dateValue) {
  if (!dateValue) return "Date not set";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatHearingTime(time) {
  if (!time) return "Time not set";
  const [hoursValue, minutesValue] = time.split(":");
  const date = new Date();
  date.setHours(Number(hoursValue), Number(minutesValue || 0), 0, 0);
  if (Number.isNaN(date.getTime())) return time;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function Hearings() {
  const [hearings, setHearings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/hearings/upcoming", { params: { days: 60 } }).then((r) => setHearings(r.data));
  }, []);

  const grouped = hearings.reduce((acc, h) => {
    acc[h.hearing_date] = acc[h.hearing_date] || [];
    acc[h.hearing_date].push(h);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hearings</h1>
          <p className="page-subtitle">Upcoming schedule for the next 60 days.</p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="panel"><div className="empty-state">No upcoming hearings scheduled.</div></div>
      )}

      {Object.entries(grouped).map(([date, items]) => (
        <div className="panel" key={date} style={{ marginBottom: 14 }}>
          <div className="section-title" style={{ marginTop: 0 }}>{date}</div>
          {items.map((h) => (
            <div className="list-item" key={h.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/cases/${h.case_id}`)}>
              <div>
                <strong className="mono">{h.case_number}</strong> — {h.client_name}
                <div className="hearing-list-meta">
                  <span>Date: {formatHearingDate(h.hearing_date)}</span>
                  <span>Time: {formatHearingTime(h.hearing_time)}</span>
                </div>
                <div className="page-subtitle" style={{ margin: "2px 0 0" }}>{h.court_name || "Court not set"} · {h.purpose || "General hearing"}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
