"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",            label: "Home" },
  { href: "/dashboard",  label: "Dashboard" },
  { href: "/redeem",     label: "Redeem" },
  { href: "/leaderboard",label: "Leaderboard" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="border-b border-[#1e3a1e] bg-[#0a0f0a] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[#22c55e] font-bold text-lg tracking-tight">
            ☽ Ghadir Waqf
          </Link>
          <div className="hidden sm:flex gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors ${
                  path === l.href
                    ? "text-[#22c55e] font-semibold"
                    : "text-[#6b9e6b] hover:text-[#e8f5e8]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </nav>
  );
}
