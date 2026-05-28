"use client";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { SALAWAT_TOKEN, SALAWAT_ABI, EXPLORER } from "@/lib/contracts";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { getTelegramWebApp, getTelegramUser } from "@/lib/telegram";

interface RecentLog {
  id: string;
  tokens_earned: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
}

type Burst = { id: number; x: number; y: number };

export default function Home() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [tapping, setTapping] = useState(false);
  const [lastResult, setLastResult] = useState<{ tokens: number; tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tgUser = getTelegramUser();

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: dailyMinted, refetch: refetchDaily } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "dailyMinted",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: dailyCap } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "dailyCap",
    query: { enabled: !!address },
  });

  const reloadLogs = (addr: string) =>
    fetch(`/api/history/${addr}`)
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d.slice(0, 5) : []));

  useEffect(() => {
    if (address) reloadLogs(address);
  }, [address]);

  const handleSalawat = async (e: React.MouseEvent) => {
    if (tapping) return;
    setTapping(true);
    setError(null);
    setLastResult(null);

    // Coin burst at tap position
    const id = Date.now();
    setBursts((b) => [...b, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);

    try {
      const twa = getTelegramWebApp();
      const body =
        twa?.initData && twa.initData.length > 0
          ? { init_data: twa.initData }
          : { wallet_address: address };

      const res = await fetch("/api/salawat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setLastResult({ tokens: data.tokens_earned, tx: data.tx_hash });
        refetchBalance();
        refetchDaily();
        if (address) reloadLogs(address);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setTapping(false);
    }
  };

  const ghdr = balance ? Number(formatUnits(balance as bigint, 18)) : 0;
  const dailyPct =
    dailyMinted && dailyCap
      ? Math.min(100, Math.round((Number(dailyMinted) / Number(dailyCap)) * 100))
      : 0;
  const cappedOut = dailyPct >= 100;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-4">
        <div className="text-6xl">☽</div>
        <div>
          <h1 className="text-3xl font-bold text-[#22c55e] mb-3">Ghadir Waqf</h1>
          <p className="text-[#6b9e6b] max-w-sm mx-auto leading-relaxed">
            Send Salawat. Earn GHDR. Donate as sadaqah —{" "}
            <span className="text-[#e8f5e8]">on-chain, permanent.</span>
          </p>
        </div>
        {tgUser && (
          <p className="text-sm text-[#6b9e6b]">
            Marhaba, <span className="text-[#e8f5e8]">{tgUser.first_name}</span> — sign in to link your wallet
          </p>
        )}
        <button onClick={login} className="btn-primary px-10 py-3 text-base">
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-6">

      {/* Coin burst particles */}
      {bursts.map((b) => (
        <div
          key={b.id}
          style={{
            position: "fixed",
            left: b.x - 20,
            top: b.y - 16,
            fontSize: 15,
            fontWeight: 600,
            color: "#4ade80",
            pointerEvents: "none",
            zIndex: 999,
            animation: "coinBurst 0.8s ease forwards",
            whiteSpace: "nowrap",
          }}
        >
          +10 🌿
        </div>
      ))}

      {/* Balance card */}
      <div
        style={{
          background: "linear-gradient(135deg, #0A3A22 0%, #1A4A30 60%, #2D6A4F 100%)",
          borderRadius: 18,
          padding: "22px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "rgba(201,168,76,0.07)",
            pointerEvents: "none",
          }}
        />
        {tgUser && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
            ✈️ {tgUser.first_name}{tgUser.username ? ` · @${tgUser.username}` : ""}
          </div>
        )}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
          Your GHDR balance
        </div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "3rem", fontWeight: 500, color: "#E8D5A3", lineHeight: 1 }}>
          {ghdr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5, marginBottom: 18 }}>
          ≈ ${(ghdr / 1000).toFixed(2)} sadaqah value · 1,000 GHDR = $1 USDC
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Daily cap used</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
              {dailyPct}%
            </div>
            <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${dailyPct}%`, background: cappedOut ? "#f87171" : "#52B788", borderRadius: 2, transition: "width .4s" }} />
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Lifetime Salawat</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
              {ghdr > 0 ? Math.round(ghdr / 10).toLocaleString() : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* Salawat tap button */}
      <button
        ref={btnRef}
        onClick={handleSalawat}
        disabled={tapping || cappedOut}
        style={{
          width: "100%",
          background: cappedOut ? "#0d1a0d" : "linear-gradient(160deg, #0A3A22, #1A4A30)",
          border: `1px solid ${cappedOut ? "#1e3a1e" : "rgba(201,168,76,0.25)"}`,
          borderRadius: 16,
          padding: "24px 16px 18px",
          cursor: tapping ? "wait" : cappedOut ? "not-allowed" : "pointer",
          opacity: cappedOut ? 0.5 : 1,
          transition: "transform .15s, opacity .15s",
          transform: tapping ? "scale(0.98)" : "scale(1)",
          animation: !tapping && !cappedOut ? "salawatPulse 3s ease-in-out infinite" : "none",
          display: "block",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Noto Nastaliq Urdu', 'Scheherazade New', serif",
            fontSize: "clamp(16px, 5vw, 22px)",
            color: "#E8D5A3",
            lineHeight: 2,
            direction: "rtl",
            marginBottom: 8,
          }}
        >
          اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {tapping
            ? "⏳ Recording on-chain…"
            : cappedOut
            ? "Daily cap reached · Come back tomorrow"
            : "Tap to log Salawat · +10 GHDR per tap"}
        </div>
      </button>

      {/* Feedback */}
      {lastResult && (
        <div style={{ background: "#0d2b16", border: "1px solid #14532d", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#4ade80", fontSize: 13 }}>
            ✅ Salawat accepted &nbsp;·&nbsp; +{lastResult.tokens} GHDR
          </span>
          {lastResult.tx && (
            <a
              href={`${EXPLORER}/tx/${lastResult.tx}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#22c55e", textDecoration: "underline", marginLeft: 8 }}
            >
              Tx ↗
            </a>
          )}
        </div>
      )}
      {error && (
        <div style={{ background: "#1c0505", border: "1px solid #450a0a", borderRadius: 10, padding: "12px 14px" }}>
          <span style={{ color: "#f87171", fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { href: "/redeem",      icon: "❤️", title: "Redeem Sadaqah",  sub: "Donate GHDR to charities" },
          { href: "/leaderboard", icon: "🏅", title: "Leaderboard",     sub: "Top Salawat earners"       },
          { href: "/dashboard",   icon: "📊", title: "Dashboard",       sub: "Balance, history & stats"  },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            style={{
              background: "#111a11",
              border: "0.5px solid #1e3a1e",
              borderRadius: 14,
              padding: "16px 14px",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{q.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#e8f5e8" }}>{q.title}</div>
            <div style={{ fontSize: 10, color: "#6b9e6b", marginTop: 3 }}>{q.sub}</div>
          </Link>
        ))}
        <a
          href="https://t.me/GhadirWaqfBot"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#0d1e14",
            border: "0.5px solid rgba(201,168,76,0.2)",
            borderRadius: 14,
            padding: "16px 14px",
            textDecoration: "none",
            display: "block",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>✈️</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#E8D5A3" }}>Telegram Bot</div>
          <div style={{ fontSize: 10, color: "#6b9e6b", marginTop: 3 }}>Log via bot too</div>
        </a>
      </div>

      {/* Recent activity */}
      {logs.length > 0 && (
        <div className="card">
          <div style={{ padding: "0 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6b9e6b", textTransform: "uppercase", letterSpacing: ".07em", padding: "14px 0 8px" }}>
              Recent activity
            </div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: i < logs.length - 1 ? "0.5px solid #1e3a1e" : "none",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0d2b16", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {log.status === "confirmed" ? "⭐" : log.status === "failed" ? "❌" : "⏳"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#e8f5e8" }}>+{log.tokens_earned} GHDR</div>
                  <div style={{ fontSize: 11, color: "#6b9e6b", marginTop: 2 }}>
                    {new Date(log.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 100,
                    background: log.status === "confirmed" ? "#14532d" : log.status === "failed" ? "#450a0a" : "#1e3a1e",
                    color: log.status === "confirmed" ? "#22c55e" : log.status === "failed" ? "#f87171" : "#6b9e6b",
                  }}>
                    {log.status}
                  </span>
                  {log.tx_hash && (
                    <a href={`${EXPLORER}/tx/${log.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "#22c55e", textDecoration: "none" }}>
                      ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
