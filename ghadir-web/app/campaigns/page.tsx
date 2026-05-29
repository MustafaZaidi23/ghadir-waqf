"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchPublicCampaigns, Campaign } from "../admin/actions";

const T: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  awareness:   { icon: "📢", label: "Awareness",     color: "#38bdf8", bg: "linear-gradient(135deg,#0c2233,#0f3347)" },
  fundraising: { icon: "💰", label: "Fundraising",   color: "#22c55e", bg: "linear-gradient(135deg,#0a2016,#0f3b1f)" },
  salawat:     { icon: "📿", label: "Salawat Drive", color: "#f59e0b", bg: "linear-gradient(135deg,#251a04,#3b2408)" },
  special_day: { icon: "✨", label: "Special Day",   color: "#a78bfa", bg: "linear-gradient(135deg,#16093b,#241047)" },
  ramadan:     { icon: "☽",  label: "Ramadan",       color: "#e8c87a", bg: "linear-gradient(135deg,#231d04,#332b08)" },
  other:       { icon: "📌", label: "Campaign",      color: "#94a3b8", bg: "linear-gradient(135deg,#111827,#1f2937)" },
};

const PLATFORM_ICONS: Record<string, string> = {
  telegram: "✈️", instagram: "📸", twitter: "𝕏", whatsapp: "💬",
  email: "📧", website: "🌐", multiple: "🔗",
};

const CTA: Record<string, { href: string; label: string }> = {
  salawat:     { href: "/",       label: "Log Salawat"   },
  fundraising: { href: "/redeem", label: "Donate Hadiya" },
  awareness:   { href: "/",       label: "Join Now"       },
  special_day: { href: "/",       label: "Participate"    },
  ramadan:     { href: "/",       label: "Earn GHDR"      },
};

const FILTERS = ["all", "fundraising", "salawat", "awareness", "special_day", "ramadan"] as const;
type Filter = typeof FILTERS[number];
const FLABEL: Record<Filter, string> = {
  all: "All", fundraising: "Fundraising", salawat: "Salawat",
  awareness: "Awareness", special_day: "Special Day", ramadan: "Ramadan",
};

// Seed data shown until real DB records exist
const SEED: Campaign[] = [
  {
    id: "s1", name: "Arbaeen Ziyarat Fund 2026", type: "fundraising", status: "active",
    description: "Support low-income families to perform Ziyarat Arbaeen. Verified by The Zahra Trust. Funds released quarterly to pilgrims in need.",
    target_usd: 5000, raised_usd: 2150, participants: 318, start_date: "2026-05-01", end_date: "2026-08-25", platform: "multiple",
  },
  {
    id: "s2", name: "Salawat Million Challenge", type: "salawat", status: "active",
    description: "Collectively reach 1,000,000 recorded Salawat before Eid al-Adha. Every Salawat counts — invite your family and masjid.",
    participants: 1240, start_date: "2026-05-15", end_date: "2026-06-30", platform: "telegram",
  },
  {
    id: "s3", name: "Ghadir Day — 18 Dhul Hijja", type: "special_day", status: "active",
    description: "Special 3× GHDR multiplier on the Day of Ghadir. Log extra Salawat, earn bonus tokens, and commemorate Imam Ali's appointment.",
    start_date: "2026-07-12", end_date: "2026-07-12", platform: "instagram",
  },
  {
    id: "s4", name: "Clean Water for Yemen", type: "fundraising", status: "active",
    description: "Fund solar-powered water purification systems for rural Yemen. Every 1,000 GHDR = $1 donated directly to the field partner.",
    target_usd: 10000, raised_usd: 3400, participants: 487, start_date: "2026-04-01", end_date: "2026-09-30", platform: "website",
  },
  {
    id: "s5", name: "Islamic Education Scholarship", type: "awareness", status: "paused",
    description: "Raise funds for Islamic studies scholarships. Launching July 2026 with partner institutions across three countries.",
    start_date: "2026-07-01", platform: "email",
  },
  {
    id: "s6", name: "Ramadan GHDR Boost 2026", type: "ramadan", status: "completed",
    description: "2× multiplier ran throughout Ramadan 2026. Community earned 1.8M+ GHDR and donated $1,875 in hadiya to verified charities.",
    target_usd: 2000, raised_usd: 1875, participants: 892, start_date: "2026-03-01", end_date: "2026-03-30", platform: "telegram",
  },
];

