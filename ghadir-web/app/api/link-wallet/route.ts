import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function verifyInitData(initData: string): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  // Reject stale initData (replay protection) — must be < 24h old
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return false;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return expected === hash;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const { initData, wallet_address } = body as {
    initData: string;
    wallet_address: string;
  };

  if (!initData || !wallet_address) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet_address)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (!verifyInitData(initData)) {
    return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });
  }

  const params = new URLSearchParams(initData);
  const userJson = params.get("user");
  if (!userJson) return NextResponse.json({ error: "No user in initData" }, { status: 400 });

  let tgUser: { id: number; username?: string; first_name?: string };
  try {
    tgUser = JSON.parse(userJson);
  } catch {
    return NextResponse.json({ error: "Bad user JSON" }, { status: 400 });
  }

  const telegramId = String(tgUser.id);

  const { error } = await supabase.from("users").upsert(
    {
      telegram_id: telegramId,
      wallet_address: wallet_address.toLowerCase(),
      username: tgUser.username,
      first_name: tgUser.first_name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, telegram_id: telegramId });
}
