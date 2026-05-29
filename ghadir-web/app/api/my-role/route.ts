import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ role: null });

  const { data } = await supabase
    .from("team_members")
    .select("role")
    .ilike("wallet_address", wallet)
    .eq("active", true)
    .single();

  return NextResponse.json({ role: data?.role ?? null });
}
