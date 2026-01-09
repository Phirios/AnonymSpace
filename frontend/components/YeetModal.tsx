"use client";

import { useState } from "react";
import { leaveSpace, deleteSpace } from "@/lib/api";

type Props = {
  spaceId: string;
  spaceName: string;
  isCreator: boolean;
  isFinished: boolean;
  onClose: () => void;
};

export function YeetModal({ spaceId, spaceName, isCreator, isFinished, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGetOut = async () => {
    setLoading(true);
    try {
      await leaveSpace();
      // Remove from involved spaces
      const stored = localStorage.getItem("involved_spaces");
      if (stored) {
        const involved = JSON.parse(stored);
        const updated = involved.filter((s: { space_id: string }) => s.space_id !== spaceId);
        localStorage.setItem("involved_spaces", JSON.stringify(updated));
      }
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to leave:", e);
      setLoading(false);
    }
  };

  const handleEpicComeback = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const handleFinishSpace = async () => {
    if (!confirm(`Are you sure you want to finish "${spaceName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteSpace(spaceId);
      // Mark as finished in involved spaces (keep token for history access)
      const stored = localStorage.getItem("involved_spaces");
      if (stored) {
        const involved = JSON.parse(stored);
        const updated = involved.map((s: { space_id: string }) =>
          s.space_id === spaceId ? { ...s, is_finished: true } : s
        );
        localStorage.setItem("involved_spaces", JSON.stringify(updated));
      }
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to finish:", e);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <h3 className="text-lg font-semibold text-white text-center">Yeet Options</h3>

        <button
          onClick={handleEpicComeback}
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
        >
          Epic Comeback
          <span className="block text-xs text-white/70 font-normal mt-1">
            Leave now, rejoin later from My Spaces
          </span>
        </button>

        {!isCreator && (
          <button
            onClick={handleGetOut}
            disabled={loading}
            className="w-full px-4 py-3 bg-orange-500/80 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
          >
            {loading ? "..." : "Get Out"}
            <span className="block text-xs text-white/70 font-normal mt-1">
              Leave permanently, cannot rejoin
            </span>
          </button>
        )}

        {isCreator && !isFinished && (
          <button
            onClick={handleFinishSpace}
            disabled={loading}
            className="w-full px-4 py-3 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
          >
            {loading ? "..." : "Finish the Space"}
            <span className="block text-xs text-white/70 font-normal mt-1">
              End the space for everyone
            </span>
          </button>
        )}

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
