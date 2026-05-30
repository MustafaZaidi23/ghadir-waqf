import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Returns the linked profile (username / first name) for a wallet, if any.
// Username is populated when the wallet is linked to a Telegram account.
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ username: null, first_name: null });

  const { data } = await supabase
    .from("users")
    .select("username, first_name")
    .eq("wallet_address", wallet.toLowerCase())
    .single();

  return NextResponse.json({
    username: data?.username ?? null,
    first_name: data?.first_name ?? null,
  });
}
