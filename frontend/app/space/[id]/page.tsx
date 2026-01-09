"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getSpace, getShots, sendShot, updateSpace, getSpaceHistory, getSpaceUsers, updateBanSetting, type SpaceInfo, type Shot } from "@/lib/api";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { ErrorScreen } from "@/components/ErrorScreen";
import { YeetModal } from "@/components/YeetModal";
import { SpaceUsers } from "@/components/SpaceUsers";

type UserData = {
  token: string;
  user_id: string;
  space_id: string;
  space_name: string;
  nickname: string;
  is_creator: boolean;
};

type ErrorState = {
  type: "not_found" | "unauthorized" | "forbidden" | "generic";
  message?: string;
} | null;

// Generate a consistent color from user_id
function getUserColor(userId: string): string {
  const colors = [
    "bg-rose-500/80",
    "bg-pink-500/80",
    "bg-fuchsia-500/80",
    "bg-purple-500/80",
    "bg-violet-500/80",
    "bg-indigo-500/80",
    "bg-blue-500/80",
    "bg-cyan-500/80",
    "bg-teal-500/80",
    "bg-emerald-500/80",
    "bg-green-500/80",
    "bg-lime-500/80",
    "bg-yellow-500/80",
    "bg-amber-500/80",
    "bg-orange-500/80",
    "bg-red-500/80",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function SpacePage() {
  const params = useParams();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [message, setMessage] = useState("");
  const [showNickname, setShowNickname] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showYeetModal, setShowYeetModal] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [togglingBan, setTogglingBan] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const savingNameRef = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        // No session - check if it's a finished public space
        try {
          await getSpaceHistory(spaceId);
          window.location.href = `/history/${spaceId}`;
          return;
        } catch {
          setError({ type: "unauthorized" });
          setLoading(false);
          return;
        }
      }

      const parsed = JSON.parse(storedUser) as UserData;
      if (parsed.space_id !== spaceId) {
        // Wrong session - check if it's a finished public space
        try {
          await getSpaceHistory(spaceId);
          window.location.href = `/history/${spaceId}`;
          return;
        } catch {
          setError({ type: "forbidden", message: "You are not a member of this space." });
          setLoading(false);
          return;
        }
      }

      setUser(parsed);

      try {
        const s = await getSpace(spaceId);
        setSpace(s);
        setNewName(s.name);
      } catch (e) {
        // Check if it's a finished public space we can view as history
        try {
          await getSpaceHistory(spaceId);
          window.location.href = `/history/${spaceId}`;
          return;
        } catch {
          // Not available as history, show original error
          const msg = (e as Error).message?.toLowerCase() || "";
          if (msg.includes("not found")) {
            setError({ type: "not_found" });
          } else if (msg.includes("unauthorized") || msg.includes("401")) {
            setError({ type: "unauthorized" });
          } else if (msg.includes("forbidden") || msg.includes("denied") || msg.includes("403")) {
            setError({ type: "forbidden" });
          } else {
            setError({ type: "generic", message: (e as Error).message });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [spaceId]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [shotsData, spaceData, usersData] = await Promise.all([
          getShots(spaceId),
          getSpace(spaceId),
          getSpaceUsers(spaceId),
        ]);
        setShots(shotsData);
        setSpace(spaceData);

        // Check if current user is kicked
        const currentUser = usersData.find(u => u.id === user.user_id);
        if (currentUser?.is_kicked && !isKicked) {
          setIsKicked(true);
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [spaceId, user, isKicked]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shots]);

  const handleSend = async () => {
    if (!message.trim() || !user || isKicked) return;
    const content = message.trim();
    setMessage("");
    try {
      await sendShot(content, showNickname);
      const newShots = await getShots(spaceId);
      setShots(newShots);
    } catch (e) {
      const errorMsg = (e as Error).message || "";
      // If kicked error from backend, update state
      if (errorMsg.toLowerCase().includes("kicked")) {
        setIsKicked(true);
      }
      console.error("Failed to send:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  const handleUpdateName = async () => {
    if (!newName.trim() || newName === space?.name) {
      setEditingName(false);
      setNewName(space?.name || "");
      return;
    }
    savingNameRef.current = true;
    try {
      const updated = await updateSpace(spaceId, newName.trim());
      setSpace(updated);
      setEditingName(false);

      // Update name in involved_spaces localStorage
      const stored = localStorage.getItem("involved_spaces");
      if (stored) {
        const spaces = JSON.parse(stored);
        const updatedSpaces = spaces.map((s: { space_id: string; space_name: string }) =>
          s.space_id === spaceId ? { ...s, space_name: updated.name } : s
        );
        localStorage.setItem("involved_spaces", JSON.stringify(updatedSpaces));
      }

      // Update current user session
      const userStored = localStorage.getItem("user");
      if (userStored) {
        const userData = JSON.parse(userStored);
        if (userData.space_id === spaceId) {
          userData.space_name = updated.name;
          localStorage.setItem("user", JSON.stringify(userData));
        }
      }
    } catch (e) {
      console.error("Failed to update:", e);
      setNewName(space?.name || "");
    } finally {
      savingNameRef.current = false;
    }
  };

  const handleCopyCode = () => {
    if (space) {
      navigator.clipboard.writeText(space.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleBan = async () => {
    if (!space) return;
    setTogglingBan(true);
    try {
      const updated = await updateBanSetting(spaceId, !space.ban_kicked_users);
      setSpace(updated);
    } catch (e) {
      console.error("Failed to update ban setting:", e);
    } finally {
      setTogglingBan(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-neutral-950">
        <BackgroundGlow />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorScreen type={error.type} message={error.message} />;
  }

  if (!space || !user) {
    return <ErrorScreen type="not_found" />;
  }

  return (
    <div className="relative min-h-screen bg-neutral-950">
      <BackgroundGlow />

      <div className="relative z-10 flex flex-col h-screen pt-16">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateName();
                      } else if (e.key === "Escape") {
                        setNewName(space.name);
                        setEditingName(false);
                      }
                    }}
                    onBlur={() => {
                      // Don't cancel if we're saving
                      if (!savingNameRef.current) {
                        setEditingName(false);
                        setNewName(space.name);
                      }
                    }}
                    autoFocus
                    className="bg-transparent border-b border-white/30 text-white text-lg sm:text-xl font-semibold focus:outline-none focus:border-white/60 min-w-0 flex-1 transition-colors"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate">{space.name}</h1>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    space.is_public
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/50"
                  }`}>
                    {space.is_public ? "Public" : "Private"}
                  </span>
                  {space.is_creator && !space.is_finished && (
                    <button onClick={() => setEditingName(true)} className="text-white/40 hover:text-white/70 text-sm shrink-0">
                      ✎
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={handleCopyCode}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                  space.is_creator
                    ? "bg-amber-500/80 hover:bg-amber-500 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white/70"
                }`}
              >
                {copied ? "Copied!" : space.code}
              </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <p className="text-white/50 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{user.nickname}</p>
              <button
                onClick={() => setShowUsers(!showUsers)}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors ${
                  showUsers
                    ? "bg-white/20 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white/70"
                }`}
              >
                Users
              </button>
              {!space.is_finished && !isKicked && (
                <button
                  onClick={() => setShowYeetModal(true)}
                  className="px-2 sm:px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  Yeet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users panel */}
        <div
          className="grid transition-all duration-300 ease-out border-b border-white/10"
          style={{
            gridTemplateRows: showUsers ? "1fr" : "0fr",
          }}
        >
          <div className="overflow-hidden">
            <div className="p-4 max-w-4xl mx-auto space-y-4">
              <SpaceUsers
                spaceId={spaceId}
                isCreator={space.is_creator}
                currentUserId={user.user_id}
                isFinished={space.is_finished}
              />
              {/* Ban setting toggle - only for creator in private non-finished spaces */}
              {space.is_creator && !space.is_public && !space.is_finished && (
                <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">Ban kicked users</p>
                      <p className="text-white/50 text-xs">
                        {space.ban_kicked_users
                          ? "Kicked users cannot see messages after being kicked"
                          : "Kicked users can see all messages when space finishes"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleBan}
                      disabled={togglingBan}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        space.ban_kicked_users ? "bg-orange-500" : "bg-white/20"
                      } ${togglingBan ? "opacity-50" : ""}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                          space.ban_kicked_users ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kicked notification - show for kicked users in private spaces OR kicked users in non-finished spaces */}
        {isKicked && (!space.is_public || !space.is_finished) && (
          <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-3">
            <p className="text-center text-orange-300 font-medium">
              You have been kicked from this space.{!space.is_public && " You can only see messages from before you were kicked."}
            </p>
          </div>
        )}

        {/* Finished notification - show for non-kicked users OR kicked users in public finished spaces */}
        {space.is_finished && (!isKicked || space.is_public) && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3">
            <p className="text-center text-red-300 font-medium">
              This space has been finished by the creator. You can still view messages but cannot send new ones.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            {shots.length === 0 ? (
              <p className="text-white/30 text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              shots.map((shot) => {
                const isOwn = shot.user_id === user.user_id;
                const hasNickname = shot.nickname !== null;
                const bubbleColor = isOwn
                  ? "bg-orange-600/80"
                  : hasNickname
                    ? getUserColor(shot.user_id)
                    : "bg-neutral-600/80";

                return (
                  <div
                    key={shot.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-white ${bubbleColor} ${
                        isOwn ? "rounded-br-md" : "rounded-bl-md"
                      }`}
                    >
                      {!isOwn && hasNickname && (
                        <p className="text-xs text-white/70 mb-1">
                          {shot.nickname}
                          {shot.is_kicked && (
                            <span className="ml-1 text-red-400">(kicked)</span>
                          )}
                        </p>
                      )}
                      {!isOwn && !hasNickname && (
                        <p className="text-xs text-white/50 mb-1 italic">
                          Anonymous
                        </p>
                      )}
                      <p className="break-words">{shot.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - hidden when space is finished or user is kicked */}
        {!space.is_finished && !isKicked && (
          <div className="p-4 border-t border-white/10 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto flex gap-2 items-center">
              <button
                onClick={() => setShowNickname(!showNickname)}
                className={`w-10 h-10 rounded-xl transition-colors flex items-center justify-center ${
                  showNickname
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/40"
                }`}
                title={showNickname ? "Nickname visible" : "Posting anonymously"}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showNickname ? (
                    <>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </>
                  ) : (
                    <>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                      <line x1="3" y1="3" x2="21" y2="21" />
                    </>
                  )}
                </svg>
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={showNickname ? "Type a message..." : "Type anonymously..."}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="px-6 py-3 bg-orange-600/80 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
              >
                Shot
              </button>
            </div>
          </div>
        )}
      </div>

      {showYeetModal && (
        <YeetModal
          spaceId={spaceId}
          spaceName={space.name}
          isCreator={space.is_creator}
          isFinished={space.is_finished}
          onClose={() => setShowYeetModal(false)}
        />
      )}
    </div>
  );
}
