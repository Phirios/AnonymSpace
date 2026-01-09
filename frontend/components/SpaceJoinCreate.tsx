"use client";

import { useState, useEffect } from "react";
import { createSpace, joinSpace, getProfile } from "@/lib/api";

type AutoFinishOption = "none" | "5" | "15" | "30" | "60" | "120" | "1440";

const autoFinishOptions: { value: AutoFinishOption; label: string }[] = [
  { value: "none", label: "Never (delete after 5min inactive)" },
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "1440", label: "24 hours" },
];

export function SpaceJoinCreate() {
  const [joinCode, setJoinCode] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [autoFinish, setAutoFinish] = useState<AutoFinishOption>("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        // Use profile nickname, or username if no nickname set
        setNickname(p.nickname || p.username);
      })
      .catch(console.error);
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim() || !nickname) return;
    setLoading(true);
    setError(null);
    try {
      const result = await joinSpace(joinCode.trim(), nickname);
      localStorage.setItem("user", JSON.stringify(result));

      // Add to involved spaces
      const stored = localStorage.getItem("involved_spaces");
      const involved = stored ? JSON.parse(stored) : [];
      const existing = involved.findIndex((s: { space_id: string }) => s.space_id === result.space_id);
      if (existing >= 0) {
        involved[existing] = result;
      } else {
        involved.push(result);
      }
      localStorage.setItem("involved_spaces", JSON.stringify(involved));

      window.location.href = `/space/${result.space_id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join space");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!spaceName.trim() || !nickname) return;
    setLoading(true);
    setError(null);
    try {
      const autoFinishMinutes = autoFinish === "none" ? null : parseInt(autoFinish);
      const result = await createSpace(spaceName.trim(), isPublic, nickname, autoFinishMinutes);
      const userData = {
        token: result.token,
        user_id: result.user_id,
        space_id: result.space_id,
        space_name: result.name,
        nickname: nickname,
        is_creator: true,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Add to involved spaces
      const stored = localStorage.getItem("involved_spaces");
      const involved = stored ? JSON.parse(stored) : [];
      involved.push(userData);
      localStorage.setItem("involved_spaces", JSON.stringify(involved));

      window.location.href = `/space/${result.space_id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Join a Space</h2>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Space code"
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={handleJoin}
          disabled={loading || !joinCode.trim() || !nickname}
          className="w-full px-4 py-2 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          {loading ? "Joining..." : "Join"}
        </button>
      </div>

      <div className="border-t border-white/10" />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Create a Space</h2>
        <input
          type="text"
          value={spaceName}
          onChange={(e) => setSpaceName(e.target.value)}
          placeholder="Space name"
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-white/70">Make it public</span>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? "bg-blue-500" : "bg-white/20"}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isPublic ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>
        <div className="space-y-1">
          <label className="text-white/70 text-sm">Finish when inactive for</label>
          <select
            value={autoFinish}
            onChange={(e) => setAutoFinish(e.target.value as AutoFinishOption)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
          >
            {autoFinishOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-neutral-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !spaceName.trim() || !nickname}
          className="w-full px-4 py-2 bg-purple-500/80 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          {loading ? "Creating..." : "Create Space"}
        </button>
      </div>
    </div>
  );
}
