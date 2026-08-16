import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import Cases from "./pages/Cases.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";
import Hearings from "./pages/Hearings.jsx";
import Payments from "./pages/Payments.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";

function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  return { user, setUser };
}

function Protected({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function formatRole(role = "") {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "admin") return "Administrator";
  if (normalizedRole === "advocate") return "Senior Advocate";
  return normalizedRole ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1) : "";
}

const navItems = [
  { to: "/", label: "Dashboard", icon: "◧" },
  { to: "/cases", label: "Cases", icon: "⚖" },
  { to: "/clients", label: "Clients", icon: "◍" },
  { to: "/hearings", label: "Hearings", icon: "▤" },
  { to: "/payments", label: "Payments", icon: "৳" },
  { to: "/reports", label: "Reports", icon: "▥" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function App() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const displayName = user ? user.name?.trim() || "User" : "User";
  const displayRole = user ? formatRole(user.role || "") : "";

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">§</span>
          <div>
            <div className="brand-name">Chambers</div>
            <div className="brand-sub">Case Registry</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{displayName[0]?.toUpperCase() || "U"}</div>
            <div>
              <div className="user-name">{displayName}</div>
              <div className="user-role">{displayRole}</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Protected user={user}><Dashboard /></Protected>} />
          <Route path="/clients" element={<Protected user={user}><Clients /></Protected>} />
          <Route path="/clients/:id" element={<Protected user={user}><ClientDetail /></Protected>} />
          <Route path="/cases" element={<Protected user={user}><Cases /></Protected>} />
          <Route path="/cases/:id" element={<Protected user={user}><CaseDetail /></Protected>} />
          <Route path="/hearings" element={<Protected user={user}><Hearings /></Protected>} />
          <Route path="/payments" element={<Protected user={user}><Payments /></Protected>} />
          <Route path="/reports" element={<Protected user={user}><Reports /></Protected>} />
          <Route path="/settings" element={<Protected user={user}><Settings /></Protected>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
