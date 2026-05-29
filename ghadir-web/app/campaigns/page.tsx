"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicCampaigns, Campaign } from "../admin/actions";

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  awareness:   { icon: "📢", label: "Awareness",     color: "#1E40AF", bg: "#EFF6FF" },
  fundraising: { icon: "💰", label: "Fundraising",   color: "#166534", bg: "#D8F3DC" },
  salawat:     { icon: "📿", label: "Salawat Drive", color: "#92400E", bg: "#FEF3C7" },
  special_day: { icon: "✨", label: "Special Day",   color: "#5B21B6", bg: "#EDE9FE" },
  ramadan:     { icon: "☽",  label: "Ramadan",       color: "#78350F", bg: "#FBF5E6" },
  other:       { icon: "📌", label: "Campaign",      color: "#374151", bg: "#F3F4F6" },
};

const PLATFORM_ICONS: Record<string, string> = {
  telegram: "✈️", instagram: "📸", twitter: "𝕏", whatsapp: "💬",
  email: "📧", website: "🌐", multiple: "🔗",
};

export default function MajlisPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCampaigns().then(setCampaigns).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active    = campaigns.filter(c => c.status === "active");
  const upcoming  = campaigns.filter(c => c.status === "paused");
  const completed = campaigns.filter(c => c.status === "completed");

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100dvh", color: "#9CA3AF", fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ background: "#F9F6EF", minHeight: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#0A3A22", padding: "20px 20px 24px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>Majlis</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Events, drives & special days</div>
      </div>

      {/* Live campaigns */}
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Live now</div>
          {active.map(c => <CampaignCard key={c.id} campaign={c} hero />)}
        </>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Upcoming</div>
          {upcoming.map(c => <CampaignCard key={c.id} campaign={c} hero={false} />)}
        </>
      )}

      {/* Register a gathering */}
      <div style={{ margin: "12px 16px 0" }}>
        <div style={{ background: "#D8F3DC", border: "0.5px solid rgba(45,106,79,0.2)", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>➕</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#0A3A22" }}>Register a gathering</div>
            <div style={{ fontSize: 11, color: "#2D6A4F", marginTop: 2 }}>Verified mosques earn bonus multiplier for attendees</div>
          </div>
          <div style={{ fontSize: 16, color: "#2D6A4F" }}>›</div>
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Completed</div>
          {completed.map(c => <CampaignCard key={c.id} campaign={c} hero={false} />)}
        </>
      )}

      {campaigns.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 16px", color: "#9CA3AF" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🕌</div>
          <div style={{ fontSize: 14 }}>No campaigns yet — check back soon.</div>
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, hero }: { campaign: Campaign; hero: boolean }) {
  const type = TYPE_META[c.type] ?? TYPE_META.other;
  const daysLeft = c.end_date ? Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)) : null;
  const progress = c.target_usd && Number(c.target_usd) > 0
    ? Math.min(100, Math.round(Number(c.raised_usd ?? 0) / Number(c.target_usd) * 100)) : null;
  const ctaMap: Record<string, { href: string; label: string }> = {
    salawat:     { href: "/",       label: "Log Salawat →" },
    fundraising: { href: "/redeem", label: "Donate Hadiya →" },
  };
  const cta = ctaMap[c.type] ?? { href: "/", label: "Participate →" };

  return (
    <div style={{ margin: hero ? "0 16px 0" : "0 16px 10px", background: hero ? "linear-gradient(135deg,#0A3A22,#1A4A30)" : "#fff", borderRadius: 14, border: hero ? "none" : "0.5px solid rgba(0,0,0,0.07)", padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, background: hero ? "rgba(255,255,255,0.1)" : type.bg, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {type.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: hero ? 15 : 14, fontWeight: 500, color: hero ? "rgba(255,255,255,0.9)" : "#1A1A1A", marginBottom: 3 }}>{c.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 11, color: hero ? "rgba(255,255,255,0.4)" : type.color }}>{type.label}</span>
            {c.platform && <span style={{ fontSize: 11, color: hero ? "rgba(255,255,255,0.3)" : "#9CA3AF" }}>{PLATFORM_ICONS[c.platform] ?? "🔗"} {c.platform}</span>}
          </div>
        </div>
        {hero && daysLeft !== null && c.status === "active" && (
          <div style={{ background: "rgba(201,168,76,0.15)", border: "0.5px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#E8D5A3" }}>{daysLeft}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>days left</div>
          </div>
        )}
      </div>

      {c.description && <p style={{ fontSize: 12, color: hero ? "rgba(255,255,255,0.4)" : "#6B7280", marginTop: 8, lineHeight: 1.5 }}>{c.description}</p>}

      {progress !== null && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: hero ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 4 }}>
            <span style={{ color: hero ? "#E8D5A3" : "#0A3A22", fontWeight: 500 }}>${Number(c.raised_usd ?? 0).toLocaleString()} raised</span>
            <span>Goal ${Number(c.target_usd).toLocaleString()} · {progress}%</span>
          </div>
          <div style={{ height: 4, background: hero ? "rgba(255,255,255,0.1)" : "#F3F4F6", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: hero ? "#52B788" : "#2D6A4F", borderRadius: 2 }} />
          </div>
        </div>
      )}

      {c.status === "active" && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {hero && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{c.start_date} {c.end_date ? `→ ${c.end_date}` : ""}</span>}
          <Link href={cta.href} className="btn-primary" style={{ fontSize: 12, padding: "8px 16px", marginLeft: "auto" }}>{cta.label}</Link>
        </div>
      )}
    </div>
  );
}
