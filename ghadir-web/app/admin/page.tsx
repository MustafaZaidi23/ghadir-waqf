"use client";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState, useTransition } from "react";
import {
  fetchAllCharities,
  upsertCharity,
  toggleCharity,
  deleteCharity,
  CharityRow,
} from "./actions";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();

const BLANK: CharityRow = {
  name: "",
  description: "",
  cause_category: "Education",
  country: "",
  wallet_address: "",
  target_usd: null,
  verified: false,
  active: false,
};

const CATEGORIES = [
  "Education",
  "Healthcare",
  "Food & Water",
  "Emergency Relief",
  "Orphan Care",
  "Masjid",
  "Other",
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const [charities, setCharities] = useState<CharityRow[]>([]);
  const [form, setForm] = useState<CharityRow>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const isAdmin = isConnected && !!ADMIN && address?.toLowerCase() === ADMIN;

  const reload = () => {
    fetchAllCharities().then(setCharities).catch(console.error);
  };

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🔐</div>
        <h2 className="text-2xl font-bold text-[#e8f5e8]">Admin</h2>
        <p className="text-[#6b9e6b]">Sign in with the admin wallet to continue.</p>
        <button onClick={login} className="btn-primary px-6 py-2">
          Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="text-2xl font-bold text-[#f87171]">Not authorised</h2>
        <p className="text-[#6b9e6b] font-mono text-sm break-all">{address}</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertCharity(editing ? { ...form, id: editing } : form);
        setForm(BLANK);
        setEditing(null);
        setMsg({ text: editing ? "Updated." : "Charity added.", ok: true });
        reload();
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const startEdit = (c: CharityRow) => {
    setEditing(c.id!);
    setForm(c);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = (id: string, field: "verified" | "active", value: boolean) => {
    startTransition(async () => {
      try {
        await toggleCharity(id, field, value);
        reload();
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteCharity(id);
        reload();
        setMsg({ text: "Deleted.", ok: true });
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const set = (key: keyof CharityRow, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e8f5e8]">Admin — Charities</h1>

      {/* Form */}
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-semibold text-[#e8f5e8]">
          {editing ? "Edit charity" : "Add charity"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name *">
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </Field>
          <Field label="Country *">
            <input
              className="input"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              required
            />
          </Field>
          <Field label="Category">
            <select
              className="input"
              value={form.cause_category}
              onChange={(e) => set("cause_category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Target USD (optional)">
            <input
              type="number"
              min="0"
              className="input"
              value={form.target_usd ?? ""}
              onChange={(e) =>
                set("target_usd", e.target.value ? Number(e.target.value) : null)
              }
            />
          </Field>
          <Field label="Wallet address (receives USDC) *" className="sm:col-span-2">
            <input
              className="input font-mono"
              placeholder="0x…"
              value={form.wallet_address}
              onChange={(e) => set("wallet_address", e.target.value)}
              required
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              rows={3}
              className="input resize-none"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex gap-6">
          <Toggle
            label="Verified"
            value={!!form.verified}
            onChange={(v) => set("verified", v)}
          />
          <Toggle
            label="Active"
            value={!!form.active}
            onChange={(v) => set("active", v)}
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : editing ? "Update" : "Add charity"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(BLANK);
                setMsg(null);
              }}
              className="text-sm text-[#6b9e6b] hover:text-[#e8f5e8] transition-colors"
            >
              Cancel
            </button>
          )}
          {msg && (
            <span
              className={`text-sm ${msg.ok ? "text-[#22c55e]" : "text-[#f87171]"}`}
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>

      {/* List */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-[#e8f5e8]">
          All charities ({charities.length})
        </h2>
        {charities.length === 0 && (
          <p className="text-[#6b9e6b] text-sm">No charities yet. Add one above.</p>
        )}
        {charities.map((c) => (
          <div key={c.id} className="border border-[#1e3a1e] rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-[#e8f5e8] text-sm">{c.name}</div>
                <div className="text-[#6b9e6b] text-xs mt-0.5">
                  {c.cause_category} · {c.country}
                  {c.target_usd != null && ` · target $${c.target_usd.toLocaleString()}`}
                </div>
                <div className="text-[#6b9e6b] font-mono text-xs mt-0.5 truncate">
                  {c.wallet_address}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs text-[#22c55e] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id!, c.name)}
                  className="text-xs text-[#f87171] hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex gap-6 mt-2">
              <Toggle
                label="Verified"
                value={!!c.verified}
                onChange={(v) => handleToggle(c.id!, "verified", v)}
              />
              <Toggle
                label="Active"
                value={!!c.active}
                onChange={(v) => handleToggle(c.id!, "active", v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-[#6b9e6b] mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? "bg-[#22c55e]" : "bg-[#1e3a1e]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className={`text-xs ${value ? "text-[#22c55e]" : "text-[#6b9e6b]"}`}>
        {label}
      </span>
    </label>
  );
}