function daysLeft(end?: string) {
  if (!end) return null;
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));
}
function progress(raised?: number, target?: number | null) {
  if (!target || Number(target) <= 0) return null;
  return Math.min(100, Math.round(Number(raised ?? 0) / Number(target) * 100));
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ items }: { items: Campaign[] }) {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((i: number) => {
    setSlide(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % items.length), 5000);
  }, [items.length]);

  useEffect(() => {
    if (items.length > 1) go(0);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const c   = items[slide];
  const t   = T[c.type] ?? T.other;
  const cta = CTA[c.type] ?? { href: "/", label: "Get Involved" };
  const dl  = daysLeft(c.end_date);
  const pct = progress(c.raised_usd as number | undefined, c.target_usd);

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${t.color}25` }}>
      <div style={{ background: t.bg, padding: 24, minHeight: 230 }}>

        {/* Top row: type pill + urgency badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.color, background: t.color + "20", border: `1px solid ${t.color}35`, borderRadius: 20, padding: "4px 12px" }}>
            {t.icon}  {t.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {dl !== null && dl <= 7 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: dl <= 2 ? "#f87171" : "#f59e0b", background: dl <= 2 ? "#f8717118" : "#f59e0b18", borderRadius: 20, padding: "4px 12px" }}>
                {dl === 0 ? "Ends today!" : `${dl}d left`}
              </span>
            )}
            {c.platform && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{PLATFORM_ICONS[c.platform]}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e8f5e8", margin: "0 0 8px", lineHeight: 1.25 }}>{c.name}</h2>

        {/* Description */}
        {c.description && (
          <p style={{
            fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 18px",
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
          } as React.CSSProperties}>
            {c.description}
          </p>
        )}

        {/* Progress */}
        {pct !== null && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: t.color, fontWeight: 600 }}>${Number(c.raised_usd ?? 0).toLocaleString()} raised</span>
              <span style={{ color: "#6b7280" }}>Goal ${Number(c.target_usd).toLocaleString()} · {pct}%</span>
            </div>
            <div style={{ height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: t.color, borderRadius: 4, transition: "width .6s" }} />
            </div>
          </div>
        )}

        {/* Participants */}
        {(c.participants ?? 0) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ display: "flex" }}>
              {[...Array(Math.min(5, c.participants!))].map((_, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: t.color + "30", border: `1.5px solid ${t.color}50`, marginLeft: i > 0 ? -7 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                  👤
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              <strong style={{ color: t.color }}>{c.participants!.toLocaleString()}</strong> participating
            </span>
          </div>
        )}

        {/* Bottom: CTA + dots */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href={cta.href} className="btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>
            {cta.label} →
          </Link>

          {items.length > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {items.map((_, i) => (
                <button key={i} onClick={() => go(i)} style={{
                  width: i === slide ? 22 : 7, height: 7, borderRadius: 4,
                  background: i === slide ? t.color : "rgba(255,255,255,0.18)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all .3s ease",
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide progress bar */}
      {items.length > 1 && (
        <div style={{ height: 2, background: "#1e3a1e" }}>
          <div style={{
            height: "100%", background: t.color, opacity: .5,
            animation: "slideProgress 5s linear infinite",
            width: "100%",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ c }: { c: Campaign }) {
  const t   = T[c.type] ?? T.other;
  const cta = CTA[c.type] ?? { href: "/", label: "Get Involved" };
  const pct = progress(c.raised_usd as number | undefined, c.target_usd);
  const dl  = daysLeft(c.end_date);
  const done   = c.status === "completed";
  const paused = c.status === "paused";

  return (
    <div style={{
      background: "#111a11", border: "1px solid #1e3a1e", borderRadius: 14,
      overflow: "hidden", opacity: done ? 0.72 : 1,
      display: "flex", flexDirection: "column",
    }}>
      {/* Colour accent stripe */}
      <div style={{ height: 3, background: done ? "#1e3a1e" : t.color }} />

      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: t.color + "18", border: `1px solid ${t.color}28`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
            }}>
              {t.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e8", lineHeight: 1.3 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: t.color, fontWeight: 500, marginTop: 2 }}>{t.label}</div>
            </div>
          </div>
          {done   && <span style={{ fontSize: 10, color: "#38bdf8", background: "#38bdf815", border: "1px solid #38bdf830", borderRadius: 20, padding: "2px 9px", flexShrink: 0 }}>Done</span>}
          {paused && <span style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b15", border: "1px solid #f59e0b30", borderRadius: 20, padding: "2px 9px", flexShrink: 0 }}>Soon</span>}
          {!done && !paused && dl !== null && dl <= 3 && (
            <span style={{ fontSize: 10, color: "#f87171", background: "#f8717115", border: "1px solid #f8717130", borderRadius: 20, padding: "2px 9px", flexShrink: 0, fontWeight: 700 }}>
              {dl === 0 ? "Today!" : `${dl}d`}
            </span>
          )}
        </div>

        {/* Description */}
        {c.description && (
          <p style={{
            fontSize: 12, color: "#6b9e6b", lineHeight: 1.55, margin: 0,
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
          } as React.CSSProperties}>
            {c.description}
          </p>
        )}

        {/* Progress bar */}
        {pct !== null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b9e6b", marginBottom: 5 }}>
              <span style={{ color: done ? "#6b9e6b" : t.color, fontWeight: 600 }}>${Number(c.raised_usd ?? 0).toLocaleString()}</span>
              <span>/ ${Number(c.target_usd).toLocaleString()} · {pct}%</span>
            </div>
            <div style={{ height: 4, background: "#1a2e1a", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: done ? "#2d4a2d" : t.color, borderRadius: 2 }} />
            </div>
          </div>
        )}

        {/* Participants */}
        {(c.participants ?? 0) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <span style={{ color: done ? "#374151" : t.color, fontWeight: 600 }}>
              👥 {c.participants!.toLocaleString()}
            </span>
            <span style={{ color: "#374151" }}>participants</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ fontSize: 11, color: "#374151", display: "flex", gap: 8 }}>
            {c.platform && <span>{PLATFORM_ICONS[c.platform] ?? "🔗"} {c.platform}</span>}
            {!done && dl !== null && dl > 3 && <span style={{ color: "#6b9e6b" }}>{dl}d left</span>}
            {done && c.end_date && <span>Ended {c.end_date}</span>}
          </div>
          {!done && (
            <Link href={cta.href} style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 8, fontWeight: 600,
              background: t.color + "18", color: t.color, border: `1px solid ${t.color}30`,
              textDecoration: "none", transition: "opacity .15s",
            }}>
              {cta.label} →
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<Filter>("all");

  useEffect(() => {
    fetchPublicCampaigns()
      .then(d => setCampaigns(d.length > 0 ? d : SEED))
      .catch(() => setCampaigns(SEED))
      .finally(() => setLoading(false));
  }, []);

  const active    = campaigns.filter(c => c.status === "active");
  const upcoming  = campaigns.filter(c => c.status === "paused");
  const completed = campaigns.filter(c => c.status === "completed");

  const filtered =
    filter === "all" ? campaigns : campaigns.filter(c => c.type === filter);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, color: "#6b9e6b", gap: 10 }}>
        <span style={{ fontSize: 18, animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
        Loading campaigns…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8f5e8", margin: 0 }}>Campaigns</h1>
          {active.length > 0 && (
            <span style={{ fontSize: 11, color: "#22c55e", background: "#22c55e15", border: "1px solid #22c55e30", borderRadius: 20, padding: "2px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livePulse 2s infinite" }} />
              {active.length} live
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "#6b9e6b", margin: 0 }}>
          Participate in active drives · earn bonus GHDR · support the Waqf
        </p>
      </div>

      {/* ── Hero carousel — shown only on "all" view ── */}
      {filter === "all" && active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b9e6b", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livePulse 2s infinite" }} />
            Live now
          </div>
          <HeroCarousel items={active} />
        </div>
      )}

      {/* ── Filter pills ── */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" } as React.CSSProperties}>
        {FILTERS.map(f => {
          const n = f === "all" ? campaigns.length : campaigns.filter(c => c.type === f).length;
          if (f !== "all" && n === 0) return null;
          const on = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, whiteSpace: "nowrap", fontSize: 12, padding: "7px 15px",
              borderRadius: 20, cursor: "pointer", transition: "all .15s",
              background: on ? "#0d2b16" : "transparent",
              border: on ? "1px solid #22c55e50" : "1px solid #1e3a1e",
              color: on ? "#22c55e" : "#6b9e6b", fontWeight: on ? 600 : 400,
            }}>
              {FLABEL[f]}{n > 0 && <span style={{ marginLeft: 5, opacity: .55, fontWeight: 400 }}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Upcoming ── */}
      {filter === "all" && upcoming.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b9e6b", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
            Coming soon
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {upcoming.map(c => <CampaignCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {/* ── Filtered / full grid ── */}
      {filter !== "all" && (
        filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "52px 16px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📢</div>
            <p style={{ color: "#6b9e6b", fontSize: 14 }}>No campaigns in this category yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {filtered.map(c => <CampaignCard key={c.id} c={c} />)}
          </div>
        )
      )}

      {/* ── Completed ── */}
      {filter === "all" && completed.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b9e6b", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
            Completed
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {completed.map(c => <CampaignCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {campaigns.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "64px 16px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕌</div>
          <p style={{ color: "#6b9e6b" }}>No campaigns yet — check back soon.</p>
        </div>
      )}
    </div>
  );
}
