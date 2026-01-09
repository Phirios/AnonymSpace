"use client";

import { BackgroundGlow } from "./BackgroundGlow";

type ErrorType = "not_found" | "unauthorized" | "forbidden" | "generic";

type ErrorScreenProps = {
  type?: ErrorType;
  message?: string;
};

const errorConfig: Record<ErrorType, { title: string; description: string }> = {
  not_found: {
    title: "Space Not Found",
    description: "The space you're looking for doesn't exist or has been deleted.",
  },
  unauthorized: {
    title: "Not Authenticated",
    description: "You need to join a space before you can access it.",
  },
  forbidden: {
    title: "Access Denied",
    description: "You don't have permission to access this space.",
  },
  generic: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
  },
};

export function ErrorScreen({ type = "generic", message }: ErrorScreenProps) {
  const config = errorConfig[type];

  return (
    <div className="relative min-h-screen bg-neutral-950">
      <BackgroundGlow />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 p-8 rounded-2xl border border-white/10 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">{config.title}</h1>
          <p className="text-white/60 mb-6">{message || config.description}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
