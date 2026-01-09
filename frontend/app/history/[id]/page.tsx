"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSpaceHistory, getMySpaceHistory, type SpaceHistory, type Shot } from "@/lib/api";
import { BackgroundGlow } from "@/components/BackgroundGlow";

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

function HistoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const spaceId = params.id as string;
  const isPrivate = searchParams.get("private") === "1";

  const [history, setHistory] = useState<SpaceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Try private endpoint first if flagged, fall back to public
        if (isPrivate) {
          // Find the token for this space from involved_spaces
          const storedInvolved = localStorage.getItem("involved_spaces");
          if (storedInvolved) {
            const involved = JSON.parse(storedInvolved);
            const spaceData = involved.find((s: { space_id: string }) => s.space_id === spaceId);
            if (spaceData) {
              // Set user context for API call
              localStorage.setItem("user", JSON.stringify(spaceData));
            }
          }
          const data = await getMySpaceHistory(spaceId);
          setHistory(data);
        } else {
          const data = await getSpaceHistory(spaceId);
          setHistory(data);
        }
      } catch (e) {
        // If private failed, try public as fallback
        if (isPrivate) {
          try {
            const data = await getSpaceHistory(spaceId);
            setHistory(data);
          } catch (e2) {
            setError((e2 as Error).message);
          }
        } else {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [spaceId, isPrivate]);

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || "History not found"}</p>
          <Link
            href="/history"
            className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col h-screen pt-16">
      {/* Header */}
      <div className="p-4 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">{history.name}</h1>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-sm">
              Ancient History
            </span>
          </div>
          <Link
            href="/history"
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-sm transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <p className="text-center text-amber-300/80 text-sm">
          This is a read-only archive of a finished space. {history.shots.length} shots preserved.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {history.shots.length === 0 ? (
            <p className="text-white/30 text-center py-8">No messages in this space.</p>
          ) : (
            history.shots.map((shot: Shot) => {
              const hasNickname = shot.nickname !== null;
              const bubbleColor = hasNickname
                ? getUserColor(shot.user_id)
                : "bg-neutral-600/80";

              return (
                <div key={shot.id} className="flex justify-start">
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl rounded-bl-md text-white ${bubbleColor}`}
                  >
                    {hasNickname ? (
                      <p className="text-xs text-white/70 mb-1">
                        {shot.nickname}
                        {shot.is_kicked && (
                          <span className="ml-1 text-red-400">(kicked)</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-white/50 mb-1 italic">
                        Anonymous
                        {shot.is_kicked && (
                          <span className="ml-1 text-red-400 not-italic">(kicked)</span>
                        )}
                      </p>
                    )}
                    <p className="break-words">{shot.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div className="relative min-h-screen bg-neutral-950">
      <BackgroundGlow />
      <Suspense
        fallback={
          <div className="relative z-10 flex min-h-screen items-center justify-center">
            <p className="text-white/50">Loading...</p>
          </div>
        }
      >
        <HistoryContent />
      </Suspense>
    </div>
  );
}
