import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ─── Chain ────────────────────────────────────────────────────────────────────
const celoSepolia = {
  id: 11142220,
  name: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
} as const;

// ─── Contracts ────────────────────────────────────────────────────────────────
const SALAWAT_TOKEN = process.env.SALAWAT_TOKEN_ADDRESS as `0x${string}`;

const SALAWAT_ABI = parseAbi([
  "function logSalawat(address user, uint256 count) external",
  "function balanceOf(address owner) view returns (uint256)",
  "function lifetimeSalawat(address) view returns (uint256)",
  "function multiplier() view returns (uint256)",
]);

// ─── Viem clients ─────────────────────────────────────────────────────────────
const RPC = "https://forno.celo-sepolia.celo-testnet.org";

const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC),
});

const agentAccount = privateKeyToAccount(
  `0x${process.env.AGENT_PRIVATE_KEY!.replace("0x", "")}` as `0x${string}`
);

const walletClient = createWalletClient({
  account: agentAccount,
  chain: celoSepolia,
  transport: http(RPC),
});

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function getOrCreateUser(
  telegramId: string,
  username?: string,
  firstName?: string
) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (data) return data;

  const { data: created } = await supabase
    .from("users")
    .insert({ telegram_id: telegramId, username, first_name: firstName })
    .select()
    .single();

  return created;
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// /start ──────────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const from = ctx.from!;
  await getOrCreateUser(String(from.id), from.username, from.first_name);

  const name = from.first_name || from.username || "friend";
  await ctx.reply(
    `Assalamu Alaikum, ${name} 🌙\n\n` +
      `Welcome to Ghadir Waqf — the first permanent Islamic digital Waqf on Celo blockchain.\n\n` +
      `Every Salawat you send earns $GHDR tokens.\n` +
      `Redeem them as sadaqah — verified, on-chain, permanent.\n\n` +
      `Commands:\n` +
      `/wallet <address> — link your Celo wallet\n` +
      `/salawat — log a Salawat (earns 10 GHDR)\n` +
      `/balance — check your GHDR balance\n` +
      `/redeem — donate GHDR as sadaqah\n\n` +
      `Start by linking your wallet:\n/wallet 0xYourCeloAddress`
  );
});

// /wallet ─────────────────────────────────────────────────────────────────────
bot.command("wallet", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const address = ctx.match.trim();
  const user = await getOrCreateUser(telegramId, ctx.from!.username, ctx.from!.first_name);

  if (!address) {
    if (user?.wallet_address) {
      await ctx.reply(`Your linked wallet:\n${user.wallet_address}`);
    } else {
      await ctx.reply("No wallet linked yet.\n\nSend:\n/wallet 0xYourCeloAddress");
    }
    return;
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    await ctx.reply("Invalid address. Must be 42 hex characters starting with 0x.");
    return;
  }

  await supabase
    .from("users")
    .update({ wallet_address: address, updated_at: new Date().toISOString() })
    .eq("telegram_id", telegramId);

  await ctx.reply(`✅ Wallet linked:\n${address}`);
});

