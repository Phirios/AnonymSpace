"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function Topbar() {
  const pathname = usePathname();

  // Hide on welcome page since it has its own branding
  // Use CSS hidden instead of returning null to avoid hydration issues
  return (
    <header
      className={`sticky top-0 left-0 right-0 z-20 p-4 select-none backdrop-blur-sm bg-neutral-950/50 ${
        pathname === "/" ? "hidden" : ""
      }`}
    >
      <Link href="/dash" className="text-white font-semibold text-xl hover:text-white/80 transition-colors">
        Anonym<span className="text-orange-500">Space</span>
      </Link>
    </header>
  );
}
