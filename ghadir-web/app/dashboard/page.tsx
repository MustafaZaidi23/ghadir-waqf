"use client";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { SALAWAT_TOKEN, SALAWAT_ABI, EXPLORER } from "@/lib/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTelegramUser, getTelegramWebApp, isInTelegram } from "@/lib/telegram";

interface SalawatLog { id: string; count: number; tokens_earned: number; multiplier: number; status: string; tx_hash: string | null; created_at: string; }

const RANKS = [
  { min: 0,     label: "Mubtadi",  icon: "🌱" },
  { min: 100,   label: "Salik",    icon: "🌿" },
  { min: 500,   label: "Mukhlis",  icon: "⭐" },
  { min: 2000,  label: "Arif",     icon: "🌙" },
  { min: 10000, label: "Wali",     icon: "☽"  },
];

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { login, logout } = usePrivy();
  const [logs, setLogs]         = useState<SalawatLog[]>([]);
  const [loading, setLoading]   = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle"|"linking"|"linked"|"error">("idle");

  const tgUser   = getTelegramUser();
  const inTg     = isInTelegram();

  const { data: balance  } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "balanceOf",       args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: lifetime } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "lifetimeSalawat", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: dailyMinted } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyMinted",  args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: dailyCap    } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyCap",     query: { enabled: !!address } });

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/history/${address}`).then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    if (!inTg || !address || linkStatus !== "idle") return;
    const twa = getTelegramWebApp();
    if (!twa?.initData) return;
    setLinkStatus("linking");
    fetch("/api/link-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: twa.initData, wallet_address: address }) })
      .then(r => setLinkStatus(r.ok ? "linked" : "error")).catch(() => setLinkStatus("error"));
  }, [address, inTg, linkStatus]);

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 48 }}>🔗</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 500, color: "#0A3A22" }}>
          {tgUser ? `Marhaba, ${tgUser.first_name}` : "Your Profile"}
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Sign in to view your stats, history, and NFTs.</p>
        <button onClick={login} className="btn-primary">Sign In</button>
      </div>
    );
  }

  const ghdr         = balance  ? Number(formatUnits(balance as bigint, 18)) : 0;
  const lifetimeNum  = lifetime ? Number(lifetime) : 0;
  const dailyPct     = dailyMinted && dailyCap ? Math.min(100, Math.round(Number(dailyMinted) / Number(dailyCap) * 100)) : 0;
  const rank         = [...RANKS].reverse().find(r => lifetimeNum >= r.min) ?? RANKS[0];
  const displayName  = tgUser?.first_name ?? (address ? `${address.slice(0,6)}…${address.slice(-4)}` : "");
  const initials     = displayName.slice(0, 2).toUpperCase();

  // Simple weekly streak from logs
  const today = new Date(); today.setHours(0,0,0,0);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d.toDateString(); });
  const activeDays = new Set(logs.map(l => new Date(l.created_at).toDateString()));
  const weekActive = weekDays.map(d => activeDays.has(d));
  const weekCount = weekActive.filter(Boolean).length;

  return (
    <div style={{ background: "#F9F6EF", minHeight: "100dvh", paddingBottom: 80 }}>
      {/* Profile header */}
      <div style={{ background: "#0A3A22", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#E8D5A3", margin: "0 auto 10px" }}>
          {initials}
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: "rgba(255,255,255,0.9)", fontFamily: "'Cormorant Garamond',serif" }}>{displayName}</div>
        {tgUser?.username && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>@{tgUser.username}</div>}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.15)", border: "0.5px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "5px 14px", marginTop: 10, fontSize: 13, color: "#E8D5A3" }}>
          {rank.icon} {rank.label}
        </div>
        {linkStatus === "linked" && (
          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(82,183,136,0.8)" }}>✓ Telegram linked</div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "16px 16px 0" }}>
        {[
          { val: lifetimeNum.toLocaleString(), label: "Salawat" },
          { val: `${ghdr.toFixed(0)}`,         label: "GHDR"    },
          { val: `${dailyPct}%`,               label: "Daily"   },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 500, color: "#0A3A22" }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly streak */}
      <div style={{ margin: "12px 16px 0", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>This week</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 500, color: "#0A3A22" }}>{weekCount} / 7</div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {weekActive.map((on, i) => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: on ? (i === 6 ? "#C9A84C" : "#2D6A4F") : "#F3F4F6", transition: "background .3s" }} />
          ))}
        </div>
      </div>

      {/* NFT certificates */}
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>NFT Certificates</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 16px" }}>
        {[
          { icon: "💧", name: "Hadiya Pioneer",  sub: "1,000 GHDR donated",    locked: ghdr < 1000 },
          { icon: "⭐", name: "Salawat Mukhlis",  sub: "500+ lifetime Salawat", locked: lifetimeNum < 500 },
          { icon: "☽",  name: "Ghadeer Day",      sub: "18 Dhul Hijjah",        locked: true },
          { icon: "🔥", name: "7-Day Streak",     sub: "Log 7 days in a row",   locked: weekCount < 7 },
        ].map(n => (
          <div key={n.name} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 12, textAlign: "center", opacity: n.locked ? 0.45 : 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: n.locked ? "#F3F4F6" : "#0A3A22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 8px", color: n.locked ? "#9CA3AF" : "#E8D5A3" }}>
              {n.icon}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#1A1A1A" }}>{n.name}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{n.sub}</div>
          </div>
        ))}
      </div>

      {/* History */}
      {logs.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Salawat history</div>
          <div style={{ margin: "0 16px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "0 14px" }}>
            {logs.slice(0, 10).map((log, i) => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < Math.min(9, logs.length - 1) ? "0.5px solid rgba(0,0,0,0.05)" : "none" }}>
                <div>
                  <span style={{ fontSize: 13, color: "#1A1A1A", fontWeight: 500 }}>+{log.tokens_earned} GHDR</span>
                  {log.multiplier > 1 && <span style={{ marginLeft: 6, fontSize: 11, color: "#C9A84C" }}>{log.multiplier}×</span>}
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {new Date(log.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: log.status === "confirmed" ? "#D8F3DC" : "#FEE2E2", color: log.status === "confirmed" ? "#166534" : "#991B1B" }}>
                    {log.status}
                  </span>
                  {log.tx_hash && <a href={`${EXPLORER}/tx/${log.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#16a34a" }}>↗</a>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Settings */}
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Settings</div>
      <div style={{ margin: "0 16px 16px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, overflow: "hidden" }}>
        {[
          { icon: "🏅", title: "Leaderboard",        sub: "See top Salawat earners",    href: "/leaderboard" },
          { icon: "💼", title: "Connected wallet",    sub: address ? `${address.slice(0,6)}…${address.slice(-4)} · Celo` : "—" },
          { icon: "🔍", title: "On-chain activity",   sub: "View all transactions", href: address ? `${EXPLORER}/address/${address}` : undefined, external: true },
        ].map((row, i, arr) => {
          const Inner = (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none", cursor: row.href ? "pointer" : "default", background: "transparent" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#D8F3DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{row.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#1A1A1A" }}>{row.title}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{row.sub}</div>
              </div>
              {row.href && <span style={{ fontSize: 14, color: "#9CA3AF" }}>›</span>}
            </div>
          );
          if (!row.href) return <div key={row.title}>{Inner}</div>;
          if (row.external) return <a key={row.title} href={row.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{Inner}</a>;
          return <Link key={row.title} href={row.href} style={{ textDecoration: "none", display: "block" }}>{Inner}</Link>;
        })}
        <button onClick={logout} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", borderTop: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left" as const }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚪</div>
          <div style={{ fontSize: 13, color: "#EF4444" }}>Sign out</div>
        </button>
      </div>
    </div>
  );
}
