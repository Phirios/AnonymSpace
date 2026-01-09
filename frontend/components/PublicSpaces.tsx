"use client";

import { useState, useEffect } from "react";
import { getPublicSpaces, joinSpace, getProfile, type PublicSpace } from "@/lib/api";

type JoinState = {
  code: string;
  nickname: string;
  spaceName: string;
  editing: boolean;
} | null;

type InvolvedSpace = {
  space_id: string;
  is_creator: boolean;
};

export function PublicSpaces() {
  const [publicSpaces, setPublicSpaces] = useState<PublicSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicJoin, setPublicJoin] = useState<JoinState>(null);
  const [profileNickname, setProfileNickname] = useState<string | null>(null);
  const [involvedSpaces, setInvolvedSpaces] = useState<InvolvedSpace[]>([]);

  useEffect(() => {
    getPublicSpaces()
      .then(setPublicSpaces)
      .catch((e) => console.error("Failed to fetch public spaces:", e));

    // Fetch profile nickname
    getProfile()
      .then((profile) => setProfileNickname(profile.nickname || profile.username))
      .catch(() => setProfileNickname(null));

    // Load involved spaces from localStorage
    const stored = localStorage.getItem("involved_spaces");
    if (stored) {
      setInvolvedSpaces(JSON.parse(stored));
    }
  }, []);

  const isCreatorOf = (spaceId: string) => {
    return involvedSpaces.some((s) => s.space_id === spaceId && s.is_creator);
  };

  const handleJoinPublic = (space: PublicSpace) => {
    const nickname = profileNickname || "";
    setPublicJoin({ code: space.code, nickname, spaceName: space.name, editing: false });
  };

  const handlePublicJoinSubmit = async () => {
    if (!publicJoin || !publicJoin.nickname.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await joinSpace(publicJoin.code, publicJoin.nickname.trim());
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

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Public Spaces</h2>
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {publicSpaces.length === 0 ? (
            <p className="text-white/50 text-sm">No public spaces yet</p>
          ) : (
            publicSpaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div>
                  <p className="text-white font-medium">{space.name}</p>
                  <p className="text-white/50 text-sm">{space.member_count} members</p>
                </div>
                {isCreatorOf(space.id) ? (
                  <span className="px-3 py-1 text-amber-400/80 text-sm">
                    Your space
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoinPublic(space)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white/80 text-sm transition-colors"
                  >
                    Join
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Nickname modal for public space join */}
      {publicJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs space-y-4">
            <h3 className="text-lg font-semibold text-white">Join {publicJoin.spaceName}</h3>

            {publicJoin.editing ? (
              <input
                type="text"
                value={publicJoin.nickname}
                onChange={(e) => setPublicJoin({ ...publicJoin, nickname: e.target.value })}
                placeholder="Your nickname"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPublicJoin({ ...publicJoin, editing: false });
                  }
                }}
                onBlur={() => setPublicJoin({ ...publicJoin, editing: false })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
            ) : (
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white/70 text-sm">
                  Joining as <span className="text-white font-medium">{publicJoin.nickname || "..."}</span>
                </p>
                <button
                  onClick={() => setPublicJoin({ ...publicJoin, editing: true })}
                  className="text-white/50 hover:text-white/80 text-sm transition-colors"
                >
                  Edit
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPublicJoin(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublicJoinSubmit}
                disabled={loading || !publicJoin.nickname.trim() || publicJoin.editing}
                className="flex-1 px-4 py-2 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {loading ? "..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
