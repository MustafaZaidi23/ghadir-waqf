import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Live countries available for selection / localization.
export async function GET() {
  const { data, error } = await supabase
    .from("countries")
    .select("code, name, region, currency_code, currency_symbol, usd_fx_rate, default_locale")
    .eq("status", "live")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
