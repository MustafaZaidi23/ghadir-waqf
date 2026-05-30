"use client";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { SALAWAT_TOKEN, SALAWAT_ABI, EXPLORER } from "@/lib/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTelegramUser, getTelegramWebApp, isInTelegram } from "@/lib/telegram";
import { fetchPublicCampaigns, Campaign } from "../admin/actions";
import { useLanguage, LANG_META, Lang } from "@/lib/i18n";

interface SalawatLog {
  id: string;
  count: number;
  tokens_earned: number;
  multiplier: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
}

const TYPE_COLOR: Record<string, string> = {
  fundraising: "#22c55e", salawat: "#f59e0b", awareness: "#38bdf8",
  special_day: "#a78bfa", ramadan: "#e8c87a", other: "#94a3b8",
};
const CTA_LABEL: Record<string, { href: string; label: string }> = {
  salawat:     { href: "/",       label: "Log Salawat"   },
  fundraising: { href: "/redeem", label: "Donate Hadiya" },
  awareness:   { href: "/",       label: "Get Involved"  },
  special_day: { href: "/",       label: "Earn Bonus"    },
  ramadan:     { href: "/",       label: "Earn GHDR"     },
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { login, logout } = usePrivy();
  const { lang, setLang, t } = useLanguage();
  const [logs, setLogs] = useState<SalawatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);

  const tgUser = getTelegramUser();
  const inTelegram = isInTelegram();

  const { data: balance } = useReadContract({
    address: SALAWAT_TOKEN,
    abi: SALAWAT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: lifetime } = useReadContract({
    address: SALAWAT_TOKEN,
    abi: SALAWAT_ABI,
    functionName: "lifetimeSalawat",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: dailyMinted } = useReadContract({
    address: SALAWAT_TOKEN,
    abi: SALAWAT_ABI,
    functionName: "dailyMinted",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: dailyCap } = useReadContract({
    address: SALAWAT_TOKEN,
    abi: SALAWAT_ABI,
    functionName: "dailyCap",
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/history/${address}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [address]);

  // Load joined campaigns
  useEffect(() => {
    if (!address) return;
    Promise.all([
      fetch(`/api/join-campaign?wallet=${address}`).then(r => r.json()),
      fetchPublicCampaigns().catch(() => [] as Campaign[]),
    ]).then(([joinData, allCampaigns]) => {
      const ids: string[] = joinData.joined ?? [];
      setMyCampaigns(allCampaigns.filter(c => c.id && ids.includes(c.id)));
    }).catch(() => {});
  }, [address]);

  // Auto-link wallet to Telegram account when both are available
  useEffect(() => {
    if (!inTelegram || !address || linkStatus !== "idle") return;
    const twa = getTelegramWebApp();
    if (!twa?.initData) return;

    setLinkStatus("linking");
    fetch("/api/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: twa.initData, wallet_address: address }),
    })
      .then((r) => (r.ok ? setLinkStatus("linked") : setLinkStatus("error")))
      .catch(() => setLinkStatus("error"));
  }, [address, inTelegram, linkStatus]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🔗</div>
        <h2 className="text-2xl font-bold text-[#e8f5e8]">
          {tgUser ? `Marhaba, ${tgUser.first_name}` : "Sign in to view your dashboard"}
        </h2>
        <p className="text-[#6b9e6b]">Use email, Google, or your Celo wallet — no seed phrase needed.</p>
        <button onClick={login} className="btn-primary px-6 py-2">Sign In</button>
      </div>
    );
  }

  const ghdr = balance ? Number(formatUnits(balance as bigint, 18)).toFixed(2) : "—";
  const lifetimeCount = lifetime ? String(lifetime) : "0";
  const dailyPct = dailyMinted && dailyCap
    ? Math.min(100, Math.round((Number(dailyMinted) / Number(dailyCap)) * 100))
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }} className="text-2xl font-bold text-[#D4AF37]">{t("your_profile")}</h1>
        {tgUser && (
          <div className="flex items-center gap-2 text-sm text-[#6b9e6b]">
            <span>✈️</span>
            <span>{tgUser.first_name}{tgUser.username ? ` @${tgUser.username}` : ""}</span>
            {linkStatus === "linked" && (
              <span className="text-xs text-[#22c55e] bg-[#14532d] px-2 py-0.5 rounded-full">linked</span>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <div style={{ fontFamily: "'Cinzel', serif" }} className="text-3xl font-bold text-[#E8D5A3]">{ghdr}</div>
          <div className="text-[#6b9e6b] text-sm mt-1">{t("ghdr_balance")}</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#D4AF37]">{lifetimeCount}</div>
          <div className="text-[#6b9e6b] text-sm mt-1">{t("lifetime_salawat")}</div>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold text-[#e8f5e8]">{dailyPct}%</div>
          <div className="text-[#6b9e6b] text-sm mt-1">{t("daily_used")}</div>
          <div className="mt-2 bg-[#1e3a1e] rounded-full h-2">
            <div
              className="bg-[#22c55e] h-2 rounded-full transition-all"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>


      {/* My Campaigns */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="font-semibold text-[#e8f5e8]">{t("my_campaigns")}</h2>
          <Link href="/campaigns" style={{ fontSize: 11, color: "#6b9e6b", textDecoration: "none" }}>{t("browse_all")}</Link>
        </div>
        {myCampaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🕌</div>
            <p style={{ fontSize: 13, color: "#6b9e6b", margin: 0 }}>{t("no_campaigns")}</p>
            <Link href="/campaigns" style={{ fontSize: 12, color: "#22c55e", textDecoration: "none", marginTop: 6, display: "inline-block" }}>
              {t("view_campaigns")}
            </Link>
          </div>
        ) : (
          <>
            {/* Horizontal scroll carousel */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", margin: "0 -1.5rem", padding: "0 1.5rem 4px" } as React.CSSProperties}>
              {myCampaigns.map(c => {
                const color = TYPE_COLOR[c.type] ?? "#94a3b8";
                const cta   = CTA_LABEL[c.type] ?? { href: "/", label: "Participate" };
                const done  = c.status === "completed";
                const pct   = c.target_usd && Number(c.target_usd) > 0
                  ? Math.min(100, Math.round(Number(c.raised_usd ?? 0) / Number(c.target_usd) * 100))
                  : null;
                return (
                  <div key={c.id} style={{
                    flexShrink: 0, width: 200, background: "#0a0f0a",
                    border: `1px solid ${color}25`, borderRadius: 12,
                    overflow: "hidden",
                  }}>
                    {/* colour top stripe */}
                    <div style={{ height: 3, background: done ? "#1e3a1e" : color }} />
                    <div style={{ padding: 12 }}>
                      {/* status dot + label */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: done ? "#374151" : color, flexShrink: 0, display: "inline-block", ...(done ? {} : { animation: "livePulse 2s infinite" }) }} />
                        <span style={{ fontSize: 10, color: done ? "#374151" : color, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>
                          {done ? t("completed_label") : t("live")}
                        </span>
                      </div>
                      {/* name */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e8f5e8", lineHeight: 1.35, marginBottom: 8, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}>
                        {c.name}
                      </div>
                      {/* progress bar */}
                      {pct !== null && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6b9e6b", marginBottom: 3 }}>
                            <span style={{ color, fontWeight: 600 }}>${Number(c.raised_usd ?? 0).toLocaleString()}</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={{ height: 3, background: "#1e3a1e", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: done ? "#1e3a1e" : color, borderRadius: 2 }} />
                          </div>
                        </div>
                      )}
                      {/* participants */}
                      {(c.participants ?? 0) > 0 && (
                        <div style={{ fontSize: 10, color: "#374151", marginBottom: 8 }}>
                          👥 <span style={{ color: done ? "#374151" : color, fontWeight: 600 }}>{c.participants!.toLocaleString()}</span> joined
                        </div>
                      )}
                      {/* CTA */}
                      {!done && (
                        <Link href={cta.href} style={{ display: "block", textAlign: "center", fontSize: 11, padding: "6px 0", borderRadius: 8, background: color + "18", color, border: `1px solid ${color}30`, textDecoration: "none", fontWeight: 600 }}>
                          {cta.label} →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* dot indicators */}
            {myCampaigns.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
                {myCampaigns.map((_, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? "#22c55e" : "#1e3a1e" }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* History */}
      <div className="card">
        <h2 className="font-semibold text-[#e8f5e8] mb-4">{t("salawat_history")}</h2>
        {loading ? (
          <p className="text-[#6b9e6b] text-sm">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-[#6b9e6b] text-sm">
            No history yet. Use the Telegram bot to log your first Salawat.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-[#1e3a1e] last:border-0"
              >
                <div>
                  <span className="text-[#e8f5e8] text-sm">+{log.tokens_earned} GHDR</span>
                  {log.multiplier > 1 && (
                    <span className="ml-2 text-xs text-[#f59e0b]">{log.multiplier}x</span>
                  )}
                  <div className="text-[#6b9e6b] text-xs mt-0.5">
                    {new Date(log.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      log.status === "confirmed"
                        ? "bg-[#14532d] text-[#22c55e]"
                        : log.status === "failed"
                        ? "bg-[#450a0a] text-[#f87171]"
                        : "bg-[#1e3a1e] text-[#6b9e6b]"
                    }`}
                  >
                    {log.status}
                  </span>
                  {log.tx_hash && (
                    <a
                      href={`${EXPLORER}/tx/${log.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#16a34a] hover:underline"
                    >
                      Tx ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="card space-y-0 overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-[#1e3a1e]">
          <p className="text-xs font-semibold text-[#6b9e6b] uppercase tracking-widest">{t("settings")}</p>
        </div>

        {/* Wallet row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3a1e]">
          <div className="w-8 h-8 rounded-lg bg-[#0d2b16] flex items-center justify-center text-sm flex-shrink-0">💼</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#6b9e6b]">{t("connected_wallet")}</p>
            <p className="text-[#e8f5e8] text-xs font-mono truncate mt-0.5">{address}</p>
          </div>
        </div>

        {/* Language row — expands inline */}
        <details className="group border-b border-[#1e3a1e]">
          <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
            <div className="w-8 h-8 rounded-lg bg-[#0d2b16] flex items-center justify-center text-sm flex-shrink-0">🌐</div>
            <div className="flex-1">
              <p className="text-xs text-[#6b9e6b]">{t("language")}</p>
              <p className="text-[#e8f5e8] text-sm mt-0.5">{LANG_META[lang].flag} {LANG_META[lang].nativeLabel}</p>
            </div>
            <span className="text-[#6b9e6b] text-xs group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-2 px-4 pb-3">
            {(Object.keys(LANG_META) as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  lang === l
                    ? "bg-[#0d2b16] border-[#22c55e50] text-[#22c55e] font-medium"
                    : "border-[#1e3a1e] text-[#6b9e6b] hover:border-[#2d4a2d] hover:text-[#e8f5e8]"
                }`}>
                <span>{LANG_META[l].flag}</span>
                <span>{LANG_META[l].nativeLabel}</span>
                {lang === l && <span className="ml-auto text-[#22c55e] text-xs">✓</span>}
              </button>
            ))}
          </div>
        </details>

        {/* On-chain activity row */}
        {address && (
          <a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3a1e] no-underline hover:bg-[#0d1a0d] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#0d2b16] flex items-center justify-center text-sm flex-shrink-0">🔍</div>
            <div className="flex-1">
              <p className="text-xs text-[#6b9e6b]">{t("on_chain_activity")}</p>
              <p className="text-[#e8f5e8] text-sm mt-0.5">{t("view_transactions")} ↗</p>
            </div>
          </a>
        )}

        {/* Leaderboard row */}
        <Link href="/leaderboard"
          className="flex items-center gap-3 px-4 py-3 border-b border-[#1e3a1e] no-underline hover:bg-[#0d1a0d] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-[#0d2b16] flex items-center justify-center text-sm flex-shrink-0">🏅</div>
          <div className="flex-1">
            <p className="text-[#e8f5e8] text-sm">{t("leaderboard")}</p>
          </div>
          <span className="text-[#6b9e6b] text-sm">›</span>
        </Link>

        {/* Sign out row */}
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1c0505] transition-colors text-left">
          <div className="w-8 h-8 rounded-lg bg-[#7f1d1d30] flex items-center justify-center text-sm flex-shrink-0">🚪</div>
          <span className="text-[#f87171] text-sm">{t("sign_out")}</span>
        </button>
      </div>
    </div>
  );
}
