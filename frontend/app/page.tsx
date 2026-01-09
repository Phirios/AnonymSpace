'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackgroundGlow } from "@/components/BackgroundGlow";

export default function WelcomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already logged in
    const authUser = localStorage.getItem("auth_user");
    if (authUser) {
      router.push("/dash");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
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

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-white">
              Anonym<span className="text-orange-500">Space</span>
            </h1>
            <p className="text-xl text-white/60">
              Real conversations. Optional anonymity.
            </p>
          </div>

          <div className="backdrop-blur-xl bg-white/5 p-4 sm:p-8 rounded-2xl border border-white/10 text-left space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-amber-300">What is AnonymSpace?</h2>
              <p className="text-white/70 leading-relaxed">
                A group chat app where you can choose to be anonymous or show your nickname on each message.
                Create a space, share the code with friends, and start honest conversations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="font-medium text-white mb-2">Create Spaces</h3>
                <p className="text-sm text-white/50">
                  Start public or private spaces. You control when the conversation ends.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="font-medium text-white mb-2">Choose Anonymity</h3>
                <p className="text-sm text-white/50">
                  Toggle between showing your nickname or going anonymous per message.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="font-medium text-white mb-2">Join with Code</h3>
                <p className="text-sm text-white/50">
                  Get a unique code to share. Anyone with the code can join your space.
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="font-medium text-white mb-2">Ancient History</h3>
                <p className="text-sm text-white/50">
                  Finished public spaces are preserved for everyone to read.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth"
              className="px-8 py-4 bg-orange-600/80 hover:bg-orange-600 rounded-xl text-white font-semibold text-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/history"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 font-medium text-lg transition-colors border border-white/10"
            >
              Browse Ancient History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
