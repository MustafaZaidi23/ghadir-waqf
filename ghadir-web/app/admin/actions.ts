"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
  const { data, error } = await supabase
    .from("charities")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertCharity(charity: CharityRow) {
  const { id, ...rest } = charity;
  const { error } = id
    ? await supabase.from("charities").update(rest).eq("id", id)
    : await supabase.from("charities").insert(rest);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/redeem");
}

export async function toggleCharity(
  id: string,
  field: "verified" | "active",
  value: boolean
) {
  const { error } = await supabase
    .from("charities")
    .update({ [field]: value })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/redeem");
}

export async function deleteCharity(id: string) {
  const { error } = await supabase.from("charities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/redeem");
}
