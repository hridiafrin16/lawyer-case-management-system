import React from "react";

const map = {
  Running: "badge-running",
  Pending: "badge-pending",
  Closed: "badge-closed",
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${map[status] || "badge-closed"}`}>{status}</span>;
}
