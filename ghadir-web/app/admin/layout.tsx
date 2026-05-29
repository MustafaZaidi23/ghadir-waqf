"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { fetchMyRole } from "./actions";
import { AdminRoleContext, AdminRole, ROLE_ACCESS, ROLE_LABELS, canAccess } from "./role-context";

const SUPER_ADMIN = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

const ALL_NAV = [
  { href: "/admin",           label: "Overview",  icon: "📊" },
  { href: "/admin/charities", label: "Charities", icon: "💚" },
  { href: "/admin/team",      label: "Team",      icon: "👥" },
  { href: "/admin/funding",   label: "Funding",   icon: "💰" },
  { href: "/admin/marketing", label: "Marketing", icon: "📢" },
  { href: "/admin/settings",  label: "Settings",  icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { login, ready } = usePrivy();
  const path = usePathname();

  const [role, setRole] = useState<AdminRole>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) { setRole(null); return; }
    if (address.toLowerCase() === SUPER_ADMIN) { setRole("super_admin"); return; }
    setRoleLoading(true);
    fetchMyRole(address)
      .then((r) => setRole((r as AdminRole) ?? null))
      .catch(() => setRole(null))
      .finally(() => setRoleLoading(false));
  }, [address, isConnected]);

  if (!ready || (isConnected && address?.toLowerCase() !== SUPER_ADMIN && roleLoading)) {
    return <div className="flex items-center justify-center py-24 text-[#6b9e6b]">Loading…</div>;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🔐</div>
        <h2 className="text-2xl font-bold text-[#e8f5e8]">Admin Portal</h2>
        <p className="text-[#6b9e6b]">Sign in with your team wallet to continue.</p>
        <button onClick={login} className="btn-primary px-6 py-2">Sign In</button>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="text-2xl font-bold text-[#f87171]">Not authorised</h2>
        <p className="text-[#6b9e6b] text-sm">
          This wallet is not listed as an active team member.
        </p>
        <p className="text-[#6b9e6b] font-mono text-xs break-all">{address}</p>
      </div>
    );
  }

  const nav = ALL_NAV.filter((n) => (ROLE_ACCESS[role] ?? []).includes(n.href));
  const roleInfo = ROLE_LABELS[role] ?? { label: role, color: "#6b9e6b" };
  const pageAllowed = canAccess(role, path);

  return (
    <AdminRoleContext.Provider value={role}>
      <div className="max-w-6xl mx-auto">
        {/* Mobile: scrollable tab bar */}
        <nav className="md:hidden flex overflow-x-auto gap-1.5 mb-6 pb-1 -mx-4 px-4">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                path === n.href
                  ? "bg-[#0d2b16] text-[#22c55e] border-[#14532d]"
                  : "text-[#6b9e6b] bg-[#0a1a0a] border-[#1e3a1e]"
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        {/* Desktop: sidebar + content */}
        <div className="flex gap-8">
          <aside className="hidden md:block w-44 shrink-0">
            <div className="sticky top-24 space-y-0.5">
              <p className="text-[10px] text-[#4a7a4a] uppercase tracking-widest font-semibold mb-1 px-3">
                Admin Portal
              </p>
              {/* Role badge */}
              <div className="px-3 mb-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full border"
                  style={{ color: roleInfo.color, borderColor: roleInfo.color + "40", backgroundColor: roleInfo.color + "10" }}
                >
                  {roleInfo.label}
                </span>
              </div>
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    path === n.href
                      ? "bg-[#0d2b16] text-[#22c55e] font-medium border border-[#14532d]"
                      : "text-[#6b9e6b] hover:text-[#e8f5e8] hover:bg-[#0a1a0a]"
                  }`}
                >
                  <span className="text-base">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              ))}
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {pageAllowed ? children : (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="text-5xl">🔒</div>
                <h2 className="text-xl font-bold text-[#f87171]">Access restricted</h2>
                <p className="text-[#6b9e6b] text-sm">
                  Your role (<span style={{ color: roleInfo.color }}>{roleInfo.label}</span>) does not have access to this section.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </AdminRoleContext.Provider>
  );
}
