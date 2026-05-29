"use client";
import { useEffect, useState, useTransition } from "react";
import { fetchFundingSources, upsertFundingSource, deleteFundingSource, FundingSource } from "../actions";

const SOURCE_TYPES = [
  { value: "donation",  label: "Direct Donation" },
  { value: "sponsor",   label: "Corporate Sponsor" },
  { value: "mosque",    label: "Mosque / Imam Bargah" },
  { value: "grant",     label: "Grant" },
  { value: "diaspora",  label: "Diaspora Program" },
  { value: "campaign",  label: "Campaign" },
  { value: "other",     label: "Other" },
];

const STATUSES = [
  { value: "pledged",   label: "Pledged",   color: "#f59e0b" },
  { value: "received",  label: "Received",  color: "#22c55e" },
  { value: "pending",   label: "Pending",   color: "#38bdf8" },
  { value: "declined",  label: "Declined",  color: "#f87171" },
];

const BLANK: FundingSource = {
  source_name: "", source_type: "donation", contributor_name: "",
  contributor_contact: "", amount_usd: 0, status: "pledged", date: "", notes: "",
};

export default function FundingPage() {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [form, setForm] = useState<FundingSource>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pending, startTransition] = useTransition();

  const reload = () => fetchFundingSources().then(setSources).catch(console.error);
  useEffect(() => { reload(); }, []);

  const set = (key: keyof FundingSource, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertFundingSource(editing ? { ...form, id: editing } : form);
        setForm(BLANK); setEditing(null); setShowForm(false);
        setMsg({ text: editing ? "Updated." : "Source added.", ok: true });
        reload();
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const filtered = sources.filter((s) =>
    (filterType === "all" || s.source_type === filterType) &&
    (filterStatus === "all" || s.status === filterStatus)
  );

  const totalReceived = sources.filter((s) => s.status === "received").reduce((sum, s) => sum + Number(s.amount_usd), 0);
  const totalPledged  = sources.filter((s) => s.status === "pledged").reduce((sum, s) => sum + Number(s.amount_usd), 0);

  const statusInfo = (status: string) => STATUSES.find((s) => s.value === status) ?? { label: status, color: "#6b9e6b" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Funding Sources</h1>
        <button className="btn-primary text-sm" onClick={() => { setShowForm(true); setEditing(null); setForm(BLANK); setMsg(null); }}>
          + Log funding
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center py-4">
          <div className="text-xl font-bold text-[#22c55e]">${totalReceived.toLocaleString()}</div>
          <div className="text-[#6b9e6b] text-xs mt-1">Total Received</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-xl font-bold text-[#f59e0b]">${totalPledged.toLocaleString()}</div>
          <div className="text-[#6b9e6b] text-xs mt-1">Total Pledged</div>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.ok ? "bg-[#0d2b16] text-[#22c55e]" : "bg-[#1c0505] text-[#f87171]"}`}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      {(showForm || editing) && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-semibold text-[#e8f5e8]">{editing ? "Edit entry" : "Log funding source"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Source name *">
              <input className="input" value={form.source_name} onChange={(e) => set("source_name", e.target.value)} required />
            </Field>
            <Field label="Type">
              <select className="input" value={form.source_type} onChange={(e) => set("source_type", e.target.value)}>
                {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Contributor name">
              <input className="input" value={form.contributor_name ?? ""} onChange={(e) => set("contributor_name", e.target.value)} />
            </Field>
            <Field label="Contributor contact (email / Telegram)">
              <input className="input" value={form.contributor_contact ?? ""} onChange={(e) => set("contributor_contact", e.target.value)} />
            </Field>
            <Field label="Amount (USD) *">
              <input type="number" min="0" step="0.01" className="input" value={form.amount_usd}
                onChange={(e) => set("amount_usd", Number(e.target.value))} required />
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" className="input" value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Notes">
              <input className="input" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : editing ? "Update" : "Save"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(BLANK); setMsg(null); }}
              className="text-sm text-[#6b9e6b] hover:text-[#e8f5e8]">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input text-xs py-1.5 w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input text-xs py-1.5 w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e3a1e]">
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium">Source</th>
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium hidden sm:table-cell">Type</th>
              <th className="text-right px-4 py-3 text-[#6b9e6b] font-medium">Amount</th>
              <th className="text-center px-4 py-3 text-[#6b9e6b] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium hidden md:table-cell">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6b9e6b] text-sm">No entries yet.</td></tr>
            )}
            {filtered.map((s) => {
              const st = statusInfo(s.status);
              return (
                <tr key={s.id} className="border-b border-[#1e3a1e] last:border-0 hover:bg-[#0a1a0a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[#e8f5e8] font-medium">{s.source_name}</div>
                    {s.contributor_name && <div className="text-[#6b9e6b] text-xs mt-0.5">{s.contributor_name}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-[#6b9e6b]">{SOURCE_TYPES.find((t) => t.value === s.source_type)?.label ?? s.source_type}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#e8f5e8]">${Number(s.amount_usd).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ color: st.color, borderColor: st.color + "40", backgroundColor: st.color + "10" }}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6b9e6b] text-xs hidden md:table-cell">{s.date ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setEditing(s.id!); setForm(s); setShowForm(false); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-xs text-[#22c55e] hover:underline">Edit</button>
                      <button onClick={() => { if (!confirm(`Delete "${s.source_name}"?`)) return; startTransition(async () => { await deleteFundingSource(s.id!); reload(); }); }}
                        className="text-xs text-[#f87171] hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-[#6b9e6b] mb-1">{label}</label>
      {children}
    </div>
  );
}
