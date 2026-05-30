import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;

  // Look up user by wallet_address
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", wallet.toLowerCase())
    .single();

  if (!user) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("salawat_logs")
    .select("id, count, tokens_earned, multiplier, status, tx_hash, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
