import React, { useState } from "react";
import api from "../api.js";

function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function formatRole(role = "") {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "admin") return "Administrator";
  if (normalizedRole === "advocate") return "Senior Advocate";
  return normalizedRole ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1) : "Not set";
}

export default function Settings() {
  const [user] = useState(getStoredUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [themePreference, setThemePreference] = useState("Court Classic");
  const [languagePreference, setLanguagePreference] = useState("English");
  const [dateFormat, setDateFormat] = useState("DD MMM YYYY");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fullName = user?.name?.trim() || "Not available";
  const email = user?.email?.trim() || "Not available";
  const role = formatRole(user?.role || "");
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LC";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header settings-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Manage account details, security, and local application preferences.
          </p>
        </div>
        <div className="settings-status-card">
          <span className="settings-status-dot" />
          Offline / Local
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card profile-card">
          <div className="settings-card-head">
            <div>
              <span className="settings-eyebrow">Account Profile</span>
              <h2>Profile</h2>
            </div>
            <span className="settings-icon">§</span>
          </div>
          <div className="profile-summary">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="profile-name">{fullName}</div>
              <div className="profile-caption">Logged-in account details</div>
            </div>
          </div>
          <div className="profile-detail-list">
            <div className="profile-detail-row">
              <span>Full name</span>
              <strong>{fullName}</strong>
            </div>
            <div className="profile-detail-row">
              <span>Email</span>
              <strong>{email}</strong>
            </div>
            <div className="profile-detail-row">
              <span>Professional role</span>
              <strong>{role}</strong>
            </div>
          </div>
        </section>

        <section className="settings-card security-card">
          <div className="settings-card-head">
            <div>
              <span className="settings-eyebrow">Password Protection</span>
              <h2>Security</h2>
            </div>
            <span className="settings-icon">⚖</span>
          </div>
          <p className="settings-card-copy">
            Update your password using your current credentials.
          </p>
          {error && <div className="error-msg settings-message">{error}</div>}
          {success && <div className="success-msg settings-message">{success}</div>}
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="field premium">
              <label>Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="field premium">
              <label>New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="field premium">
              <label>Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-accent settings-submit" type="submit">
              Update password
            </button>
          </form>
        </section>

        <section className="settings-card preferences-card">
          <div className="settings-card-head">
            <div>
              <span className="settings-eyebrow">Local Display Options</span>
              <h2>App Preferences</h2>
            </div>
            <span className="settings-icon">▦</span>
          </div>
          <div className="preference-list">
            <label className="preference-item">
              <span>
                <strong>Theme preference</strong>
                <small>Visual preference for the local interface.</small>
              </span>
              <select value={themePreference} onChange={(e) => setThemePreference(e.target.value)}>
                <option>Court Classic</option>
                <option>Light Brief</option>
                <option>Deep Navy</option>
              </select>
            </label>
            <label className="preference-item">
              <span>
                <strong>Language preference</strong>
                <small>Display language preference for this workstation.</small>
              </span>
              <select value={languagePreference} onChange={(e) => setLanguagePreference(e.target.value)}>
                <option>English</option>
                <option>Bangla</option>
              </select>
            </label>
            <label className="preference-item">
              <span>
                <strong>Date format</strong>
                <small>Preferred date presentation across the interface.</small>
              </span>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                <option>DD MMM YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>MMM DD, YYYY</option>
              </select>
            </label>
          </div>
          <div className="settings-note">
            Preferences are visual only in this version and are not saved to the server.
          </div>
        </section>

        <section className="settings-card app-info-card">
          <div className="settings-card-head">
            <div>
              <span className="settings-eyebrow">System Details</span>
              <h2>Application Information</h2>
            </div>
            <span className="settings-icon">▤</span>
          </div>
          <div className="app-info-list">
            <div>
              <span>Application name</span>
              <strong>Lawyer Case Management System</strong>
            </div>
            <div>
              <span>Version</span>
              <strong>1.0.0</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className="offline-status">Offline / Local</strong>
            </div>
          </div>
          <p className="app-description">
            A local chamber management system for organizing clients, cases, hearings,
            payments, and operational reports in a court-focused workflow.
          </p>
        </section>
      </div>
    </div>
  );
}
