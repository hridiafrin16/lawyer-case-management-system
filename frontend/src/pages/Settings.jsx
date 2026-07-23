import React, { useState } from "react";
import api from "../api.js";

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account security.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Change password</div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Current password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>New password</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn btn-accent" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}
