import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET /api/join-campaign?wallet=0x... → { joined: string[] }
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ joined: [] });

  const { data } = await supabase
    .from("campaign_participants")
    .select("campaign_id")
    .ilike("wallet_address", wallet);

  return NextResponse.json({ joined: (data ?? []).map((r) => r.campaign_id) });
}

// POST /api/join-campaign  { campaign_id, wallet_address }
export async function POST(req: NextRequest) {
  const { campaign_id, wallet_address } = await req.json();
  if (!campaign_id || !wallet_address) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Idempotent insert — ignore if already joined
  const { error: insertErr } = await supabase
    .from("campaign_participants")
    .insert({ campaign_id, wallet_address: wallet_address.toLowerCase() })
    .select()
    .single();

  if (insertErr && !insertErr.message.includes("duplicate")) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Increment participant count (only if newly inserted)
  if (!insertErr) {
    await supabase.rpc("increment_participants", { cid: campaign_id });
  }

  return NextResponse.json({ ok: true });
}
