"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useLanguage } from "@/lib/i18n";

interface LeaderEntry {
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  wallet_address: string | null;
  total_salawat: number;
  total_tokens: number;
}

export default function Leaderboard() {
  const { address } = useAccount();
  const { t } = useLanguage();
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
      : e.display_name
      ? e.display_name
      : e.first_name
      ? e.first_name
      : e.wallet_address
      ? `${e.wallet_address.slice(0, 6)}…${e.wallet_address.slice(-4)}`
      : "Anonymous";

  const shortWallet = (w: string | null) =>
    w ? `${w.slice(0, 6)}…${w.slice(-4)}` : "—";

  // Short wallet to show *beneath* the name — only when the name isn't already
  // the wallet itself (i.e. the entry has a username or first name).
  const subWallet = (e: LeaderEntry) =>
    (e.username || e.display_name || e.first_name) && e.wallet_address ? shortWallet(e.wallet_address) : "";

  const isMe = (e: LeaderEntry) =>
    !!address && !!e.wallet_address && e.wallet_address.toLowerCase() === address.toLowerCase();

  const myIndex = entries.findIndex(isMe);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const medals = ["🥇", "🥈", "🥉"];
  // podium visual order: 2nd, 1st, 3rd (1st elevated in the middle)
  const podiumOrder = [1, 0, 2];

  return (
    <div className="space-y-7">
      <div>
        <h1 style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }} className="text-2xl font-bold text-[#D4AF37]">{t("leaderboard")}</h1>
        <p className="text-[#6b9e6b] text-sm mt-1">{t("leaderboard_subtitle")}</p>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-[#6b9e6b]">{t("loading")}</div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <div aria-hidden="true" className="text-4xl">🕌</div>
          <p className="text-[#6b9e6b]">{t("no_entries")}</p>
        </div>
      ) : (
        <>
          {/* Your rank callout */}
          {myIndex >= 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "linear-gradient(90deg, rgba(212,175,55,0.12), rgba(47,136,79,0.08))",
              border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, padding: "12px 16px",
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, color: "#D4AF37", minWidth: 36 }}>
                {myIndex < 3 ? medals[myIndex] : `#${myIndex + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e8" }}>{t("your_rank")}</div>
                <div style={{ fontSize: 11, color: "#6b9e6b", marginTop: 1 }}>
                  {displayName(entries[myIndex])}
                  {subWallet(entries[myIndex]) && (
                    <span style={{ fontFamily: "monospace", marginLeft: 6, opacity: 0.75 }}>· {subWallet(entries[myIndex])}</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37" }}>{Number(entries[myIndex].total_salawat).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#6b9e6b" }}>{t("lifetime_salawat")}</div>
              </div>
            </div>
          )}

          {/* Podium — top 3 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
            {podiumOrder.map((rank) => {
              const e = top3[rank];
              if (!e) return <div key={rank} />;
              const first = rank === 0;
              const mine = isMe(e);
              return (
                <div key={rank} style={{
                  background: first ? "linear-gradient(160deg, #14503A, #0d2b1e)" : "var(--green-mid)",
                  border: `1px solid ${mine ? "#D4AF37" : first ? "rgba(212,175,55,0.4)" : "var(--green-border)"}`,
                  borderRadius: 14, padding: first ? "16px 8px 18px" : "12px 8px 14px",
                  textAlign: "center", marginTop: first ? 0 : 14,
                  boxShadow: first ? "0 6px 24px rgba(212,175,55,0.12)" : "none",
                }}>
                  <div style={{ fontSize: first ? 30 : 24, lineHeight: 1, marginBottom: 6 }}>{medals[rank]}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e8f5e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>
                    {displayName(e)}
                  </div>
                  {subWallet(e) && <div style={{ fontSize: 9, color: "#6b9e6b", fontFamily: "monospace", marginTop: 1 }}>{subWallet(e)}</div>}
                  {mine && <div style={{ fontSize: 9, color: "#D4AF37", fontWeight: 700, letterSpacing: "0.05em", marginTop: 2 }}>{t("you_badge")}</div>}
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: first ? 20 : 16, fontWeight: 700, color: "#D4AF37", marginTop: 6 }}>
                    {Number(e.total_salawat).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: "#6b9e6b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("lifetime_salawat")}</div>
                </div>
              );
            })}
          </div>

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e3a1e]">
                    <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium w-12">#</th>
                    <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium">{t("user_col")}</th>
                    <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium">{t("lifetime_salawat")}</th>
                    <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium hidden sm:table-cell">{t("ghdr_earned")}</th>
                    <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium hidden md:table-cell">{t("wallet_col")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e, i) => {
                    const rank = i + 4;
                    const mine = isMe(e);
                    return (
                      <tr
                        key={rank}
                        style={mine ? { background: "rgba(212,175,55,0.08)", boxShadow: "inset 3px 0 0 #D4AF37" } : undefined}
                        className="border-b border-[#1e3a1e] last:border-0 hover:bg-[#0d1a0d] transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-[#6b9e6b]">{rank}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: mine ? "#D4AF37" : "#e8f5e8" }}>
                          {displayName(e)}
                          {mine && <span style={{ fontSize: 9, color: "#D4AF37", fontWeight: 700, marginLeft: 6, letterSpacing: "0.05em" }}>{t("you_badge")}</span>}
                          {subWallet(e) && <div className="md:hidden text-[#6b9e6b] font-mono text-[10px] mt-0.5">{subWallet(e)}</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-[#D4AF37] font-bold">{Number(e.total_salawat).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[#52B788] hidden sm:table-cell">{Number(e.total_tokens).toLocaleString()} GHDR</td>
                        <td className="px-4 py-3 text-right text-[#6b9e6b] font-mono text-xs hidden md:table-cell">{shortWallet(e.wallet_address)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
