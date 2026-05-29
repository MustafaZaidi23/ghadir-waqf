"use client";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { SALAWAT_TOKEN, SALAWAT_ABI, EXPLORER } from "@/lib/contracts";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { getTelegramWebApp, getTelegramUser, isInTelegram } from "@/lib/telegram";
import { fetchPublicCampaigns, Campaign } from "./admin/actions";

type Burst = { id: number; x: number; y: number };
const DEBOUNCE_MS = 3000;

const S = {
  topbar:   { background: "#0A3A22", padding: "16px 20px 20px" },
  greeting: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  appName:  { fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.9)" },
  appSub:   { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 },
  avatar:   { width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#E8D5A3" },
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();

  const pendingRef = useRef(0);
  const [pending, setPending]       = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const [lastResult, setLastResult] = useState<{ tokens: number; tx: string; count: number } | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [bursts, setBursts]         = useState<Burst[]>([]);
  const [logs, setLogs]             = useState<{ id: string; tokens_earned: number; count: number; status: string; tx_hash: string | null; created_at: string }[]>([]);
  const [campaign, setCampaign]     = useState<Campaign | null>(null);

  const { data: balance,     refetch: refetchBalance } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "balanceOf",   args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: dailyMinted, refetch: refetchDaily   } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyMinted", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: dailyCap                             } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyCap",    query: { enabled: !!address } });
  const { data: multiplier                           } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "multiplier",  query: { enabled: !!address } });

  const reloadLogs = useCallback((addr: string) =>
    fetch(`/api/history/${addr}`).then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d.slice(0, 5) : [])), []);

  useEffect(() => { if (address) reloadLogs(address); }, [address, reloadLogs]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);
  useEffect(() => {
    fetchPublicCampaigns().then(list => setCampaign(list.find(c => c.status === "active") ?? null)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!isInTelegram() || !address) return;
    const twa = getTelegramWebApp();
    if (!twa?.initData) return;
    fetch("/api/link-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: twa.initData, wallet_address: address }) }).catch(() => {});
  }, [address]);

  const submitBatch = useCallback(async (count: number) => {
    if (!count || !address) return;
    setSubmitting(true); setCountdown(0); setError(null);
    try {
      const res  = await fetch("/api/salawat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet_address: address, count }) });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong");
      else { setLastResult({ tokens: data.tokens_earned, tx: data.tx_hash, count: data.count }); refetchBalance(); refetchDaily(); reloadLogs(address); }
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }, [address, refetchBalance, refetchDaily, reloadLogs]);

  const handleTap = (e: React.MouseEvent) => {
    if (submitting || cappedOut) return;
    pendingRef.current += 1; setPending(pendingRef.current);
    setLastResult(null); setError(null);
    const id = Date.now() + Math.random();
    setBursts(b => [...b, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 900);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCountdown(Math.ceil(DEBOUNCE_MS / 1000));
    debounceRef.current = setTimeout(() => { const c = pendingRef.current; pendingRef.current = 0; setPending(0); setCountdown(0); submitBatch(c); }, DEBOUNCE_MS);
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submitNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const c = pendingRef.current; pendingRef.current = 0; setPending(0); submitBatch(c);
  };

  const tgUser   = getTelegramUser();
  const ghdr     = balance ? Number(formatUnits(balance as bigint, 18)) : 0;
  const displayGhdr = ghdr + pending * 10;
  const dailyPct = dailyMinted && dailyCap ? Math.min(100, Math.round(Number(dailyMinted) / Number(dailyCap) * 100)) : 0;
  const cappedOut = dailyPct >= 100;
  const mult      = multiplier ? Number(multiplier) : 1;
  const displayName = tgUser?.first_name ?? (address ? `${address.slice(0,4)}…${address.slice(-4)}` : "Guest");
  const initials    = displayName.slice(0, 2).toUpperCase();

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, textAlign: "center", padding: "0 24px", background: "#F9F6EF" }}>
        <div style={{ fontSize: 52 }}>☽</div>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 500, color: "#0A3A22", marginBottom: 10 }}>Ghadir Waqf</h1>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
            Send Salawat. Earn GHDR. Donate as hadiya —{" "}
            <span style={{ color: "#1A1A1A", fontWeight: 500 }}>on-chain, permanent.</span>
          </p>
        </div>
        {tgUser && <p style={{ fontSize: 13, color: "#6B7280" }}>Marhaba, <strong style={{ color: "#0A3A22" }}>{tgUser.first_name}</strong></p>}
        <button onClick={login} className="btn-primary" style={{ padding: "14px 40px", fontSize: 15 }}>Get Started</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#F9F6EF", minHeight: "100dvh", paddingBottom: 80 }}>

      {/* Coin bursts */}
      {bursts.map(b => (
        <div key={b.id} style={{ position: "fixed", left: b.x - 20, top: b.y - 16, fontSize: 15, fontWeight: 600, color: "#2D6A4F", pointerEvents: "none", zIndex: 999, animation: "coinBurst 0.8s ease forwards", whiteSpace: "nowrap" }}>
          +{mult * 10} 🌿
        </div>
      ))}

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={S.greeting}>Assalamu Alaikum</div>
            <div style={S.appName}>{displayName}</div>
            <div style={S.appSub as React.CSSProperties}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#52B788", animation: "livePulse 2s infinite", display: "inline-block" }} />
              <span>Celo Sepolia · {mult > 1 ? `${mult}× active` : "live"}</span>
            </div>
          </div>
          <div style={S.avatar}>{initials}</div>
        </div>
      </div>

      {/* Special day / campaign banner */}
      {(mult > 1 || campaign) && (
        <Link href="/campaigns" style={{ textDecoration: "none", display: "block", margin: "12px 16px 0" }}>
          <div style={{ background: "linear-gradient(135deg,#0A3A22,#1A4A30)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26 }}>✨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{campaign?.name ?? "Special Day Active"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {campaign?.end_date ? `Ends ${campaign.end_date}` : "Bonus multiplier active"}
              </div>
            </div>
            {mult > 1 && <div style={{ background: "#C9A84C", color: "#0A3A22", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{mult}×</div>}
          </div>
        </Link>
      )}

      {/* Balance card */}
      <div style={{ margin: "12px 16px 0", background: "linear-gradient(140deg,#1A4A30,#2D6A4F)", borderRadius: 16, padding: "18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(201,168,76,0.1)", pointerEvents: "none" }} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Your GHDR Balance</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", fontWeight: 500, color: "#E8D5A3", lineHeight: 1, transition: "all .3s" }}>
          {displayGhdr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {pending > 0 && <span style={{ fontSize: "1rem", color: "#4ade80", marginLeft: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>+{pending * mult * 10} pending</span>}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, marginBottom: 14 }}>≈ ${(displayGhdr / 1000).toFixed(2)} hadiya value · 1,000 GHDR = $1</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Daily cap used</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>{dailyPct}%</div>
            <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${dailyPct}%`, background: cappedOut ? "#f87171" : "#52B788", borderRadius: 2, transition: "width .4s" }} />
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>This session</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80", marginTop: 3 }}>
              {pending > 0 ? `${pending} tapped` : lastResult ? `+${lastResult.tokens} GHDR` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Salawat tap button */}
      <div style={{ margin: "10px 16px 0" }}>
        <button onClick={handleTap} disabled={submitting || cappedOut} style={{
          width: "100%", background: cappedOut ? "#e5e7eb" : "#0A3A22",
          border: `1px solid ${pending > 0 ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.2)"}`,
          borderRadius: 14, padding: "22px 16px 16px", cursor: submitting || cappedOut ? "not-allowed" : "pointer",
          opacity: cappedOut ? 0.6 : 1, transition: "transform .1s, border-color .2s",
          animation: !submitting && !cappedOut && pending === 0 ? "salawatPulse 3s ease-in-out infinite" : "none",
          display: "block", textAlign: "center", userSelect: "none", WebkitUserSelect: "none",
        }}>
          <div style={{ fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: "clamp(15px,4.5vw,21px)", color: "#E8D5A3", lineHeight: 2, direction: "rtl", marginBottom: 6 }}>
            اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ
          </div>
          {submitting ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>⏳ Recording on-chain…</div>
          ) : pending > 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{pending}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Salawat · recording in {countdown}s</span>
            </div>
          ) : cappedOut ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Daily cap reached · Come back tomorrow</div>
          ) : (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Tap to log Salawat · +{mult * 10} GHDR each</div>
          )}
        </button>

        {pending > 0 && !submitting && (
          <button onClick={submitNow} style={{ width: "100%", marginTop: 8, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, padding: 10, fontSize: 13, color: "#C9A84C", cursor: "pointer" }}>
            Record {pending} Salawat now →
          </button>
        )}
      </div>

      {/* Feedback */}
      {lastResult && !pending && (
        <div style={{ margin: "8px 16px 0", background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#166534", fontSize: 13 }}>✅ {lastResult.count} Salawat · +{lastResult.tokens} GHDR</span>
          {lastResult.tx && <a href={`${EXPLORER}/tx/${lastResult.tx}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#16a34a", textDecoration: "underline" }}>Tx ↗</a>}
        </div>
      )}
      {error && (
        <div style={{ margin: "8px 16px 0", background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 10, padding: "12px 14px" }}>
          <span style={{ color: "#DC2626", fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 16px 0" }}>
        {[
          { href: "/redeem",    icon: "❤️", title: "Redeem Hadiya",  sub: "Donate GHDR to a cause" },
          { href: "/campaigns", icon: "🕌", title: "Join Majlis",    sub: "Events & drives"         },
          { href: "/shura",     icon: "⚖️", title: "Shura Council",  sub: "Vote on proposals"       },
          { href: "/leaderboard",icon:"🏅",  title: "Leaderboard",   sub: "Top Salawat earners"     },
        ].map(q => (
          <Link key={q.href} href={q.href} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "14px 12px", textDecoration: "none", display: "block", transition: "box-shadow .15s" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{q.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{q.title}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>{q.sub}</div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      {logs.length > 0 && (
        <div style={{ margin: "12px 16px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Recent activity</div>
          <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "0 14px" }}>
            {logs.map((log, i) => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < logs.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#D8F3DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {log.status === "confirmed" ? "⭐" : log.status === "failed" ? "❌" : "⏳"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#1A1A1A" }}>+{log.tokens_earned} GHDR</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {log.count > 1 && `${log.count}× · `}
                    {new Date(log.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: log.status === "confirmed" ? "#D8F3DC" : log.status === "failed" ? "#FEE2E2" : "#F3F4F6", color: log.status === "confirmed" ? "#166534" : log.status === "failed" ? "#991B1B" : "#6B7280" }}>
                    {log.status}
                  </span>
                  {log.tx_hash && <a href={`${EXPLORER}/tx/${log.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#16a34a", textDecoration: "none" }}>↗</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
