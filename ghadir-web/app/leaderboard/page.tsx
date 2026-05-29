"use client";
import { useEffect, useState } from "react";

interface LeaderEntry {
  username: string | null;
  first_name: string | null;
  wallet_address: string | null;
  total_salawat: number;
  total_tokens: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const displayName = (e: LeaderEntry) =>
    e.username
      ? `@${e.username}`
      : e.first_name
      ? e.first_name
      : e.wallet_address
      ? `${e.wallet_address.slice(0, 6)}…${e.wallet_address.slice(-4)}`
      : "Anonymous";

  const shortWallet = (w: string | null) =>
    w ? `${w.slice(0, 6)}…${w.slice(-4)}` : "—";

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Leaderboard</h1>
        <p className="text-[#6b9e6b] text-sm mt-1">Top Salawat senders in the Ghadir community</p>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-[#6b9e6b]">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <div className="text-4xl">🕌</div>
          <p className="text-[#6b9e6b]">No entries yet. Be the first to send Salawat!</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e3a1e]">
                <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium">User</th>
                <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium">Salawat</th>
                <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium hidden sm:table-cell">
                  GHDR Earned
                </th>
                <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium hidden md:table-cell">
                  Wallet
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={i}
                  className="border-b border-[#1e3a1e] last:border-0 hover:bg-[#0d1a0d] transition-colors"
                >
                  <td className="px-4 py-3 text-center">
                    {i < 3 ? medals[i] : <span className="text-[#6b9e6b]">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3 text-[#e8f5e8] font-medium">{displayName(e)}</td>
                  <td className="px-4 py-3 text-right text-[#f59e0b] font-bold">
                    {Number(e.total_salawat).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[#22c55e] hidden sm:table-cell">
                    {Number(e.total_tokens).toLocaleString()} GHDR
                  </td>
                  <td className="px-4 py-3 text-right text-[#6b9e6b] font-mono text-xs hidden md:table-cell">
                    {shortWallet(e.wallet_address)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
