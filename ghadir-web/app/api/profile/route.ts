import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress, isAddress } from "viem";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Must match the message the client signs (see dashboard buildSignMessage).
function buildSignMessage(wallet: string, name: string, ts: number) {
  return `Ghadir Waqf — set display name\nName: ${name}\nWallet: ${wallet.toLowerCase()}\nTime: ${ts}`;
}

const NAME_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { wallet_address, display_name, timestamp, signature } = body as {
    wallet_address?: string;
    display_name?: string;
    timestamp?: number;
    signature?: `0x${string}`;
  };

  if (!wallet_address || !isAddress(wallet_address)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (typeof display_name !== "string" || !NAME_RE.test(display_name.trim())) {
    return NextResponse.json(
      { error: "Name must be 2–20 characters (letters, numbers, space, _ . -)" },
      { status: 400 }
    );
  }
  if (!signature || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  // Replay protection — signature must be fresh (< 5 min old)
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Signature expired, please try again" }, { status: 401 });
  }

  const name = display_name.trim();
  const wallet = wallet_address.toLowerCase();

  // Verify the signature recovers to the wallet that's being updated
  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message: buildSignMessage(wallet, name, timestamp),
      signature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (recovered.toLowerCase() !== wallet) {
    return NextResponse.json({ error: "Signature does not match wallet" }, { status: 401 });
  }

  // Upsert by wallet (manual, since the unique index is on lower(wallet_address))
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", wallet)
    .single();

  if (existing) {
    await supabase
      .from("users")
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("users").insert({ wallet_address: wallet, display_name: name });
  }

  return NextResponse.json({ ok: true, display_name: name });
}
