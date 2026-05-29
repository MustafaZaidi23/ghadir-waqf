"use client";
import { useEffect, useState, useTransition } from "react";
import { fetchTeamMembers, upsertTeamMember, toggleTeamMember, deleteTeamMember, TeamMember } from "../actions";

const ROLES = [
  { value: "super_admin",       label: "Super Admin",       color: "#f59e0b" },
  { value: "trustee",           label: "Trustee",           color: "#22c55e" },
  { value: "scholar",           label: "Scholar",           color: "#a78bfa" },
  { value: "marketing",         label: "Marketing Manager", color: "#38bdf8" },
  { value: "finance",           label: "Finance Manager",   color: "#34d399" },
  { value: "moderator",         label: "Moderator",         color: "#fb923c" },
  { value: "developer",         label: "Developer",         color: "#94a3b8" },
];

const BLANK: TeamMember = { name: "", role: "moderator", email: "", telegram_username: "", wallet_address: "", notes: "", active: true };

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<TeamMember>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const reload = () => fetchTeamMembers().then(setMembers).catch(console.error);
  useEffect(() => { reload(); }, []);

  const set = (key: keyof TeamMember, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertTeamMember(editing ? { ...form, id: editing } : form);
        setForm(BLANK); setEditing(null); setShowForm(false);
        setMsg({ text: editing ? "Updated." : "Member added.", ok: true });
        reload();
      } catch (err: unknown) {
        setMsg({ text: err instanceof Error ? err.message : "Error", ok: false });
      }
    });
  };

  const roleInfo = (role: string) => ROLES.find((r) => r.value === role) ?? { label: role, color: "#6b9e6b" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e8f5e8]">Team & Roles</h1>
        <button className="btn-primary text-sm" onClick={() => { setShowForm(true); setEditing(null); setForm(BLANK); setMsg(null); }}>
          + Add member
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.ok ? "bg-[#0d2b16] text-[#22c55e]" : "bg-[#1c0505] text-[#f87171]"}`}>
          {msg.text}
        </div>
      )}

      {/* Role legend */}
      <div className="card space-y-2">
        <p className="text-xs text-[#6b9e6b] uppercase tracking-wider font-semibold">Roles</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <span key={r.value} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
              style={{ color: r.color, borderColor: r.color + "40", backgroundColor: r.color + "10" }}>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* Add / edit form */}
      {(showForm || editing) && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-semibold text-[#e8f5e8]">{editing ? "Edit member" : "Add team member"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name *">
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Role *">
              <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Email">
              <input type="email" className="input" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Telegram username">
              <input className="input" placeholder="@username" value={form.telegram_username ?? ""}
                onChange={(e) => set("telegram_username", e.target.value)} />
            </Field>
            <Field label="Wallet address" className="sm:col-span-2">
              <input className="input font-mono" placeholder="0x…" value={form.wallet_address ?? ""}
                onChange={(e) => set("wallet_address", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea rows={2} className="input resize-none" value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : editing ? "Update" : "Add member"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(BLANK); setMsg(null); }}
              className="text-sm text-[#6b9e6b] hover:text-[#e8f5e8]">Cancel</button>
          </div>
        </form>
      )}

      {/* Members table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e3a1e]">
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium">Name</th>
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium">Role</th>
              <th className="text-left px-4 py-3 text-[#6b9e6b] font-medium hidden sm:table-cell">Contact</th>
              <th className="text-center px-4 py-3 text-[#6b9e6b] font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6b9e6b] text-sm">No team members yet.</td></tr>
            )}
            {members.map((m) => {
              const role = roleInfo(m.role);
              return (
                <tr key={m.id} className="border-b border-[#1e3a1e] last:border-0 hover:bg-[#0a1a0a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[#e8f5e8] font-medium">{m.name}</div>
                    {m.wallet_address && (
                      <div className="text-[#6b9e6b] font-mono text-xs mt-0.5">
                        {m.wallet_address.slice(0, 6)}…{m.wallet_address.slice(-4)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ color: role.color, borderColor: role.color + "40", backgroundColor: role.color + "10" }}>
                      {role.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="text-[#6b9e6b] text-xs space-y-0.5">
                      {m.email && <div>{m.email}</div>}
                      {m.telegram_username && <div>{m.telegram_username}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => startTransition(async () => { await toggleTeamMember(m.id!, !m.active); reload(); })}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        m.active
                          ? "text-[#22c55e] border-[#14532d] bg-[#0d2b16] hover:bg-[#14532d]"
                          : "text-[#6b9e6b] border-[#1e3a1e] hover:text-[#e8f5e8]"
                      }`}
                    >
                      {m.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setEditing(m.id!); setForm(m); setShowForm(false); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-xs text-[#22c55e] hover:underline">Edit</button>
                      <button onClick={() => { if (!confirm(`Remove ${m.name}?`)) return; startTransition(async () => { await deleteTeamMember(m.id!); reload(); }); }}
                        className="text-xs text-[#f87171] hover:underline">Remove</button>
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
