"use client";
import { createContext, useContext } from "react";

export type AdminRole =
  | "super_admin"
  | "trustee"
  | "scholar"
  | "marketing"
  | "finance"
  | "moderator"
  | "developer"
  | null;

export const ROLE_ACCESS: Record<string, string[]> = {
  super_admin: ["/admin", "/admin/charities", "/admin/team", "/admin/funding", "/admin/marketing", "/admin/settings"],
  trustee:     ["/admin", "/admin/charities", "/admin/funding"],
  finance:     ["/admin", "/admin/funding"],
  marketing:   ["/admin", "/admin/marketing"],
  developer:   ["/admin", "/admin/settings"],
  scholar:     ["/admin"],
  moderator:   ["/admin"],
};

export const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#f59e0b" },
  trustee:     { label: "Trustee",     color: "#22c55e" },
  scholar:     { label: "Scholar",     color: "#a78bfa" },
  marketing:   { label: "Marketing",   color: "#38bdf8" },
  finance:     { label: "Finance",     color: "#34d399" },
  moderator:   { label: "Moderator",   color: "#fb923c" },
  developer:   { label: "Developer",   color: "#94a3b8" },
};

export const AdminRoleContext = createContext<AdminRole>(null);
export const useAdminRole = () => useContext(AdminRoleContext);

export function canAccess(role: AdminRole, path: string): boolean {
  if (!role) return false;
  return (ROLE_ACCESS[role] ?? []).includes(path);
}
