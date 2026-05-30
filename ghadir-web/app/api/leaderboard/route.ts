import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("salawat_logs")
    .select("count, tokens_earned, users(username, display_name, first_name, wallet_address)")
    .eq("status", "confirmed")
    .order("count", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by user
  const map = new Map<string, { username: string | null; display_name: string | null; first_name: string | null; wallet_address: string | null; total_salawat: number; total_tokens: number }>();

  for (const row of data ?? []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users as any;
    if (!user) continue;
    const key = user.wallet_address ?? user.username ?? user.first_name ?? "anon";
    const existing = map.get(key);
    if (existing) {
      existing.total_salawat += row.count;
      existing.total_tokens += row.tokens_earned;
    } else {
      map.set(key, {
        username: user.username,
        display_name: user.display_name,
        first_name: user.first_name,
        wallet_address: user.wallet_address,
        total_salawat: row.count,
        total_tokens: row.tokens_earned,
      });
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.total_salawat - a.total_salawat).slice(0, 50);
  return NextResponse.json(sorted);
}
