"use client";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits, parseUnits } from "viem";
import { SALAWAT_TOKEN, HADIYA_REDEMPTION, SALAWAT_ABI, REDEMPTION_ABI, EXPLORER } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { fetchPublicCampaigns, Campaign } from "../admin/actions";
import { useLanguage } from "@/lib/i18n";

const TOKENS_PER_DOLLAR = 1000n;
const PRESETS = [1000, 5000, 10000, 25000];

interface Charity {
  id: string;
  name: string;
  description: string;
  cause_category: string;
  country: string;
  wallet_address: string;
  funded_usd: number;
  target_usd: number | null;
}

export default function Redeem() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const { t } = useLanguage();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selected, setSelected] = useState<Charity | null>(null);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "redeeming" | "done">("idle");
  const [linkedCampaign, setLinkedCampaign] = useState<Campaign | null>(null);

  const { data: balance } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "allowance",
    args: address ? [address, HADIYA_REDEMPTION] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    fetch("/api/charities").then((r) => r.json()).then((d) => setCharities(Array.isArray(d) ? d : []));
  }, []);

  // Check if wallet has joined a fundraising campaign with a linked charity
  useEffect(() => {
    if (!address) return;
    Promise.all([
      fetch(`/api/join-campaign?wallet=${address}`).then(r => r.json()),
      fetchPublicCampaigns().catch(() => [] as Campaign[]),
    ]).then(([joinData, campaigns]) => {
      const ids: string[] = joinData.joined ?? [];
      const fc = campaigns.find(c =>
        c.type === "fundraising" && c.status === "active" && c.charity_id && ids.includes(c.id!)
      ) ?? null;
      setLinkedCampaign(fc);
    }).catch(() => {});
  }, [address]);

  // Pre-select linked charity when charities load
  useEffect(() => {
    if (!linkedCampaign?.charity_id || charities.length === 0 || selected) return;
    const match = charities.find(c => c.id === linkedCampaign.charity_id);
    if (match) setSelected(match);
  }, [linkedCampaign, charities, selected]);

  useEffect(() => {
    if (txConfirmed) {
      if (step === "approving") {
        refetchAllowance();
        setStep("idle");
      } else if (step === "redeeming") {
        // Update campaign raised_usd
        if (selected) {
          fetch("/api/campaign-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ charity_id: selected.id, amount_usd: Number(amount) / Number(TOKENS_PER_DOLLAR) }),
          }).catch(() => {});
        }
        setStep("done");
      }
    }
  }, [txConfirmed, step, refetchAllowance, selected, amount]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div aria-hidden="true" className="text-5xl">💚</div>
        <h2 className="text-2xl font-bold text-[#e8f5e8]">{t("signin_redeem")}</h2>
        <p className="text-[#6b9e6b]">{t("signin_sub")}</p>
        <button onClick={login} className="btn-primary px-6 py-2">{t("sign_in")}</button>
      </div>
    );
  }

  const ghdrNum = balance ? Number(formatUnits(balance as bigint, 18)) : 0;
  const ghdr = Math.floor(ghdrNum);
  const maxAmount = Math.floor(ghdrNum / 1000) * 1000;
  const amountBN = amount ? parseUnits(amount, 18) : 0n;
  const usdValue = amount ? (Number(amount) / Number(TOKENS_PER_DOLLAR)).toFixed(2) : "0.00";
  const needsApproval = amountBN > 0n && (allowance as bigint ?? 0n) < amountBN;
  const isMultiple = Number(amount) > 0 && Number(amount) % 1000 === 0;
  const hasEnough = balance && amountBN > 0n && amountBN <= (balance as bigint);
  const canProceed = isMultiple && hasEnough;

  const handleApprove = () => {
    if (!amountBN) return;
    setStep("approving");
    writeContract({
      address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
      functionName: "approve",
      args: [HADIYA_REDEMPTION, amountBN],
    });
  };

  const handleRedeem = () => {
    if (!selected || !amountBN) return;
    setStep("redeeming");
    writeContract({
      address: HADIYA_REDEMPTION, abi: REDEMPTION_ABI,
      functionName: "redeemHadiya",
      args: [amountBN, selected.wallet_address as `0x${string}`],
    });
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div aria-hidden="true" className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-[#22c55e]">{t("hadiya_accepted")}</h2>
        <p className="text-[#6b9e6b]">
          {t("burning")}: <span className="text-[#f87171]">{Number(amount).toLocaleString()} GHDR</span>
          {" · "}{t("donating")}: <span className="text-[#52B788]">${usdValue} USDC</span> → {selected?.name}
        </p>
        {txHash && (
          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="text-[#16a34a] hover:underline text-sm">
            {t("view_transaction")}
          </a>
        )}
        <button className="btn-primary" onClick={() => { setStep("idle"); setAmount(""); setSelected(null); }}>
          {t("give_again")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }} className="text-2xl font-bold text-[#D4AF37]">{t("redeem_hadiya")}</h1>

      <div className="card flex justify-between items-center">
        <span className="text-[#6b9e6b] text-sm">{t("your_balance")}</span>
        <span style={{ fontFamily: "'Cinzel', serif" }} className="text-[#D4AF37] font-bold text-lg">{ghdr.toLocaleString()} GHDR</span>
      </div>

      {/* Campaign banner */}
      {linkedCampaign && (
        <div style={{ background: "linear-gradient(90deg,#0a2016,#0f3b1f)", border: "1px solid #2F884F50", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 20, flexShrink: 0 }}>💰</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8f5e8" }}>{linkedCampaign.name}</div>
            <div style={{ fontSize: 11, color: "#52B788", marginTop: 2 }}>
              {t("participating_preselect")}
              {linkedCampaign.target_usd && ` · $${Number(linkedCampaign.raised_usd ?? 0).toLocaleString()} / $${Number(linkedCampaign.target_usd).toLocaleString()} ${t("raised")}`}
            </div>
          </div>
          <span style={{ fontSize: 18, color: "#52B788" }}>✓</span>
        </div>
      )}

      {/* Step 1: pick charity */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">1. {t("choose_charity")}</h2>
        {charities.length === 0 ? (
          <p className="text-[#6b9e6b] text-sm">{t("loading_charities")}</p>
        ) : (
          <div className="space-y-2">
            {charities.map((c) => {
              const pct = c.target_usd && Number(c.target_usd) > 0
                ? Math.min(100, Math.round((Number(c.funded_usd) / Number(c.target_usd)) * 100))
                : null;
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  aria-pressed={active}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    active
                      ? "border-[#D4AF37] bg-[#0d2b16]"
                      : "border-[#1e3a1e] hover:border-[#2F884F] bg-[#0a0f0a]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-[#e8f5e8] text-sm">{c.name}</div>
                    {active && <span style={{ color: "#D4AF37", fontSize: 13 }}>✓</span>}
                  </div>
                  <div className="text-[#6b9e6b] text-xs mt-0.5">{c.cause_category} · {c.country}</div>
                  {pct !== null && (
                    <div className="mt-2">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b9e6b", marginBottom: 3 }}>
                        <span style={{ color: "#52B788", fontWeight: 600 }}>${Number(c.funded_usd).toLocaleString()}</span>
                        <span>{t("of")} ${Number(c.target_usd).toLocaleString()} · {pct}%</span>
                      </div>
                      <div style={{ height: 4, background: "#1e3a1e", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2F884F,#52B788)", borderRadius: 2 }} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: amount */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">2. {t("select_amount")}</h2>
        <p className="text-[#6b9e6b] text-xs">{t("amount_help")}</p>

        {maxAmount < 1000 ? (
          <p className="text-[#f87171] text-sm">{t("need_min")}</p>
        ) : (
          <>
            {/* Preset chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESETS.filter((p) => p <= maxAmount).map((p) => {
                const on = Number(amount) === p;
                return (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    aria-pressed={on}
                    style={{
                      flex: "1 1 0", minWidth: 70, padding: "10px 6px", borderRadius: 10,
                      border: `1px solid ${on ? "#D4AF37" : "#1e3a1e"}`,
                      background: on ? "rgba(212,175,55,0.12)" : "#0a0f0a",
                      color: on ? "#D4AF37" : "#e8f5e8", fontWeight: 600, fontSize: 13, cursor: "pointer",
                      transition: "all .12s",
                    }}
                  >
                    {p.toLocaleString()}
                    <div style={{ fontSize: 9, color: on ? "#D4AF37" : "#6b9e6b", fontWeight: 400, marginTop: 1 }}>
                      ${(p / 1000).toLocaleString()}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setAmount(String(maxAmount))}
                aria-pressed={Number(amount) === maxAmount}
                style={{
                  flex: "1 1 0", minWidth: 70, padding: "10px 6px", borderRadius: 10,
                  border: `1px solid ${Number(amount) === maxAmount ? "#D4AF37" : "#1e3a1e"}`,
                  background: Number(amount) === maxAmount ? "rgba(212,175,55,0.12)" : "#0a0f0a",
                  color: Number(amount) === maxAmount ? "#D4AF37" : "#e8f5e8", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "all .12s",
                }}
              >
                {t("max_label")}
                <div style={{ fontSize: 9, color: "#6b9e6b", fontWeight: 400, marginTop: 1 }}>
                  ${(maxAmount / 1000).toLocaleString()}
                </div>
              </button>
            </div>

            {/* Custom amount */}
            <div>
              <label htmlFor="ghdr-amount" className="text-[#6b9e6b] text-xs block mb-1.5">{t("custom_amount")}</label>
              <input
                id="ghdr-amount"
                type="number"
                inputMode="numeric"
                min="1000"
                step="1000"
                placeholder={t("eg_amount")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#0a0f0a] border border-[#1e3a1e] rounded-lg px-4 py-2.5 text-[#e8f5e8] text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Live USD readout */}
            {amount && isMultiple && hasEnough && (
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 14px", background: "rgba(47,136,79,0.08)", border: "1px solid rgba(47,136,79,0.25)", borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: "#6b9e6b" }}>{t("youll_donate")}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700, color: "#52B788" }}>${usdValue} <span style={{ fontSize: 12, color: "#6b9e6b", fontWeight: 400 }}>USDC</span></span>
              </div>
            )}
            {amount && !isMultiple && (
              <p className="text-[#f87171] text-xs">{t("must_multiple")}</p>
            )}
            {amount && isMultiple && !hasEnough && (
              <p className="text-[#f87171] text-xs">{t("over_balance")} ({ghdr.toLocaleString()} GHDR).</p>
            )}
          </>
        )}
      </div>

      {/* Step 3: confirm */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">3. {t("confirm_step")}</h2>
        {!selected && <p className="text-[#6b9e6b] text-sm">{t("select_charity_first")}</p>}
        {selected && !amount && <p className="text-[#6b9e6b] text-sm">{t("choose_amount_first")}</p>}
        {selected && canProceed && (
          <div className="space-y-3">
            <div className="text-sm text-[#6b9e6b] space-y-1">
              <div>{t("charity_label")}: <span className="text-[#e8f5e8]">{selected.name}</span></div>
              <div>{t("burning")}: <span className="text-[#f87171]">{Number(amount).toLocaleString()} GHDR</span></div>
              <div>{t("donating")}: <span className="text-[#52B788]">${usdValue} USDC</span></div>
            </div>

            {needsApproval && (
              <p className="text-[#6b9e6b] text-xs" style={{ background: "#0d1a0d", border: "1px solid #1e3a1e", borderRadius: 8, padding: "8px 12px" }}>
                <span aria-hidden="true">ℹ️ </span>{t("two_tx_explainer")}
              </p>
            )}

            {needsApproval ? (
              <button
                className="btn-primary w-full"
                onClick={handleApprove}
                disabled={isPending || step === "approving"}
              >
                {step === "approving" && !txConfirmed ? t("approving") : t("approve_step")}
              </button>
            ) : (
              <button
                className="btn-gold w-full"
                onClick={handleRedeem}
                disabled={isPending || step === "redeeming"}
              >
                {step === "redeeming" && !txConfirmed ? t("sending_hadiya") : t("confirm_hadiya")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