// /salawat ────────────────────────────────────────────────────────────────────
bot.command("salawat", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await getOrCreateUser(telegramId, ctx.from!.username, ctx.from!.first_name);

  if (!user?.wallet_address) {
    await ctx.reply("Please link your wallet first:\n/wallet 0xYourCeloAddress");
    return;
  }

  const statusMsg = await ctx.reply("🕌 Recording your Salawat on-chain…");

  // Insert pending log
  const { data: log } = await supabase
    .from("salawat_logs")
    .insert({
      user_id: user.id,
      count: 1,
      tokens_earned: 0,
      multiplier: 1,
      status: "pending",
    })
    .select()
    .single();

  try {
    const multiplierBN = await publicClient.readContract({
      address: SALAWAT_TOKEN,
      abi: SALAWAT_ABI,
      functionName: "multiplier",
    });
    const multiplierVal = Number(multiplierBN); // 100 = 1x, 500 = 5x

    const txHash = await walletClient.writeContract({
      address: SALAWAT_TOKEN,
      abi: SALAWAT_ABI,
      functionName: "logSalawat",
      args: [user.wallet_address as `0x${string}`, 1n],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // BASE_RATE = 10 GHDR × multiplier/100
    const tokensEarned = (10 * multiplierVal) / 100;

    if (log) {
      await supabase
        .from("salawat_logs")
        .update({
          status: "confirmed",
          tx_hash: txHash,
          tokens_earned: tokensEarned,
          multiplier: multiplierVal / 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", log.id);
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `✅ Salawat accepted!\n\n` +
        `Earned: ${tokensEarned} GHDR\n` +
        `Multiplier: ${multiplierVal / 100}x\n` +
        `Tx: https://celo-sepolia.blockscout.com/tx/${txHash}`
    );
  } catch (err: any) {
    const errMsg = String(err?.shortMessage || err?.message || err).slice(0, 300);

    if (log) {
      await supabase
        .from("salawat_logs")
        .update({
          status: "failed",
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", log.id);
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ Failed to record Salawat.\n\n${errMsg}`
    );
  }
});

// /balance ────────────────────────────────────────────────────────────────────
bot.command("balance", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await getOrCreateUser(telegramId, ctx.from!.username, ctx.from!.first_name);

  if (!user?.wallet_address) {
    await ctx.reply("Please link your wallet first:\n/wallet 0xYourCeloAddress");
    return;
  }

  try {
    const [balanceBN, lifetimeBN] = await Promise.all([
      publicClient.readContract({
        address: SALAWAT_TOKEN,
        abi: SALAWAT_ABI,
        functionName: "balanceOf",
        args: [user.wallet_address as `0x${string}`],
      }),
      publicClient.readContract({
        address: SALAWAT_TOKEN,
        abi: SALAWAT_ABI,
        functionName: "lifetimeSalawat",
        args: [user.wallet_address as `0x${string}`],
      }),
    ]);

    const ghdr = Number(formatUnits(balanceBN as bigint, 18)).toFixed(2);
    const lifetime = String(lifetimeBN);

    await ctx.reply(
      `💰 GHDR Balance\n\n` +
        `Balance: ${ghdr} GHDR\n` +
        `Lifetime Salawat: ${lifetime}\n\n` +
        `Wallet: ${user.wallet_address}`
    );
  } catch (err: any) {
    await ctx.reply(
      `❌ Error fetching balance: ${String(err?.message || err).slice(0, 200)}`
    );
  }
});

// /redeem ─────────────────────────────────────────────────────────────────────
bot.command("redeem", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await getOrCreateUser(telegramId, ctx.from!.username, ctx.from!.first_name);

  if (!user?.wallet_address) {
    await ctx.reply("Please link your wallet first:\n/wallet 0xYourCeloAddress");
    return;
  }

  const { data: charities } = await supabase
    .from("charities")
    .select("id, name, cause_category, funded_usd, target_usd")
    .eq("verified", true)
    .eq("active", true)
    .limit(8);

  if (!charities || charities.length === 0) {
    await ctx.reply(
      "No verified charities yet.\n\nThe first causes are being onboarded — check back soon."
    );
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const c of charities) {
    keyboard
      .text(
        `${c.name} · ${c.cause_category || "General"}`,
        `charity:${c.id}`
      )
      .row();
  }

  await ctx.reply(
    "Choose a verified charity to support:\n(Rate: 1,000 GHDR = $1 USDC)",
    { reply_markup: keyboard }
  );
});

bot.callbackQuery(/^charity:(.+)$/, async (ctx) => {
  const charityId = ctx.match[1];
  await ctx.answerCallbackQuery();

  const { data: c } = await supabase
    .from("charities")
    .select("*")
    .eq("id", charityId)
    .single();

  if (!c) {
    await ctx.editMessageText("Charity not found.");
    return;
  }

  const funded = `$${Number(c.funded_usd ?? 0).toFixed(0)}`;
  const target = c.target_usd ? ` / $${Number(c.target_usd).toFixed(0)} goal` : "";

  await ctx.editMessageText(
    `${c.name}\n\n` +
      `${c.description ?? ""}\n\n` +
      `Category: ${c.cause_category ?? "—"}\n` +
      `Country: ${c.country ?? "—"}\n` +
      `Funded: ${funded}${target}\n` +
      `Wallet: ${c.wallet_address}\n\n` +
      `To complete the donation, open the Ghadir web app:\n` +
      `👉 https://ghadir-waqf.vercel.app/redeem`
  );
});

// ─── Error handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ─── Process-level crash guards ───────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

// ─── Health server (Railway requires PORT binding) ────────────────────────────
import { createServer } from "http";
const PORT = process.env.PORT ?? 3000;
createServer((_, res) => { res.writeHead(200); res.end("OK"); }).listen(PORT);

// ─── Start ────────────────────────────────────────────────────────────────────
await bot.api.deleteWebhook();
bot.start();
console.log(`Ghadir Waqf bot running — agent: ${agentAccount.address}`);
