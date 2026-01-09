"use client";

import { useState, useEffect, useRef } from "react";
import { getProfile, updateProfile, type UserProfile } from "@/lib/api";
import { SettingsModal } from "./SettingsModal";

type Props = {
  username: string;
  onLogout: () => void;
};

export function Profile({ username, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setNickname(p.nickname || "");
      })
      .catch((e) => {
        // If session is revoked or unauthorized, log out
        if (e.message?.includes("revoked") || e.message?.includes("Unauthorized") || e.message?.includes("401")) {
          onLogout();
        } else {
          console.error(e);
        }
      });
  }, [onLogout]);

  const handleSaveNickname = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const updated = await updateProfile({ nickname: nickname.trim() });
      setProfile(updated);
      setEditingNickname(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert("Image must be less than 20MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const updated = await updateProfile({ avatar_url: base64 });
          setProfile(updated);
        } catch (err) {
          console.error(err);
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadingAvatar(false);
    }

    // Reset input
    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = await updateProfile({ avatar_url: "" });
      setProfile(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName = profile?.nickname || username;
  const avatarDisplay = profile?.avatar_url;

  return (
    <>
      <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/10 w-full max-w-xs">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="relative group">
            {avatarDisplay ? (
              <img
                src={avatarDisplay}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-wait"
            >
              <span className="text-white text-sm">
                {uploadingAvatar ? "..." : "Edit"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Remove avatar button */}
          {avatarDisplay && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Remove photo
            </button>
          )}

          {/* Nickname */}
          <div
            className="w-full overflow-hidden transition-all duration-300 ease-out"
            style={{ height: editingNickname ? "88px" : "48px" }}
          >
            {editingNickname ? (
              <div className="w-full space-y-2 animate-fadeIn">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center placeholder-white/40 focus:outline-none focus:border-white/30"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNickname}
                    disabled={loading}
                    className="flex-1 px-3 py-1 bg-green-500/80 hover:bg-green-500 disabled:opacity-50 rounded text-white text-sm transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingNickname(false);
                      setNickname(profile?.nickname || "");
                    }}
                    className="flex-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white/70 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center animate-fadeIn">
                <button
                  onClick={() => setEditingNickname(true)}
                  className="group flex items-center gap-1 mx-auto"
                >
                  <span className="text-lg font-medium text-white">
                    {displayName}
                  </span>
                  <span className="text-white/30 group-hover:text-white/70 transition-colors text-sm">
                    (edit)
                  </span>
                </button>
                <p className="text-white/50 text-sm">@{username}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full pt-2">
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
            <button
              onClick={onLogout}
              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onLogout={onLogout} />
      )}
    </>
  );
}
