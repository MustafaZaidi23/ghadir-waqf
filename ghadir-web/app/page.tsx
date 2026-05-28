import Link from "next/link";

const stats = [
  { label: "Blockchain", value: "Celo Sepolia" },
  { label: "Token", value: "$GHDR" },
  { label: "Rate", value: "10 GHDR / Salawat" },
  { label: "Redemption", value: "1,000 GHDR = $1 USDC" },
];

const features = [
  {
    icon: "🕌",
    title: "Log Salawat",
    desc: "Send Darood on the Prophet ﷺ and earn $GHDR tokens — on-chain, permanent.",
  },
  {
    icon: "🌿",
    title: "Permanent Waqf",
    desc: "The principal is locked forever on-chain. Only yield is distributed as sadaqah.",
  },
  {
    icon: "💚",
    title: "Verified Sadaqah",
    desc: "Redeem GHDR for real charitable giving to verified, on-chain causes.",
  },
  {
    icon: "📜",
    title: "Soulbound Certificates",
    desc: "Earn non-transferable NFT certificates for your contributions.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-12 space-y-6">
        <div className="text-5xl mb-4">☽</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#22c55e] tracking-tight">
          Ghadir Waqf
        </h1>
        <p className="text-xl text-[#6b9e6b] max-w-2xl mx-auto leading-relaxed">
          The first permanent Islamic digital Waqf on Celo blockchain.
          <br />
          Earn $GHDR tokens by sending Salawat. Redeem them as sadaqah.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
            Open Dashboard
          </Link>
          <Link href="/redeem" className="btn-gold text-base px-8 py-3">
            Redeem Sadaqah
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-[#22c55e] font-bold text-lg">{s.value}</div>
            <div className="text-[#6b9e6b] text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-2 gap-6">
        {features.map((f) => (
          <div key={f.title} className="card flex gap-4">
            <span className="text-3xl">{f.icon}</span>
            <div>
              <h3 className="font-semibold text-[#e8f5e8] mb-1">{f.title}</h3>
              <p className="text-[#6b9e6b] text-sm leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Telegram CTA */}
      <section className="card text-center space-y-3">
        <p className="text-[#6b9e6b]">Log Salawat directly from Telegram</p>
        <a
          href="https://t.me/GhadirWaqfBot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          Open Telegram Bot
        </a>
      </section>
    </div>
  );
}
