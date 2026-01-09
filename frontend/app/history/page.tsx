"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getHistorySpaces, type HistorySpace } from "@/lib/api";
import { BackgroundGlow } from "@/components/BackgroundGlow";

type FilterType = "all" | "public" | "private";

type InvolvedSpace = {
  token: string;
  space_id: string;
  space_name: string;
  is_creator: boolean;
  is_finished?: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Check if a space is finished using a specific token
async function checkSpaceFinished(spaceId: string, token: string): Promise<HistorySpace | null> {
  try {
    const res = await fetch(`${API_URL}/space/${spaceId}/my-history`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        shot_count: data.shots.length,
        is_public: false, // If we're using my-history, assume private
      };
    }
  } catch {
    // Space not finished or not accessible
  }
  return null;
}

export default function HistoryListPage() {
  const [publicSpaces, setPublicSpaces] = useState<HistorySpace[]>([]);
  const [mySpaces, setMySpaces] = useState<HistorySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always fetch public history
        const publicData = await getHistorySpaces();
        setPublicSpaces(publicData);

        // Check all involved spaces for finished ones
        const storedInvolved = localStorage.getItem("involved_spaces");
        if (storedInvolved) {
          setHasAuth(true);
          const involved: InvolvedSpace[] = JSON.parse(storedInvolved);

          // Check each involved space
          const privateSpaces: HistorySpace[] = [];
          await Promise.all(
            involved.map(async (space) => {
              // Skip if it's already in public spaces
              if (publicData.find((p) => p.id === space.space_id)) {
                return;
              }
              const finished = await checkSpaceFinished(space.space_id, space.token);
              if (finished) {
                privateSpaces.push(finished);
              }
            })
          );
          setMySpaces(privateSpaces);
        }
      } catch (e) {
        console.error("Failed to fetch history:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Combine and deduplicate spaces
  const allSpaces = useMemo(() => {
    const combined = [...publicSpaces];
    mySpaces.forEach((space) => {
      if (!combined.find((s) => s.id === space.id)) {
        combined.push(space);
      }
    });
    return combined;
  }, [publicSpaces, mySpaces]);

  // Filter and search
  const filteredSpaces = useMemo(() => {
    return allSpaces.filter((space) => {
      // Filter by type
      if (filter === "public" && !space.is_public) return false;
      if (filter === "private" && space.is_public) return false;

      // Search by name
      if (search && !space.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [allSpaces, filter, search]);

  const hasPrivateSpaces = mySpaces.some((s) => !s.is_public);

  return (
    <div className="relative min-h-screen bg-neutral-950">
      <BackgroundGlow />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
        <div className="backdrop-blur-xl bg-white/10 p-8 rounded-2xl border border-white/10 w-[28rem]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-amber-300">Ancient History</h1>
            <Link
              href="/"
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-sm transition-colors"
            >
              Back
            </Link>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spaces..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Filter */}
          {hasAuth && hasPrivateSpaces && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === "all"
                    ? "bg-amber-500/80 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("public")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === "public"
                    ? "bg-amber-500/80 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setFilter("private")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === "private"
                    ? "bg-amber-500/80 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Private
              </button>
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-white/50 text-center py-8">Loading...</p>
          ) : filteredSpaces.length === 0 ? (
            <p className="text-white/50 text-center py-8">
              {search || filter !== "all" ? "No matching spaces" : "No finished spaces yet"}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSpaces.map((space) => (
                <Link
                  key={space.id}
                  href={space.is_public ? `/history/${space.id}` : `/history/${space.id}?private=1`}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{space.name}</p>
                      {!space.is_public && (
                        <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm">{space.shot_count} shots</p>
                  </div>
                  <span className="text-amber-400/70 text-sm">Read</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
