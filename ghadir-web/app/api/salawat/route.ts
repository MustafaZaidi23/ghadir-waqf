import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "@/lib/chain";
import { SALAWAT_TOKEN } from "@/lib/contracts";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const AGENT_ABI = parseAbi([
  "function logSalawat(address user, uint256 count) external",
  "function multiplier() view returns (uint256)",
  "function dailyMinted(address) view returns (uint256)",
  "function dailyCap() view returns (uint256)",
]);

const RPC = "https://forno.celo-sepolia.celo-testnet.org";

const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC) });

function getWalletClient() {
  const raw = process.env.AGENT_PRIVATE_KEY!.replace(/^0x/, "");
  const account = privateKeyToAccount(`0x${raw}` as `0x${string}`);
  return { client: createWalletClient({ account, chain: celoSepolia, transport: http(RPC) }), account };
}

function verifyInitData(initData: string): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const str = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const expected = crypto.createHmac("sha256", secret).update(str).digest("hex");
  return expected === hash;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let walletAddress: string;

  if (body.init_data) {
    if (!verifyInitData(body.init_data)) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });
    }
    const params = new URLSearchParams(body.init_data);
    const userJson = params.get("user");
    if (!userJson) return NextResponse.json({ error: "No user in initData" }, { status: 400 });
    const tgUser = JSON.parse(userJson) as { id: number };

    const { data: user } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("telegram_id", String(tgUser.id))
      .single();

    if (!user?.wallet_address) {
      return NextResponse.json(
        { error: "No wallet linked. Open the app, sign in, and it will link automatically." },
        { status: 400 }
      );
    }
    walletAddress = user.wallet_address;
  } else if (body.wallet_address) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(body.wallet_address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }
    walletAddress = body.wallet_address;
  } else {
    return NextResponse.json({ error: "Provide init_data or wallet_address" }, { status: 400 });
  }

  // Check daily cap
  const [dailyMinted, dailyCap, multiplierBN] = await Promise.all([
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: AGENT_ABI, functionName: "dailyMinted", args: [walletAddress as `0x${string}`] }),
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: AGENT_ABI, functionName: "dailyCap" }),
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: AGENT_ABI, functionName: "multiplier" }),
  ]);

  if (BigInt(String(dailyMinted)) >= BigInt(String(dailyCap))) {
    return NextResponse.json({ error: "Daily cap reached. Come back tomorrow." }, { status: 429 });
  }

  // Get user row for FK
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();

  const { data: log } = await supabase
    .from("salawat_logs")
    .insert({ user_id: dbUser?.id ?? null, count: 1, tokens_earned: 0, multiplier: 1, status: "pending" })
    .select()
    .single();

  try {
    const { client: walletClient } = getWalletClient();

    const txHash = await walletClient.writeContract({
      address: SALAWAT_TOKEN,
      abi: AGENT_ABI,
      functionName: "logSalawat",
      args: [walletAddress as `0x${string}`, 1n],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const multiplierVal = Number(multiplierBN);
    const tokensEarned = (10 * multiplierVal) / 100;

    if (log) {
      await supabase
        .from("salawat_logs")
        .update({ status: "confirmed", tx_hash: txHash, tokens_earned: tokensEarned, multiplier: multiplierVal / 100, updated_at: new Date().toISOString() })
        .eq("id", log.id);
    }

    return NextResponse.json({ tx_hash: txHash, tokens_earned: tokensEarned, multiplier: multiplierVal / 100 });
  } catch (err: unknown) {
    const msg = String((err as { shortMessage?: string; message?: string })?.shortMessage ?? (err as { message?: string })?.message ?? err).slice(0, 300);
    if (log) {
      await supabase.from("salawat_logs").update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() }).eq("id", log.id);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
