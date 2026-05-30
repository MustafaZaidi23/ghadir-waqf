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
  "function dailyMinted(address) view returns (uint256)",
  "function dailyCap() view returns (uint256)",
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
const APP_URL = "https://ghadir-waqf.vercel.app";
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// /start ──────────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const from = ctx.from!;
  await getOrCreateUser(String(from.id), from.username, from.first_name);

  const name = from.first_name || from.username || "friend";
  const keyboard = new InlineKeyboard()
    .webApp("🌐 Open App", APP_URL)
    .row()
    .text("📖 How it works", "howto");

  await ctx.reply(
    `Assalamu Alaikum, ${name} 🌙\n\n` +
      `Welcome to Ghadir Waqf — the first permanent Islamic digital Waqf on Celo blockchain.\n\n` +
      `Every Salawat you send earns $GHDR tokens.\n` +
      `Redeem them as hadiya — verified, on-chain, permanent.\n\n` +
      `Commands:\n` +
      `/salawat — record a Salawat directly (earns 10 GHDR)\n` +
      `/balance — check your GHDR balance\n` +
      `/redeem — donate GHDR as hadiya\n` +
      `/wallet <address> — link your Celo wallet manually`,
    { reply_markup: keyboard }
  );
});

bot.callbackQuery("howto", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `How Ghadir Waqf works:\n\n` +
      `1️⃣ Open the app and sign in (email, Google, or wallet)\n` +
      `2️⃣ Your Celo wallet is created automatically — no seed phrase\n` +
      `3️⃣ Send /salawat here — it logs directly on-chain and earns 10 GHDR\n` +
      `4️⃣ Go to Redeem, pick a verified charity, burn GHDR → donate USDC\n\n` +
      `The donation is on-chain, permanent, and goes directly to the charity's wallet.`,
    { reply_markup: new InlineKeyboard().webApp("🌐 Open App", APP_URL) }
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

  const normalized = address.toLowerCase();
  await supabase
    .from("users")
    .update({ wallet_address: normalized, updated_at: new Date().toISOString() })
    .eq("telegram_id", telegramId);

  await ctx.reply(`✅ Wallet linked:\n${normalized}`);
});

// /salawat ────────────────────────────────────────────────────────────────────
bot.command("salawat", async (ctx) => {
  const from = ctx.from!;
  const telegramId = String(from.id);
  const user = await getOrCreateUser(telegramId, from.username, from.first_name);

  if (!user?.wallet_address) {
    await ctx.reply(
      "No wallet linked yet.\n\nOpen the app and sign in — your wallet will be linked automatically.",
      { reply_markup: new InlineKeyboard().webApp("🌐 Open App", APP_URL) }
    );
    return;
  }

  // Pre-check daily cap and read multiplier in one round-trip
  const [mintedRaw, capRaw, multiplierRaw] = await Promise.all([
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyMinted", args: [user.wallet_address as `0x${string}`] }),
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "dailyCap" }),
    publicClient.readContract({ address: SALAWAT_TOKEN, abi: SALAWAT_ABI, functionName: "multiplier" }),
  ]);

  if (BigInt(String(mintedRaw)) >= BigInt(String(capRaw))) {
    await ctx.reply("Daily cap reached. Come back tomorrow! 🌙");
    return;
  }

  const multiplierVal = Number(multiplierRaw);
  const tokensEarned = (10 * multiplierVal) / 100;

  // Reply immediately so the user sees instant feedback
  const sent = await ctx.reply("اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ\n\n⏳ Recording Salawat…");

  try {
    const txHash = await walletClient.writeContract({
      address: SALAWAT_TOKEN,
      abi: SALAWAT_ABI,
      functionName: "logSalawat",
      args: [user.wallet_address as `0x${string}`, 1n],
    });

    await ctx.api.editMessageText(
      ctx.chat!.id,
      sent.message_id,
      `اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ\n\n` +
      `✅ Salawat recorded! +${tokensEarned} GHDR earned.\n\n` +
      `Tx: https://celo-sepolia.blockscout.com/tx/${txHash}`
    );

    // Write to DB after on-chain confirmation (runs in background)
    publicClient.waitForTransactionReceipt({ hash: txHash })
      .then(() =>
        supabase.from("salawat_logs").insert({
          user_id: user.id,
          count: 1,
          tokens_earned: tokensEarned,
          multiplier: multiplierVal / 100,
          status: "confirmed",
          tx_hash: txHash,
        })
      )
      .catch(console.error);

  } catch (err: any) {
    const msg = String(err?.shortMessage ?? err?.message ?? err).slice(0, 150);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      sent.message_id,
      `❌ Could not record Salawat.\n${msg}`
    ).catch(() => {});
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
      `Funded: ${funded}${target}\n\n` +
      `Tap below to complete the donation in the app:`,
    {
      reply_markup: new InlineKeyboard().webApp(
        `💚 Donate to ${c.name}`,
        `${APP_URL}/redeem`
      ),
    }
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

// Register commands so they appear in Telegram's "/" suggestion menu
await bot.api.setMyCommands([
  { command: "start",   description: "Welcome message & open app" },
  { command: "salawat", description: "Record a Salawat (earns 10 GHDR)" },
  { command: "balance", description: "Check your GHDR balance" },
  { command: "redeem",  description: "Donate GHDR as hadiya to a charity" },
  { command: "wallet",  description: "Link or view your Celo wallet" },
]);

// Set persistent "Open App" button in the chat menu
await bot.api.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "Open App",
    web_app: { url: APP_URL },
  },
});

bot.start();
console.log(`Ghadir Waqf bot running — agent: ${agentAccount.address}`);
