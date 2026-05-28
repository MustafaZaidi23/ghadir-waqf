"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

const links = [
  { href: "/",             label: "Home" },
  { href: "/dashboard",   label: "Dashboard" },
  { href: "/redeem",      label: "Redeem" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function WalletButton() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { address } = useAccount();

  if (!ready) return <div className="w-24 h-8 bg-[#1e3a1e] rounded-lg animate-pulse" />;

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[#6b9e6b] text-xs font-mono hidden sm:block">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={logout}
          className="text-xs border border-[#1e3a1e] text-[#6b9e6b] hover:text-[#f87171] rounded-lg px-3 py-1.5 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={login} className="btn-primary text-sm px-4 py-1.5">
      Sign In
    </button>
  );
}

function AdminLink({ path }: { path: string }) {
  const { address } = useAccount();
  if (!ADMIN || address?.toLowerCase() !== ADMIN) return null;
  return (
    <Link
      href="/admin"
      className={`text-sm transition-colors ${
        path === "/admin"
          ? "text-[#f59e0b] font-semibold"
          : "text-[#6b9e6b] hover:text-[#f59e0b]"
      }`}
    >
      Admin
    </Link>
  );
}

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
            <AdminLink path={path} />
          </div>
        </div>
        <WalletButton />
      </div>
    </nav>
  );
}
