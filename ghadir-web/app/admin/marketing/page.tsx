"use client";
import { useEffect, useState, useTransition } from "react";
import { fetchCampaigns, upsertCampaign, deleteCampaign, Campaign } from "../actions";

const CAMPAIGN_TYPES = [
  { value: "awareness",   label: "Awareness" },
  { value: "fundraising", label: "Fundraising" },
  { value: "salawat",     label: "Salawat Drive" },
  { value: "special_day", label: "Special Day" },
  { value: "ramadan",     label: "Ramadan" },
  { value: "other",       label: "Other" },
];

const PLATFORMS = [
  { value: "telegram",   label: "Telegram" },
  { value: "instagram",  label: "Instagram" },
  { value: "twitter",    label: "Twitter / X" },
  { value: "whatsapp",   label: "WhatsApp" },
  { value: "email",      label: "Email" },
  { value: "website",    label: "Website" },
  { value: "multiple",   label: "Multiple" },
];

const STATUSES = [
  { value: "draft",      label: "Draft",     color: "#94a3b8" },
  { value: "active",     label: "Active",    color: "#22c55e" },
  { value: "paused",     label: "Paused",    color: "#f59e0b" },
  { value: "completed",  label: "Completed", color: "#38bdf8" },
  { value: "cancelled",  label: "Cancelled", color: "#f87171" },
];

const BLANK: Campaign = {
  name: "", type: "awareness", status: "draft",
  start_date: "", end_date: "", target_usd: null, platform: "telegram",
  description: "", notes: "",
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<Campaign>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [pending, startTransition] = useTransition();

  const reload = () => fetchCampaigns().then(setCampaigns).catch(console.error);
  useEffect(() => { reload(); }, []);

  const set = (key: keyof Campaign, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertCampaign(editing ? { ...form, id: editing } : form);
        setForm(BLANK); setEditing(null); setShowForm(false);
        setMsg({ text: editing ? "Updated." : "Campaign created.", ok: true });
        reload();
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const filtered = campaigns.filter((c) =>
    (filterStatus === "all" || c.status === filterStatus) &&
    (filterType   === "all" || c.type   === filterType)
  );

  const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? { label: s, color: "#6b9e6b" };

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalRaised = campaigns.reduce((sum, c) => sum + Number(c.raised_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Marketing & Campaigns</h1>
        <button className="btn-primary text-sm" onClick={() => { setShowForm(true); setEditing(null); setForm(BLANK); setMsg(null); }}>
          + New campaign
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center py-4">
          <div className="text-xl font-bold text-[#22c55e]">{activeCampaigns}</div>
          <div className="text-[#6b9e6b] text-xs mt-1">Active Campaigns</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-xl font-bold text-[#f59e0b]">${totalRaised.toLocaleString()}</div>
          <div className="text-[#6b9e6b] text-xs mt-1">Total Raised</div>
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
          <h2 className="font-semibold text-[#e8f5e8]">{editing ? "Edit campaign" : "Create campaign"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Campaign name *" className="sm:col-span-2">
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                {CAMPAIGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select className="input" value={form.platform ?? ""} onChange={(e) => set("platform", e.target.value)}>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Target USD (optional)">
              <input type="number" min="0" className="input" value={form.target_usd ?? ""}
                onChange={(e) => set("target_usd", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Start date">
              <input type="date" className="input" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="date" className="input" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea rows={2} className="input resize-none" value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <input className="input" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : editing ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(BLANK); setMsg(null); }}
              className="text-sm text-[#6b9e6b] hover:text-[#e8f5e8]">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input text-xs py-1.5 w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input text-xs py-1.5 w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          {CAMPAIGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-8 text-[#6b9e6b] text-sm">No campaigns yet.</div>
        )}
        {filtered.map((c) => {
          const st = statusInfo(c.status);
          const typeLabel = CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label ?? c.type;
          const platform  = PLATFORMS.find((p) => p.value === c.platform)?.label ?? c.platform;
          const progress  = c.target_usd && c.raised_usd != null
            ? Math.min(100, Math.round((Number(c.raised_usd) / c.target_usd) * 100))
            : null;
          return (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#e8f5e8] font-medium">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ color: st.color, borderColor: st.color + "40", backgroundColor: st.color + "10" }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-[#6b9e6b] text-xs mt-1">
                    {typeLabel}
                    {platform && ` · ${platform}`}
                    {c.start_date && ` · ${c.start_date}`}
                    {c.end_date && ` → ${c.end_date}`}
                  </div>
                  {c.description && <p className="text-[#6b9e6b] text-xs mt-1 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => { setEditing(c.id!); setForm(c); setShowForm(false); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-xs text-[#22c55e] hover:underline">Edit</button>
                  <button onClick={() => { if (!confirm(`Delete "${c.name}"?`)) return; startTransition(async () => { await deleteCampaign(c.id!); reload(); }); }}
                    className="text-xs text-[#f87171] hover:underline">Delete</button>
                </div>
              </div>

              {/* Progress bar */}
              {c.target_usd != null && progress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#6b9e6b]">
                    <span>${Number(c.raised_usd ?? 0).toLocaleString()} raised</span>
                    <span>Target: ${Number(c.target_usd).toLocaleString()} ({progress}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#1e3a1e] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
