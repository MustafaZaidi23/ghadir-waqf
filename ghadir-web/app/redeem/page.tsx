"use client";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits, parseUnits } from "viem";
import { SALAWAT_TOKEN, HADIYA_REDEMPTION, SALAWAT_ABI, REDEMPTION_ABI, EXPLORER } from "@/lib/contracts";
import { useState, useEffect } from "react";

const AMOUNTS = [
  { coins: 1000,  usd: 1 },
  { coins: 5000,  usd: 5 },
  { coins: 10000, usd: 10 },
];

const CATEGORY_ICONS: Record<string, string> = {
  "Education": "📚", "Healthcare": "🏥", "Food & Water": "💧",
  "Emergency Relief": "🆘", "Orphan Care": "🤲", "Masjid": "🕌", "Other": "❤️",
};

interface Charity {
  id: string; name: string; description: string;
  cause_category: string; country: string; wallet_address: string;
  funded_usd: number; target_usd: number | null;
}

export default function Redeem() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [charities, setCharities]   = useState<Charity[]>([]);
  const [selected, setSelected]     = useState<Charity | null>(null);
  const [amountCoins, setAmountCoins] = useState(5000);
  const [step, setStep]             = useState<"idle" | "approving" | "redeeming" | "done">("idle");

  const { data: balance } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "allowance", args: address ? [address, HADIYA_REDEMPTION] : undefined, query: { enabled: !!address } });
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { fetch("/api/charities").then(r => r.json()).then(d => setCharities(Array.isArray(d) ? d : [])); }, []);
  useEffect(() => {
    if (txConfirmed) {
      if (step === "approving") { refetchAllowance(); setStep("idle"); }
      else if (step === "redeeming") setStep("done");
    }
  }, [txConfirmed, step, refetchAllowance]);

  const ghdr       = balance ? Number(formatUnits(balance as bigint, 18)) : 0;
  const amountBN   = parseUnits(String(amountCoins), 18);
  const usdValue   = (amountCoins / 1000).toFixed(2);
  const hasEnough  = balance && amountBN <= (balance as bigint);
  const needsApproval = hasEnough && (allowance as bigint ?? 0n) < amountBN;

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 48 }}>💚</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 500, color: "#0A3A22" }}>Sign in to give Hadiya</h2>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Use email, Google, or your Celo wallet.</p>
        <button onClick={login} className="btn-primary">Sign In</button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 52 }}>✅</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 500, color: "#0A3A22" }}>Hadiya accepted!</h2>
        <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          {amountCoins.toLocaleString()} GHDR burned → ${usdValue} USDC donated to {selected?.name}.
        </p>
        {txHash && <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#16a34a", textDecoration: "underline" }}>View on-chain ↗</a>}
        <button className="btn-primary" onClick={() => { setStep("idle"); setSelected(null); setAmountCoins(5000); }}>Give again</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#F9F6EF", minHeight: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#0A3A22", padding: "20px 20px 24px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>Hadiya</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          Balance: <strong style={{ color: "#E8D5A3" }}>{ghdr.toLocaleString(undefined, { maximumFractionDigits: 0 })} GHDR</strong>
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", padding: "16px 16px 8px" }}>
        Choose a cause · {charities.length} available
      </div>

      {charities.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#9CA3AF", fontSize: 14 }}>Loading causes…</div>
      )}

      {charities.map(c => {
        const icon    = CATEGORY_ICONS[c.cause_category] ?? "❤️";
        const progress = c.target_usd && c.target_usd > 0
          ? Math.min(100, Math.round(c.funded_usd / c.target_usd * 100)) : null;
        const isSelected = selected?.id === c.id;
        return (
          <div key={c.id} onClick={() => setSelected(isSelected ? null : c)}
            style={{ margin: "0 16px 10px", background: "#fff", borderRadius: 14, border: `${isSelected ? "1.5px solid #2D6A4F" : "0.5px solid rgba(0,0,0,0.07)"}`, overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s", boxShadow: isSelected ? "0 0 0 3px rgba(45,106,79,0.1)" : "none" }}>
            <div style={{ height: 60, background: isSelected ? "#D8F3DC" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              {icon}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#2D6A4F", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>{c.cause_category}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                {c.country}
                <span style={{ background: "#D8F3DC", color: "#166534", borderRadius: 100, padding: "1px 7px", fontSize: 10 }}>✓ Verified</span>
              </div>
              {progress !== null && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>
                    <span>{progress}% funded</span>
                    <span>${c.funded_usd?.toFixed(0)} / ${c.target_usd?.toFixed(0)}</span>
                  </div>
                  <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "#2D6A4F", borderRadius: 2 }} />
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>1,000 GHDR = <strong style={{ color: "#0A3A22" }}>$1 donated</strong></div>
                {isSelected && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#2D6A4F", background: "#D8F3DC", borderRadius: 8, padding: "4px 10px" }}>Selected ✓</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Redemption panel — shows when charity selected */}
      {selected && (
        <div style={{ margin: "0 16px 16px", background: "#fff", borderRadius: 14, border: "0.5px solid rgba(0,0,0,0.07)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", marginBottom: 12 }}>Select amount</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {AMOUNTS.map(a => (
              <button key={a.coins} onClick={() => setAmountCoins(a.coins)} style={{ border: amountCoins === a.coins ? "1.5px solid #2D6A4F" : "0.5px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: "pointer", background: amountCoins === a.coins ? "#D8F3DC" : "#fff", transition: "all .15s" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{a.coins.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>= ${a.usd}</div>
              </button>
            ))}
          </div>
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
            Your balance: <strong style={{ color: "#0A3A22" }}>{ghdr.toLocaleString(undefined, { maximumFractionDigits: 0 })} GHDR</strong><br />
            After redemption: <strong style={{ color: "#0A3A22" }}>{Math.max(0, ghdr - amountCoins).toLocaleString(undefined, { maximumFractionDigits: 0 })} GHDR</strong><br />
            <span style={{ color: "#EF4444" }}>Tokens burned permanently on confirmation.</span>
          </div>
          {!hasEnough ? (
            <div style={{ fontSize: 13, color: "#EF4444", textAlign: "center", padding: "8px 0" }}>Insufficient GHDR balance</div>
          ) : needsApproval ? (
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setStep("approving"); writeContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "approve", args: [HADIYA_REDEMPTION, amountBN] }); }} disabled={isPending || step === "approving"}>
              {step === "approving" ? "Approving…" : "Step 1: Approve GHDR"}
            </button>
          ) : (
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setStep("redeeming"); writeContract({ address: HADIYA_REDEMPTION, abi: REDEMPTION_ABI, functionName: "redeemHadiya", args: [amountBN, selected.wallet_address as `0x${string}`] }); }} disabled={isPending || step === "redeeming"}>
              {step === "redeeming" ? "Confirming…" : `Confirm — burn & donate $${(amountCoins / 1000).toFixed(0)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
