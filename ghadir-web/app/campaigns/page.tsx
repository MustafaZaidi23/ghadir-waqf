"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicCampaigns, Campaign } from "../admin/actions";

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  awareness:   { icon: "📢", label: "Awareness",     color: "#38bdf8" },
  fundraising: { icon: "💰", label: "Fundraising",   color: "#22c55e" },
  salawat:     { icon: "📿", label: "Salawat Drive", color: "#f59e0b" },
  special_day: { icon: "✨", label: "Special Day",   color: "#a78bfa" },
  ramadan:     { icon: "☽",  label: "Ramadan",       color: "#E8D5A3" },
  other:       { icon: "📌", label: "Campaign",      color: "#94a3b8" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:    { label: "Live",      color: "#22c55e" },
  paused:    { label: "Paused",    color: "#f59e0b" },
  completed: { label: "Completed", color: "#38bdf8" },
};

const PLATFORM_ICONS: Record<string, string> = {
  telegram:  "✈️",
  instagram: "📸",
  twitter:   "𝕏",
  whatsapp:  "💬",
  email:     "📧",
  website:   "🌐",
  multiple:  "🔗",
};

function CampaignCTA({ campaign }: { campaign: Campaign }) {
  if (campaign.status === "completed") return null;
  const ctaMap: Record<string, { href: string; label: string }> = {
    salawat:     { href: "/",       label: "Log Salawat →" },
    fundraising: { href: "/redeem", label: "Donate Hadiya →" },
    awareness:   { href: "/",       label: "Join Now →" },
    special_day: { href: "/",       label: "Participate →" },
    ramadan:     { href: "/",       label: "Earn GHDR →" },
  };
  const cta = ctaMap[campaign.type] ?? { href: "/", label: "Get Involved →" };
  return (
    <Link href={cta.href} className="btn-primary text-sm inline-block">
      {cta.label}
    </Link>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    fetchPublicCampaigns()
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active    = campaigns.filter((c) => c.status === "active");
  const others    = campaigns.filter((c) => c.status !== "active");
  const displayed = filter === "all" ? campaigns
    : filter === "active"    ? active
    : others;

  if (loading) {
    return <div className="flex justify-center py-24 text-[#6b9e6b]">Loading…</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Campaigns</h1>
        <p className="text-[#6b9e6b] text-sm mt-1">
          Participate in active drives to earn bonus GHDR and support the Waqf.
        </p>
      </div>

      {/* Active campaigns hero */}
      {active.length > 0 && filter === "all" && (
        <div className="space-y-3">
          <p className="text-xs text-[#6b9e6b] uppercase tracking-wider font-semibold">Live now</p>
          {active.map((c) => <CampaignCard key={c.id} campaign={c} hero />)}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
              filter === f
                ? "bg-[#0d2b16] text-[#22c55e] border-[#14532d]"
                : "text-[#6b9e6b] border-[#1e3a1e] hover:text-[#e8f5e8]"
            }`}>
            {f === "all" ? `All (${campaigns.length})` : f === "active" ? `Live (${active.length})` : `Completed (${others.length})`}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {displayed.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">📢</div>
          <p className="text-[#6b9e6b]">No campaigns yet — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((c) => (
            <CampaignCard key={c.id} campaign={c} hero={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, hero }: { campaign: Campaign; hero: boolean }) {
  const type   = TYPE_META[c.type]   ?? TYPE_META.other;
  const status = STATUS_META[c.status] ?? { label: c.status, color: "#94a3b8" };
  const progress = c.target_usd && Number(c.target_usd) > 0
    ? Math.min(100, Math.round((Number(c.raised_usd ?? 0) / Number(c.target_usd)) * 100))
    : null;
  const daysLeft = c.end_date
    ? Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div
      className="card space-y-4"
      style={hero ? { borderColor: type.color + "40", background: `linear-gradient(135deg, ${type.color}08, transparent)` } : {}}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{type.icon}</span>
          <div>
            <h2 className={`font-semibold ${hero ? "text-lg" : "text-base"} text-[#e8f5e8]`}>{c.name}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs" style={{ color: type.color }}>{type.label}</span>
              {c.platform && (
                <span className="text-xs text-[#6b9e6b]">
                  {PLATFORM_ICONS[c.platform] ?? "🔗"} {c.platform}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full border shrink-0"
          style={{ color: status.color, borderColor: status.color + "40", backgroundColor: status.color + "10" }}>
          {status.label}
        </span>
      </div>

      {/* Description */}
      {c.description && (
        <p className="text-[#6b9e6b] text-sm leading-relaxed">{c.description}</p>
      )}

      {/* Progress bar */}
      {progress !== null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#6b9e6b]">
            <span className="text-[#e8f5e8] font-medium">${Number(c.raised_usd ?? 0).toLocaleString()} raised</span>
            <span>Goal: ${Number(c.target_usd).toLocaleString()} · {progress}%</span>
          </div>
          <div className="h-2 bg-[#1e3a1e] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: type.color }} />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-4 text-xs text-[#6b9e6b]">
          {c.start_date && <span>From {c.start_date}</span>}
          {c.end_date && c.status === "active" && daysLeft !== null && (
            <span className={daysLeft <= 3 ? "text-[#f59e0b] font-medium" : ""}>
              {daysLeft === 0 ? "Ends today" : `${daysLeft}d left`}
            </span>
          )}
          {c.end_date && c.status !== "active" && <span>Ended {c.end_date}</span>}
        </div>
        <CampaignCTA campaign={c} />
      </div>
    </div>
  );
}
