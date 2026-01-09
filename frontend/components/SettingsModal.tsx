"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  getSessions,
  revokeSession,
  changePassword,
  deleteAccount,
  type UserSession,
} from "@/lib/api";

type Tab = "sessions" | "password" | "danger";

type Props = {
  onClose: () => void;
  onLogout: () => void;
};

export function SettingsModal({ onClose, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [contentHeight, setContentHeight] = useState<number>(300);
  const contentRef = useRef<HTMLDivElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Animate content height
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      };
      updateHeight();
      // Small delay to ensure content is rendered
      const timer = setTimeout(updateHeight, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, sessions, loadingSessions, passwordError, passwordSuccess]);

  useEffect(() => {
    if (activeTab === "sessions") {
      setLoadingSessions(true);
      getSessions()
        .then(setSessions)
        .catch(console.error)
        .finally(() => setLoadingSessions(false));
    }
  }, [activeTab]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError((e as Error).message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDelete !== "DELETE") return;

    setDeleting(true);
    try {
      await deleteAccount();
      localStorage.removeItem("auth_user");
      localStorage.removeItem("user");
      localStorage.removeItem("involved_spaces");
      onLogout();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-300 ease-out"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 relative">
          {/* Animated underline */}
          <div
            className="absolute bottom-0 h-0.5 bg-orange-500 transition-all duration-300 ease-out"
            style={{
              left: activeTab === "sessions" ? "0%" : activeTab === "password" ? "33.33%" : "66.66%",
              width: "33.33%",
            }}
          />
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === "sessions" ? "text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === "password" ? "text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setActiveTab("danger")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === "danger" ? "text-red-400" : "text-white/50 hover:text-red-400"
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Content with animated height */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ height: contentHeight + 32 }} // +32 for padding
        >
          <div ref={contentRef} className="p-4">
            {/* Sessions Tab */}
            <div
              className={`transition-all duration-300 ${
                activeTab === "sessions"
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 absolute pointer-events-none translate-x-4"
              }`}
            >
              {activeTab === "sessions" && (
                <div className="space-y-3">
                  <p className="text-white/50 text-sm mb-4">
                    Manage your active sessions across devices.
                  </p>
                  {loadingSessions ? (
                    <p className="text-white/50 text-center py-4">Loading...</p>
                  ) : sessions.length === 0 ? (
                    <p className="text-white/50 text-center py-4">No active sessions</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-3 rounded-lg border transition-all duration-200 ${
                            session.is_current
                              ? "bg-green-500/10 border-green-500/30"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium text-sm">
                                  {session.device_name || "Unknown Device"}
                                </p>
                                {session.is_current && (
                                  <span className="px-1.5 py-0.5 bg-green-500/30 text-green-300 text-xs rounded animate-pulse">
                                    Current Session
                                  </span>
                                )}
                              </div>
                              <p className="text-white/50 text-xs mt-1">
                                Last active: {formatDate(session.last_active)}
                              </p>
                              <p className="text-white/40 text-xs">
                                Created: {formatDate(session.created_at)}
                              </p>
                            </div>
                            {!session.is_current && (
                              <button
                                onClick={() => handleRevokeSession(session.id)}
                                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Tab */}
            <div
              className={`transition-all duration-300 ${
                activeTab === "password"
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 absolute pointer-events-none translate-x-4"
              }`}
            >
              {activeTab === "password" && (
                <div className="space-y-4">
                  <p className="text-white/50 text-sm mb-4">
                    Change your account password.
                  </p>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="h-6">
                    {passwordError && (
                      <p className="text-red-400 text-sm animate-fadeIn">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-green-400 text-sm animate-fadeIn">Password changed successfully!</p>
                    )}
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full py-2 bg-orange-600/80 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone Tab */}
            <div
              className={`transition-all duration-300 ${
                activeTab === "danger"
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 absolute pointer-events-none translate-x-4"
              }`}
            >
              {activeTab === "danger" && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h3 className="text-red-400 font-medium mb-2">Delete Account</h3>
                    <p className="text-white/60 text-sm mb-4">
                      This action cannot be undone. Your account will be permanently deleted.
                      Your messages in spaces will be marked as &quot;[deleted]&quot; and you will be
                      removed from all active spaces.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">
                          Type DELETE to confirm
                        </label>
                        <input
                          type="text"
                          value={confirmDelete}
                          onChange={(e) => setConfirmDelete(e.target.value)}
                          placeholder="DELETE"
                          className="w-full px-3 py-2 bg-white/5 border border-red-500/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={confirmDelete !== "DELETE" || deleting}
                        className="w-full py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                      >
                        {deleting ? "Deleting..." : "Delete My Account"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
