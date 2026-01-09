"use client";

import { useState, useEffect, useRef } from "react";
import { getSpaceUsers, kickUser, type SpaceUser } from "@/lib/api";

type Tab = "active" | "kicked";

type Props = {
  spaceId: string;
  isCreator: boolean;
  currentUserId: string;
  isFinished: boolean;
};

export function SpaceUsers({ spaceId, isCreator, currentUserId, isFinished }: Props) {
  const [users, setUsers] = useState<SpaceUser[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [kicking, setKicking] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = () => {
      getSpaceUsers(spaceId).then(setUsers).catch(console.error);
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKick = async (userId: string) => {
    setKicking(userId);
    try {
      await kickUser(spaceId, userId);
      const updated = await getSpaceUsers(spaceId);
      setUsers(updated);
    } catch (e) {
      console.error("Failed to kick:", e);
    } finally {
      setKicking(null);
      setOpenMenuId(null);
    }
  };

  const activeUsers = users.filter((u) => !u.is_kicked);
  const kickedUsers = users.filter((u) => u.is_kicked);
  const displayedUsers = tab === "active" ? activeUsers : kickedUsers;

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* Tabs */}
      <div className="flex relative border-b border-white/10">
        <div
          className="absolute bottom-0 h-0.5 bg-orange-500 transition-all duration-300 ease-out"
          style={{
            left: tab === "active" ? "0%" : "50%",
            width: "50%",
          }}
        />
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${
            tab === "active" ? "text-white" : "text-white/50 hover:text-white/70"
          }`}
        >
          Active ({activeUsers.length})
        </button>
        <button
          onClick={() => setTab("kicked")}
          className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${
            tab === "kicked" ? "text-white" : "text-white/50 hover:text-white/70"
          }`}
        >
          Kicked ({kickedUsers.length})
        </button>
      </div>

      {/* User list */}
      <div className="max-h-64 overflow-y-auto">
        {displayedUsers.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            {tab === "active" ? "No active users" : "No kicked users"}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {displayedUsers.map((user) => (
              <li
                key={user.id}
                className="px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm truncate">{user.nickname}</span>
                  {user.is_creator && (
                    <span className="text-amber-400 text-xs shrink-0">Creator</span>
                  )}
                  {user.id === currentUserId && (
                    <span className="text-white/40 text-xs shrink-0">(you)</span>
                  )}
                </div>

                {/* Three dot menu for creator to kick other users */}
                {isCreator && !user.is_creator && tab === "active" && !isFinished && (
                  <div className="relative" ref={openMenuId === user.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      className="p-1 text-white/40 hover:text-white/70 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                      </svg>
                    </button>

                    {/* Dropdown menu - positioned above to avoid overflow clipping */}
                    {openMenuId === user.id && (
                      <div className="absolute right-0 bottom-full mb-1 bg-neutral-800 border border-white/10 rounded-lg shadow-lg z-10 overflow-hidden">
                        <button
                          onClick={() => handleKick(user.id)}
                          disabled={kicking === user.id}
                          className="px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 disabled:opacity-50 transition-colors"
                        >
                          {kicking === user.id ? "..." : "Kick"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
