"use client";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits, parseUnits } from "viem";
import { SALAWAT_TOKEN, SADAQAH_REDEMPTION, SALAWAT_ABI, REDEMPTION_ABI, EXPLORER } from "@/lib/contracts";
import { useState, useEffect } from "react";

const TOKENS_PER_DOLLAR = 1000n;

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
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selected, setSelected] = useState<Charity | null>(null);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "redeeming" | "done">("idle");

  const { data: balance } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: SALAWAT_TOKEN, abi: SALAWAT_ABI,
    functionName: "allowance",
    args: address ? [address, SADAQAH_REDEMPTION] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    fetch("/api/charities").then((r) => r.json()).then((d) => setCharities(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (txConfirmed) {
      if (step === "approving") {
        refetchAllowance();
        setStep("idle");
      } else if (step === "redeeming") {
        setStep("done");
      }
    }
  }, [txConfirmed, step, refetchAllowance]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">💚</div>
        <h2 className="text-2xl font-bold text-[#e8f5e8]">Connect your wallet</h2>
        <p className="text-[#6b9e6b]">Connect to redeem GHDR as sadaqah.</p>
        <ConnectButton />
      </div>
    );
  }

  const ghdr = balance ? Number(formatUnits(balance as bigint, 18)).toFixed(2) : "0";
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
      args: [SADAQAH_REDEMPTION, amountBN],
    });
  };

  const handleRedeem = () => {
    if (!selected || !amountBN) return;
    setStep("redeeming");
    writeContract({
      address: SADAQAH_REDEMPTION, abi: REDEMPTION_ABI,
      functionName: "redeemSadaqah",
      args: [amountBN, selected.wallet_address as `0x${string}`],
    });
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-[#22c55e]">Sadaqah accepted!</h2>
        <p className="text-[#6b9e6b]">
          {amount} GHDR burned → ${usdValue} USDC donated to {selected?.name}.
        </p>
        {txHash && (
          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="text-[#16a34a] hover:underline text-sm">
            View transaction ↗
          </a>
        )}
        <button className="btn-primary" onClick={() => { setStep("idle"); setAmount(""); setSelected(null); }}>
          Redeem again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e8f5e8]">Redeem Sadaqah</h1>

      <div className="card flex justify-between items-center">
        <span className="text-[#6b9e6b] text-sm">Your balance</span>
        <span className="text-[#22c55e] font-bold text-lg">{ghdr} GHDR</span>
      </div>

      {/* Step 1: pick charity */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">1. Choose a charity</h2>
        {charities.length === 0 ? (
          <p className="text-[#6b9e6b] text-sm">Loading charities…</p>
        ) : (
          <div className="space-y-2">
            {charities.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === c.id
                    ? "border-[#22c55e] bg-[#0d2b16]"
                    : "border-[#1e3a1e] hover:border-[#22c55e] bg-[#0a0f0a]"
                }`}
              >
                <div className="font-medium text-[#e8f5e8] text-sm">{c.name}</div>
                <div className="text-[#6b9e6b] text-xs mt-0.5">
                  {c.cause_category} · {c.country}
                  {c.target_usd && ` · $${Number(c.funded_usd).toFixed(0)} / $${Number(c.target_usd).toFixed(0)}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: amount */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">2. Enter amount</h2>
        <p className="text-[#6b9e6b] text-xs">Must be a multiple of 1,000 GHDR · Rate: 1,000 GHDR = $1 USDC</p>
        <input
          type="number"
          min="1000"
          step="1000"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-[#0a0f0a] border border-[#1e3a1e] rounded-lg px-4 py-2 text-[#e8f5e8] text-sm focus:outline-none focus:border-[#22c55e]"
        />
        {amount && !isMultiple && (
          <p className="text-[#f87171] text-xs">Amount must be a multiple of 1,000</p>
        )}
        {amount && isMultiple && (
          <p className="text-[#6b9e6b] text-xs">≈ ${usdValue} USDC will be donated</p>
        )}
      </div>

      {/* Step 3: approve + redeem */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">3. Confirm</h2>
        {!selected && <p className="text-[#6b9e6b] text-sm">Select a charity above first.</p>}
        {selected && !canProceed && amount && (
          <p className="text-[#f87171] text-sm">
            {!isMultiple ? "Amount must be a multiple of 1,000." : "Insufficient balance."}
          </p>
        )}
        {selected && canProceed && (
          <div className="space-y-3">
            <div className="text-sm text-[#6b9e6b] space-y-1">
              <div>Charity: <span className="text-[#e8f5e8]">{selected.name}</span></div>
              <div>Burning: <span className="text-[#f87171]">{amount} GHDR</span></div>
              <div>Donating: <span className="text-[#22c55e]">${usdValue} USDC</span></div>
            </div>
            {needsApproval ? (
              <button
                className="btn-primary w-full"
                onClick={handleApprove}
                disabled={isPending || step === "approving"}
              >
                {step === "approving" && !txConfirmed ? "Approving…" : "Step 1: Approve GHDR"}
              </button>
            ) : (
              <button
                className="btn-gold w-full"
                onClick={handleRedeem}
                disabled={isPending || step === "redeeming"}
              >
                {step === "redeeming" && !txConfirmed ? "Redeeming…" : "Confirm Sadaqah"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
