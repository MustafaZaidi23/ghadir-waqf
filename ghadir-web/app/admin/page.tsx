"use client";
import { useEffect, useState } from "react";
import { fetchOverviewStats } from "./actions";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalSalawat: number;
  totalGhdr: number;
  activeCharities: number;
  fundingReceived: number;
  activeCampaigns: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Overview</h1>
        <p className="text-[#6b9e6b] text-sm mt-1">Live platform metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Registered Users"    value={loading ? "—" : s?.totalUsers ?? 0}                           icon="👤" color="#22c55e" />
        <StatCard label="Total Salawat"       value={loading ? "—" : (s?.totalSalawat ?? 0).toLocaleString()}      icon="📿" color="#f59e0b" />
        <StatCard label="GHDR Earned"         value={loading ? "—" : (s?.totalGhdr ?? 0).toLocaleString()}         icon="🪙" color="#E8D5A3" />
        <StatCard label="Active Charities"    value={loading ? "—" : s?.activeCharities ?? 0}                      icon="💚" color="#22c55e" />
        <StatCard label="Funding Received"    value={loading ? "—" : `$${(s?.fundingReceived ?? 0).toLocaleString()}`} icon="💰" color="#22c55e" />
        <StatCard label="Active Campaigns"    value={loading ? "—" : s?.activeCampaigns ?? 0}                      icon="📢" color="#f59e0b" />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-[#6b9e6b] uppercase tracking-wider mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/admin/charities", label: "Add charity",       icon: "💚" },
            { href: "/admin/team",      label: "Add team member",   icon: "👥" },
            { href: "/admin/funding",   label: "Log funding",       icon: "💰" },
            { href: "/admin/marketing", label: "New campaign",      icon: "📢" },
            { href: "/admin/settings",  label: "Set multiplier",    icon: "✨" },
            { href: "/redeem",          label: "View redeem page",  icon: "↗" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-2 px-4 py-3 bg-[#0a1a0a] border border-[#1e3a1e] rounded-lg text-sm text-[#6b9e6b] hover:text-[#e8f5e8] hover:border-[#22c55e] transition-colors"
            >
              <span>{q.icon}</span>
              <span>{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="card py-5 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[#6b9e6b] text-xs mt-1">{label}</div>
    </div>
  );
}
