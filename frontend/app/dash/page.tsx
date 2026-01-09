'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { SpaceJoinCreate } from "@/components/SpaceJoinCreate";
import { InvolvedSpaces } from "@/components/InvolvedSpaces";
import { PublicSpaces } from "@/components/PublicSpaces";
import { Profile } from "@/components/Profile";

type AuthUser = {
  token: string;
  user_id: string;
  username: string;
};

export default function DashPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth_user");
    if (!stored) {
      router.push("/");
      return;
    }
    setAuthUser(JSON.parse(stored));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("user");
    localStorage.removeItem("involved_spaces");
    router.push("/");
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

  return (
    <div className="relative min-h-screen bg-neutral-950">
      <BackgroundGlow />

      <div className="relative z-10 min-h-screen p-4 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profile */}
          <div className="flex justify-center md:justify-start">
            <Profile username={authUser?.username || ""} onLogout={handleLogout} />
          </div>

          {/* Space actions */}
          <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/10">
            <SpaceJoinCreate />
          </div>

          {/* Spaces and History */}
          <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/10 space-y-6">
            <InvolvedSpaces />
            <PublicSpaces />
            <div className="border-t border-white/10 pt-4">
              <Link
                href="/history"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-300 font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Ancient History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
