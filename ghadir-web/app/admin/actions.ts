"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Charities ────────────────────────────────────────────────────────────────

export type CharityRow = {
  id?: string;
  name: string;
  description: string;
  cause_category: string;
  country: string;
  wallet_address: string;
  funded_usd?: number;
  target_usd?: number | null;
  verified?: boolean;
  active?: boolean;
};

export async function fetchAllCharities(): Promise<CharityRow[]> {
  const { data, error } = await supabase.from("charities").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertCharity(charity: CharityRow) {
  const { id, ...rest } = charity;
  const { error } = id
    ? await supabase.from("charities").update(rest).eq("id", id)
    : await supabase.from("charities").insert(rest);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/charities");
  revalidatePath("/redeem");
}

export async function toggleCharity(id: string, field: "verified" | "active", value: boolean) {
  const { error } = await supabase.from("charities").update({ [field]: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/charities");
  revalidatePath("/redeem");
}

export async function deleteCharity(id: string) {
  const { error } = await supabase.from("charities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/charities");
  revalidatePath("/redeem");
}

// ─── Overview stats ───────────────────────────────────────────────────────────

export async function fetchOverviewStats() {
  const [users, salawat, charities, funding, campaigns] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("salawat_logs").select("count, tokens_earned").eq("status", "confirmed"),
    supabase.from("charities").select("id", { count: "exact", head: true }).eq("active", true).eq("verified", true),
    supabase.from("funding_sources").select("amount_usd").eq("status", "received"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const totalSalawat = (salawat.data ?? []).reduce((s, r) => s + (r.count ?? 0), 0);
  const totalGhdr = (salawat.data ?? []).reduce((s, r) => s + (r.tokens_earned ?? 0), 0);
  const fundingReceived = (funding.data ?? []).reduce((s, r) => s + (Number(r.amount_usd) ?? 0), 0);

  return {
    totalUsers: users.count ?? 0,
    totalSalawat,
    totalGhdr: Math.round(totalGhdr),
    activeCharities: charities.count ?? 0,
    fundingReceived: Math.round(fundingReceived),
    activeCampaigns: campaigns.count ?? 0,
  };
}

// ─── Team members ─────────────────────────────────────────────────────────────

export type TeamMember = {
  id?: string;
  name: string;
  role: string;
  email?: string;
  telegram_username?: string;
  wallet_address?: string;
  notes?: string;
  active?: boolean;
};

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from("team_members").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertTeamMember(member: TeamMember) {
  const { id, ...rest } = member;
  const { error } = id
    ? await supabase.from("team_members").update(rest).eq("id", id)
    : await supabase.from("team_members").insert(rest);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
}

export async function toggleTeamMember(id: string, active: boolean) {
  const { error } = await supabase.from("team_members").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
}

// ─── Funding sources ──────────────────────────────────────────────────────────

export type FundingSource = {
  id?: string;
  source_name: string;
  source_type: string;
  contributor_name?: string;
  contributor_contact?: string;
  amount_usd: number;
  status: string;
  date?: string;
  notes?: string;
};

export async function fetchFundingSources(): Promise<FundingSource[]> {
  const { data, error } = await supabase
    .from("funding_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertFundingSource(source: FundingSource) {
  const { id, ...rest } = source;
  const { error } = id
    ? await supabase.from("funding_sources").update(rest).eq("id", id)
    : await supabase.from("funding_sources").insert(rest);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/funding");
  revalidatePath("/admin");
}

export async function deleteFundingSource(id: string) {
  const { error } = await supabase.from("funding_sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/funding");
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type Campaign = {
  id?: string;
  name: string;
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  target_usd?: number | null;
  raised_usd?: number;
  platform?: string;
  description?: string;
  notes?: string;
};

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertCampaign(campaign: Campaign) {
  const { id, ...rest } = campaign;
  const payload = { ...rest, updated_at: new Date().toISOString() };
  const { error } = id
    ? await supabase.from("campaigns").update(payload).eq("id", id)
    : await supabase.from("campaigns").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing");
  revalidatePath("/admin");
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing");
}
