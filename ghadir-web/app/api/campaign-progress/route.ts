import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST { charity_id, amount_usd }
// Called after a successful Hadiya redemption — increments raised_usd on any
// active fundraising campaigns linked to that charity.
export async function POST(req: NextRequest) {
  const { charity_id, amount_usd } = await req.json().catch(() => ({}));
  if (!charity_id || !amount_usd || Number(amount_usd) <= 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id")
    .eq("charity_id", charity_id)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!campaigns || campaigns.length === 0) return NextResponse.json({ updated: 0 });

  await Promise.all(
    campaigns.map((c: { id: string }) =>
      supabase.rpc("increment_campaign_raised", { cid: c.id, usd: Number(amount_usd) })
    )
  );

  return NextResponse.json({ updated: campaigns.length });
}
