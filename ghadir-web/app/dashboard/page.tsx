"use client";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";
import { SALAWAT_TOKEN, SALAWAT_ABI, EXPLORER } from "@/lib/contracts";
import { useEffect, useState } from "react";
import { getTelegramUser, getTelegramWebApp, isInTelegram } from "@/lib/telegram";

interface SalawatLog {
  id: string;
  count: number;
  tokens_earned: number;
  multiplier: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [logs, setLogs] = useState<SalawatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");

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
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Dashboard</h1>
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
          <div className="text-3xl font-bold text-[#22c55e]">{ghdr}</div>
          <div className="text-[#6b9e6b] text-sm mt-1">GHDR Balance</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-[#f59e0b]">{lifetimeCount}</div>
          <div className="text-[#6b9e6b] text-sm mt-1">Lifetime Salawat</div>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold text-[#e8f5e8]">{dailyPct}%</div>
          <div className="text-[#6b9e6b] text-sm mt-1">Daily Cap Used</div>
          <div className="mt-2 bg-[#1e3a1e] rounded-full h-2">
            <div
              className="bg-[#22c55e] h-2 rounded-full transition-all"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="card">
        <div className="text-[#6b9e6b] text-sm mb-1">Connected wallet</div>
        <div className="text-[#e8f5e8] font-mono text-sm break-all">{address}</div>
      </div>

      {/* History */}
      <div className="card">
        <h2 className="font-semibold text-[#e8f5e8] mb-4">Salawat History</h2>
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
    </div>
  );
}
