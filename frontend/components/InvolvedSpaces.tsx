"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { deleteSpace, getSpace } from "@/lib/api";

type InvolvedSpace = {
  token: string;
  user_id: string;
  space_id: string;
  space_name: string;
  nickname: string;
  is_creator: boolean;
  is_finished?: boolean;
};

export function InvolvedSpaces() {
  const [spaces, setSpaces] = useState<InvolvedSpace[]>([]);
  const [confirmFinish, setConfirmFinish] = useState<InvolvedSpace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSpaces = async () => {
      const stored = localStorage.getItem("involved_spaces");
      if (!stored) return;

      try {
        const all: InvolvedSpace[] = JSON.parse(stored);
        // Filter out already known finished spaces
        const notFinished = all.filter((s) => !s.is_finished);

        // Check each space's status from the server
        const checkedSpaces = await Promise.all(
          notFinished.map(async (space) => {
            try {
              // Temporarily set user context for API call
              localStorage.setItem("user", JSON.stringify(space));
              const info = await getSpace(space.space_id);
              return { ...space, is_finished: info.is_finished };
            } catch {
              // If we can't fetch, assume it might be finished/deleted
              return { ...space, is_finished: true };
            }
          })
        );

        // Clear temporary user context
        localStorage.removeItem("user");

        // Update localStorage with new finished states
        const updatedAll = all.map((s) => {
          const checked = checkedSpaces.find((c) => c.space_id === s.space_id);
          return checked || s;
        });
        localStorage.setItem("involved_spaces", JSON.stringify(updatedAll));

        // Only show non-finished spaces
        setSpaces(checkedSpaces.filter((s) => !s.is_finished));
      } catch {
        setSpaces([]);
      }
    };

    checkSpaces();
  }, []);

  const handleJoin = (space: InvolvedSpace) => {
    localStorage.setItem("user", JSON.stringify(space));
    window.location.href = `/space/${space.space_id}`;
  };

  const handleRemove = (space: InvolvedSpace) => {
    if (space.is_creator) {
      setConfirmFinish(space);
    } else {
      removeFromList(space.space_id);
    }
  };

  const removeFromList = (spaceId: string) => {
    const updated = spaces.filter((s) => s.space_id !== spaceId);
    setSpaces(updated);
    localStorage.setItem("involved_spaces", JSON.stringify(updated));
  };

  const handleFinishSpace = async () => {
    if (!confirmFinish) return;
    setLoading(true);
    try {
      // Set the user context for the API call
      localStorage.setItem("user", JSON.stringify(confirmFinish));
      await deleteSpace(confirmFinish.space_id);

      // Mark as finished in localStorage (keep token for history access)
      const stored = localStorage.getItem("involved_spaces");
      if (stored) {
        const all: InvolvedSpace[] = JSON.parse(stored);
        const updated = all.map((s) =>
          s.space_id === confirmFinish.space_id ? { ...s, is_finished: true } : s
        );
        localStorage.setItem("involved_spaces", JSON.stringify(updated));
      }

      // Remove from display list
      setSpaces(spaces.filter((s) => s.space_id !== confirmFinish.space_id));
      localStorage.removeItem("user");
      setConfirmFinish(null);
    } catch (e) {
      console.error("Failed to finish space:", e);
    } finally {
      setLoading(false);
    }
  };

  if (spaces.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">My Spaces</h2>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {spaces.map((space) => (
            <div
              key={space.space_id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{space.space_name}</p>
                <p className="text-white/50 text-sm truncate">
                  {space.nickname} {space.is_creator && "(Creator)"}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => handleJoin(space)}
                  className="px-3 py-1 bg-orange-500/80 hover:bg-orange-500 rounded-md text-white text-sm transition-colors"
                >
                  Enter
                </button>
                <button
                  onClick={() => handleRemove(space)}
                  className="px-2 py-1 bg-white/10 hover:bg-red-500/30 rounded-md text-white/50 hover:text-red-300 text-sm transition-colors"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm finish modal for creators */}
      {confirmFinish && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-80 space-y-4">
            <h3 className="text-lg font-semibold text-white">Finish Space?</h3>
            <p className="text-white/70 text-sm">
              As the creator of &quot;{confirmFinish.space_name}&quot;, removing it will finish the space for everyone. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmFinish(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishSpace}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {loading ? "..." : "Finish"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
