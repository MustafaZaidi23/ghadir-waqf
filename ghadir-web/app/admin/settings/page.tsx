"use client";
import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SALAWAT_TOKEN, HADIYA_REDEMPTION, SALAWAT_ABI } from "@/lib/contracts";
import { parseAbi } from "viem";
import { EXPLORER } from "@/lib/contracts";

const SETTINGS_ABI = parseAbi([
  "function multiplier() view returns (uint256)",
  "function dailyCap() view returns (uint256)",
  "function specialDay() view returns (bool)",
  "function setMultiplier(uint256 _multiplier) external",
  "function setSpecialDay(bool _enabled) external",
  "function setDailyCap(uint256 _cap) external",
  "function paused() view returns (bool)",
  "function pause() external",
  "function unpause() external",
]);

const WAQF_ABI = parseAbi([
  "function paused() view returns (bool)",
  "function pause() external",
  "function unpause() external",
]);

const WAQF_TREASURY = "0x274840e4467bb1926af6b8e8e986c069ef72c7df" as const;

export default function SettingsPage() {
  const [multiplierInput, setMultiplierInput] = useState("");
  const [capInput, setCapInput] = useState("");
  const [txMsg, setTxMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Read contract state
  const { data: multiplier, refetch: refetchMultiplier } = useReadContract({
    address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "multiplier",
  });
  const { data: dailyCap, refetch: refetchCap } = useReadContract({
    address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "dailyCap",
  });
  const { data: specialDay, refetch: refetchSpecialDay } = useReadContract({
    address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "specialDay",
  });
  const { data: salawatPaused, refetch: refetchSalawatPaused } = useReadContract({
    address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "paused",
  });
  const { data: waqfPaused, refetch: refetchWaqfPaused } = useReadContract({
    address: WAQF_TREASURY, abi: WAQF_ABI, functionName: "paused",
  });

  const { writeContractAsync } = useWriteContract();

  const refetchAll = () => {
    refetchMultiplier(); refetchCap(); refetchSpecialDay();
    refetchSalawatPaused(); refetchWaqfPaused();
  };

  const exec = async (label: string, fn: () => Promise<`0x${string}`>) => {
    setTxMsg(null);
    try {
      const hash = await fn();
      setTxMsg({ text: `${label} tx submitted: ${hash.slice(0, 10)}…`, ok: true });
      setTimeout(refetchAll, 5000);
    } catch (err: unknown) {
      setTxMsg({ text: err instanceof Error ? err.message : "Transaction failed", ok: false });
    }
  };

  const setMultiplier = () => {
    const v = Number(multiplierInput);
    if (!v || v < 1) return setTxMsg({ text: "Enter a valid multiplier (≥ 1)", ok: false });
    exec("Set multiplier", () =>
      writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "setMultiplier", args: [BigInt(v)] })
    );
  };

  const setDailyCap = () => {
    const v = Number(capInput);
    if (!v || v < 1) return setTxMsg({ text: "Enter a valid cap (≥ 1)", ok: false });
    exec("Set daily cap", () =>
      writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "setDailyCap", args: [BigInt(v)] })
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Contract Settings</h1>
        <p className="text-[#6b9e6b] text-sm mt-1">
          These actions write to the blockchain — admin wallet must be connected.
        </p>
      </div>

      {txMsg && (
        <div className={`px-4 py-2 rounded-lg text-sm font-mono break-all ${txMsg.ok ? "bg-[#0d2b16] text-[#22c55e]" : "bg-[#1c0505] text-[#f87171]"}`}>
          {txMsg.text}
        </div>
      )}

      {/* Live contract state */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">Live state</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Multiplier" value={multiplier != null ? `${multiplier}×` : "…"} color="#f59e0b" />
          <Stat label="Daily cap" value={dailyCap != null ? dailyCap.toLocaleString() : "…"} color="#22c55e" />
          <Stat label="Special day" value={specialDay == null ? "…" : specialDay ? "ON" : "OFF"} color={specialDay ? "#22c55e" : "#6b9e6b"} />
          <Stat label="Token paused" value={salawatPaused == null ? "…" : salawatPaused ? "PAUSED" : "Running"} color={salawatPaused ? "#f87171" : "#22c55e"} />
        </div>
      </div>

      {/* Set multiplier */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">GHDR multiplier</h2>
        <p className="text-[#6b9e6b] text-xs">
          Each logged Salawat earns <span className="text-[#e8f5e8]">{multiplier != null ? `${multiplier} × 10` : "multiplier × 10"}</span> GHDR.
          Raise during special days (e.g. Eid, Ghadir).
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[#6b9e6b] mb-1">New multiplier</label>
            <input type="number" min="1" max="100" className="input" placeholder="e.g. 3"
              value={multiplierInput} onChange={(e) => setMultiplierInput(e.target.value)} />
          </div>
          <button onClick={setMultiplier} className="btn-primary shrink-0">Set multiplier</button>
        </div>
      </div>

      {/* Special day toggle */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">Special day mode</h2>
        <p className="text-[#6b9e6b] text-xs">
          When enabled, signals to the UI that a special occasion is active.
          Current: <span style={{ color: specialDay ? "#22c55e" : "#6b9e6b" }}>{specialDay == null ? "loading…" : specialDay ? "ON" : "OFF"}</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => exec("Enable special day", () =>
              writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "setSpecialDay", args: [true] })
            )}
            className="btn-primary text-sm"
          >
            Enable
          </button>
          <button
            onClick={() => exec("Disable special day", () =>
              writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "setSpecialDay", args: [false] })
            )}
            className="text-sm px-4 py-2 rounded-lg bg-[#0a1a0a] border border-[#1e3a1e] text-[#6b9e6b] hover:text-[#e8f5e8] transition-colors"
          >
            Disable
          </button>
        </div>
      </div>

      {/* Daily cap */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">Daily Salawat cap</h2>
        <p className="text-[#6b9e6b] text-xs">
          Max GHDR tokens a single address can mint per day.
          Current: <span className="text-[#e8f5e8]">{dailyCap != null ? dailyCap.toLocaleString() : "…"}</span>
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[#6b9e6b] mb-1">New daily cap</label>
            <input type="number" min="1" className="input" placeholder="e.g. 1000"
              value={capInput} onChange={(e) => setCapInput(e.target.value)} />
          </div>
          <button onClick={setDailyCap} className="btn-primary shrink-0">Set cap</button>
        </div>
      </div>

      {/* Pause / unpause */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">Emergency pause</h2>
        <p className="text-[#6b9e6b] text-xs">
          Pausing stops all token minting and waqf withdrawals. Use in emergencies only.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs text-[#6b9e6b]">
              SalawatToken: <span style={{ color: salawatPaused ? "#f87171" : "#22c55e" }}>
                {salawatPaused == null ? "…" : salawatPaused ? "PAUSED" : "Running"}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => exec("Pause SalawatToken", () =>
                  writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "pause" })
                )}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1c0505] border border-[#f87171]/30 text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => exec("Unpause SalawatToken", () =>
                  writeContractAsync({ address: SALAWAT_TOKEN, abi: SETTINGS_ABI, functionName: "unpause" })
                )}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#0d2b16] border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              >
                Unpause
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-[#6b9e6b]">
              WaqfTreasury: <span style={{ color: waqfPaused ? "#f87171" : "#22c55e" }}>
                {waqfPaused == null ? "…" : waqfPaused ? "PAUSED" : "Running"}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => exec("Pause WaqfTreasury", () =>
                  writeContractAsync({ address: WAQF_TREASURY, abi: WAQF_ABI, functionName: "pause" })
                )}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#1c0505] border border-[#f87171]/30 text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => exec("Unpause WaqfTreasury", () =>
                  writeContractAsync({ address: WAQF_TREASURY, abi: WAQF_ABI, functionName: "unpause" })
                )}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#0d2b16] border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
              >
                Unpause
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contract addresses */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8] text-sm">Contract addresses</h2>
        <div className="space-y-2">
          {[
            { label: "SalawatToken (GHDR)", address: SALAWAT_TOKEN },
            { label: "WaqfTreasury",        address: WAQF_TREASURY },
            { label: "HadiyaRedemption",    address: HADIYA_REDEMPTION },
          ].map(({ label, address }) => (
            <div key={address} className="flex items-center justify-between gap-3">
              <span className="text-[#6b9e6b] text-xs shrink-0">{label}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#e8f5e8] font-mono text-xs truncate">{address}</span>
                <a
                  href={`${EXPLORER}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#22c55e] text-xs shrink-0 hover:underline"
                >
                  ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0a1a0a] border border-[#1e3a1e] rounded-lg px-3 py-2 text-center">
      <div className="font-bold text-sm" style={{ color }}>{value}</div>
      <div className="text-[#6b9e6b] text-xs mt-0.5">{label}</div>
    </div>
  );
}
