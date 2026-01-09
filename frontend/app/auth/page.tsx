'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { register, login } from "@/lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (username.trim().length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }
    }

    setLoading(true);
    try {
      const res = mode === "register"
        ? await register(username.trim(), password)
        : await login(username.trim(), password);

      localStorage.setItem("auth_user", JSON.stringify(res));
      router.push("/dash");
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setError("");
    setConfirmPassword("");
  };

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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-3xl font-bold text-white">
              Anonym<span className="text-orange-500">Space</span>
            </Link>
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
            {/* Mode tabs */}
            <div className="flex relative">
              {/* Animated underline */}
              <div
                className="absolute bottom-0 h-0.5 bg-orange-500 transition-all duration-300 ease-out"
                style={{
                  left: mode === "login" ? "0%" : "50%",
                  width: "50%",
                }}
              />
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-4 text-center font-medium transition-colors duration-200 ${
                  mode === "login"
                    ? "text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-4 text-center font-medium transition-colors duration-200 ${
                  mode === "register"
                    ? "text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Register
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                {/* Animated confirm password field */}
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{
                    gridTemplateRows: mode === "register" ? "1fr" : "0fr",
                    opacity: mode === "register" ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <label className="block text-sm text-white/70 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                      tabIndex={mode === "register" ? 0 : -1}
                    />
                  </div>
                </div>

                {/* Error message with animation */}
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{
                    gridTemplateRows: error ? "1fr" : "0fr",
                    opacity: error ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="text-red-400 text-sm py-1">{error}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-600/80 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200 relative"
                >
                  <span className={`transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}>
                    {mode === "login" ? "Login" : "Create Account"}
                  </span>
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </button>
              </form>

              <p className="text-center text-white/50 text-sm mt-6">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {mode === "login" ? "Register" : "Login"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
