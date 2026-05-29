"use client";
import { useReadContract } from "wagmi";
import { SALAWAT_TOKEN, SALAWAT_ABI } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

const PROPOSALS = [
  { id: 1, title: "Allocate 30% hadiya to Karbala pilgrims", desc: "Support low-income families to perform Ziyarat Arbaeen — verified by The Zahra Trust. Funds released quarterly.", yes: 73, votes: 1240, daysLeft: 3 },
  { id: 2, title: "Add voice verification for Salawat", desc: "Require Arabic recitation detection for bonus token tiers — improves authenticity while keeping honour system for base logging.", yes: 51, votes: 890, daysLeft: 5 },
];

const ALLOCATION = [
  { label: "Water access",      pct: 35, color: "#52B788" },
  { label: "Ziyarat fund",      pct: 30, color: "#C9A84C" },
  { label: "Islamic education", pct: 35, color: "#2D6A4F" },
];

export default function ShuraPage() {
  const { address } = useAccount();
  const { data: balance } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const votes = balance ? Math.floor(Number(formatUnits(balance as bigint, 18))) : 0;

  return (
    <div style={{ background: "#F9F6EF", minHeight: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#0A3A22", padding: "20px 20px 24px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>Shura Council</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          Your votes: <strong style={{ color: "#E8D5A3" }}>{votes.toLocaleString()}</strong> · 1 GHDR = 1 vote
        </div>
      </div>

      {/* Info banner */}
      <div style={{ margin: "16px 16px 0", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 14, padding: 14, display: "flex", gap: 10 }}>
        <span style={{ fontSize: 18, color: "#1E40AF", flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontSize: 12, color: "#1E3A5F", lineHeight: 1.6, margin: 0 }}>
          Scholar council holds veto power over all proposals. All votes are permanent and public on-chain. Voting power is your GHDR balance — earned through Salawat, not wealth.
        </p>
      </div>

      {/* Coming soon notice */}
      <div style={{ margin: "12px 16px 0", background: "#FEF3C7", border: "0.5px solid #FDE68A", borderRadius: 14, padding: 14, textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>⚙️</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#92400E" }}>On-chain voting launching soon</div>
        <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>Below are example proposals. Live voting will require the Shura contract to be deployed.</div>
      </div>

      {/* Active proposals */}
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Active proposals</div>

      {PROPOSALS.map(p => (
        <div key={p.id} style={{ margin: "0 16px 10px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 6 }}>{p.title}</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, marginBottom: 12 }}>{p.desc}</div>
          <div style={{ height: 5, background: "#F3F4F6", borderRadius: 3, marginBottom: 5 }}>
            <div style={{ height: "100%", width: `${p.yes}%`, background: "#2D6A4F", borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginBottom: 12 }}>
            <span>{p.yes}% in favour · {p.votes.toLocaleString()} votes</span>
            <span>{p.daysLeft} days left</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ label: "✓ Yes", active: true }, { label: "✗ No", active: false }, { label: "— Abstain", active: false }].map(b => (
              <button key={b.label} style={{ flex: 1, borderRadius: 9, border: b.active ? "1px solid rgba(45,106,79,0.3)" : "0.5px solid rgba(0,0,0,0.08)", padding: "9px 4px", fontSize: 12, cursor: "pointer", background: b.active ? "#D8F3DC" : "#F9F6EF", color: b.active ? "#166534" : "#374151", transition: "all .15s" }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Treasury allocation */}
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>Treasury allocation</div>
      <div style={{ margin: "0 16px 16px", background: "#fff", border: "0.5px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Current · community voted</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {ALLOCATION.map(a => (
            <div key={a.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#1A1A1A" }}>{a.label}</span>
                <span style={{ fontWeight: 500, color: "#0A3A22" }}>{a.pct}%</span>
              </div>
              <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${a.pct}%`, background: a.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
