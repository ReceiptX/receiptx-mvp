"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          <motion.div variants={fadeInUp}>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
              Turn everyday <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                receipts
              </span>{" "}
              into blockchain rewards
            </h1>

            <p className="mt-4 text-slate-300 text-lg">
              Scan receipts, earn RWT tokens, redeem exclusive rewards. Complete NFT milestones and stake AIA for multiplier bonuses.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="#features"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-900 font-semibold shadow-lg shadow-cyan-500/30"
              >
                Explore Features
              </Link>

              <Link
                href="/"
                className="px-6 py-3 rounded-xl border border-white/20 text-white hover:border-cyan-400/60 transition"
              >
                Try the App
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="relative h-[400px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur"
          >
            <div className="absolute inset-0 rounded-3xl blur-3xl bg-gradient-to-tr from-cyan-500/30 to-violet-500/30" />
            <div className="relative p-6 flex flex-col justify-between h-full">
              <h3 className="text-lg font-semibold text-cyan-300">
                How It Works
              </h3>
              <ul className="text-sm text-slate-300 space-y-3">
                <li>📸 Upload receipt (Web or Telegram)</li>
                <li>🤖 AI OCR extracts merchant & total</li>
                <li>⚡ Earn 1 RWT per $1 spent</li>
                <li>🎁 1.5x multiplier for Starbucks, McDonald&apos;s, Circle K</li>
                <li>🏆 Auto-mint NFTs at 5, 15, 40, 100 receipts</li>
                <li>💎 Convert NFTs to AIA tokens</li>
                <li>🎯 Stake AIA for tier upgrades & bonuses</li>
                <li>🛍️ Redeem RWT for real rewards</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-6xl mx-auto px-4 pb-12"
      >
        <motion.div variants={fadeInUp} initial="initial" whileInView="animate">
          <h2 className="text-3xl font-semibold mb-8 text-center">Platform Features</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-400/30 transition"
            >
              <div className="text-4xl mb-3">{card.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-cyan-400">{card.title}</h3>
              <p className="text-slate-300 text-sm">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <motion.div variants={fadeInUp} initial="initial" whileInView="animate">
          <h2 className="text-3xl font-semibold mb-8 text-center">Tokenomics & Migration Strategy</h2>
        </motion.div>

        {/* Dual Token Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-400/20 rounded-2xl p-8"
          >
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-green-400 mb-3">RWT - Reward Token</h3>
            <ul className="space-y-2 text-slate-300">
              <li>✅ Unlimited supply (inflationary)</li>
              <li>✅ Earn 1 RWT per $1 spent</li>
              <li>✅ Brand multipliers up to 1.5x</li>
              <li>✅ Redeemable for real rewards</li>
              <li>✅ Transferable between users</li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-400/20 rounded-2xl p-8"
          >
            <div className="text-5xl mb-4">💎</div>
            <h3 className="text-2xl font-bold text-blue-400 mb-3">AIA - Analytics Token</h3>
            <ul className="space-y-2 text-slate-300">
              <li>✅ Fixed supply (1 billion)</li>
              <li>✅ Earned from NFT conversions</li>
              <li>✅ Referral bonuses (5-10 AIA)</li>
              <li>✅ Used for staking & tier upgrades</li>
              <li>✅ Governance & premium features</li>
            </ul>
          </motion.div>
        </div>

        {/* Tokenomics Flow Diagram */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8"
        >
          <h3 className="text-2xl font-semibold mb-6 text-center text-cyan-400">Token Flow & Value Cycle</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Earn Phase */}
            <div className="bg-gradient-to-b from-green-500/10 to-transparent border border-green-400/20 rounded-xl p-6">
              <h4 className="text-lg font-bold text-green-400 mb-4">💳 Earn</h4>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span>Upload receipt ($14.50)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span>Base: 14 RWT (1:1 ratio)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span>Starbucks 1.5x: +7 RWT</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">→</span>
                  <span className="font-semibold text-green-400">Total: 21 RWT earned</span>
                </div>
              </div>
            </div>

            {/* NFT Phase */}
            <div className="bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-400/20 rounded-xl p-6">
              <h4 className="text-lg font-bold text-purple-400 mb-4">🏆 Collect</h4>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span>5 receipts: Bronze NFT</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span>15 receipts: Silver NFT</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span>40 receipts: Gold NFT</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span>Convert NFT → 50-1000 AIA</span>
                </div>
              </div>
            </div>

            {/* Stake Phase */}
            <div className="bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-400/20 rounded-xl p-6">
              <h4 className="text-lg font-bold text-blue-400 mb-4">📈 Stake</h4>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">→</span>
                  <span>Bronze: 0 AIA (1.0x)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">→</span>
                  <span>Silver: 100 AIA (1.1x)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">→</span>
                  <span>Gold: 1K AIA (1.25x)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">→</span>
                  <span className="font-semibold text-blue-400">Premium: 10K AIA (1.5x)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Central Flow Arrow */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/30 rounded-full">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-semibold">Continuous Reward Cycle</span>
            </div>
          </div>
        </motion.div>

        {/* Migration Bonus Diagram */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-400/20 rounded-2xl p-8"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-3xl">🚀</span>
            <h3 className="text-2xl font-semibold text-center text-yellow-400">Testnet → Mainnet Migration Bonuses</h3>
            <span className="text-3xl">🎁</span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Bonus Structure */}
            <div className="bg-black/20 rounded-xl p-6 border border-yellow-400/20">
              <h4 className="text-lg font-bold text-yellow-400 mb-4">Bonus Multipliers</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Base testnet bonus:</span>
                  <span className="text-yellow-400 font-semibold">+10%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Top 100 early adopters:</span>
                  <span className="text-yellow-400 font-semibold">+50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Top 1,000 users:</span>
                  <span className="text-yellow-400 font-semibold">+25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">500+ receipts scanned:</span>
                  <span className="text-yellow-400 font-semibold">+50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Complete NFT collection:</span>
                  <span className="text-yellow-400 font-semibold">+100%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Premium staker:</span>
                  <span className="text-yellow-400 font-semibold">+30%</span>
                </div>
                <div className="h-px bg-yellow-400/20 my-2"></div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-yellow-400 font-bold">Max bonus:</span>
                  <span className="text-yellow-400 font-bold">3.4x</span>
                </div>
              </div>
            </div>

            {/* Example Calculations */}
            <div className="bg-black/20 rounded-xl p-6 border border-yellow-400/20">
              <h4 className="text-lg font-bold text-yellow-400 mb-4">Bonus Examples</h4>
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="text-slate-400 font-semibold">Regular User (1.2x):</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Testnet: 1,000 RWT</span>
                    <span className="text-green-400">→ 1,200 RWT</span>
                  </div>
                  <div className="text-xs text-slate-500">+200 bonus</div>
                </div>

                <div className="h-px bg-yellow-400/10"></div>

                <div className="space-y-2">
                  <div className="text-slate-400 font-semibold">Power User (2.15x):</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Testnet: 5,000 RWT</span>
                    <span className="text-green-400">→ 10,750 RWT</span>
                  </div>
                  <div className="text-xs text-slate-500">+5,750 bonus 🔥</div>
                </div>

                <div className="h-px bg-yellow-400/10"></div>

                <div className="space-y-2">
                  <div className="text-slate-400 font-semibold">Whale (3.4x):</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Testnet: 20,000 RWT</span>
                    <span className="text-green-400">→ 68,000 RWT</span>
                  </div>
                  <div className="text-xs text-slate-500">+48,000 bonus 🚀</div>
                </div>
              </div>
            </div>
          </div>

          {/* Exclusive NFT Badge */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h4 className="text-xl font-bold text-purple-400 mb-2">Genesis Warrior NFT</h4>
            <p className="text-sm text-slate-300">
              All testnet users receive exclusive Genesis Warrior NFT (2,000 AIA value) — Soulbound & non-transferable
            </p>
          </div>
        </motion.div>
      </section>

      {/* Investor Section */}
      <section
        id="investor"
        className="max-w-6xl mx-auto px-4 pb-20 space-y-12"
      >
        <motion.div variants={fadeInUp} initial="initial" whileInView="animate">
          <h2 className="text-3xl font-semibold text-center mb-4">Investor Overview</h2>
          <p className="text-slate-300 max-w-3xl mx-auto text-center">
            Complete Web3 receipt rewards platform with NFT milestones, staking system, and marketplace ready for scale.
          </p>
        </motion.div>

        {INVEST_CARDS.map((card, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              {card.points.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </section>

      <footer className="text-center text-slate-600 py-10 text-xs">
        ReceiptX © {new Date().getFullYear()} — Web3 Receipt Rewards & Analytics
      </footer>
    </main>
  );
}

const FEATURE_CARDS = [
  {
    icon: "📸",
    title: "Receipt Scanning",
    description: "Upload receipts via web or Telegram. AI-powered OCR extracts merchant, total, and items automatically.",
  },
  {
    icon: "💰",
    title: "RWT Rewards",
    description: "Earn 1 RWT per $1 spent. 1.5x multiplier for Starbucks, McDonald's, and Circle K purchases.",
  },
  {
    icon: "🎁",
    title: "NFT Milestones",
    description: "Auto-mint exclusive NFTs at 5, 15, 40, and 100 receipts. Earn special Brand Warrior NFTs for brand loyalty.",
  },
  {
    icon: "💎",
    title: "AIA Tokens",
    description: "Convert NFTs to AIA tokens. Use for staking, governance, and unlocking premium features.",
  },
  {
    icon: "🎯",
    title: "Staking System",
    description: "Stake AIA for tier upgrades (Bronze/Silver/Gold/Premium). Get up to 1.5x multiplier on all future receipts.",
  },
  {
    icon: "🛍️",
    title: "Rewards Marketplace",
    description: "Redeem RWT for real rewards: gift cards, discounts, exclusive offers from top brands.",
  },
  {
    icon: "🤝",
    title: "Referral Program",
    description: "Earn 5-10 AIA per referral. Build your network and boost your rewards.",
  },
  {
    icon: "🏪",
    title: "POS Integration",
    description: "Connect 50+ POS systems: Shopify, Square, Clover, Toast, Stripe. 5-minute setup via webhooks.",
  },
  {
    icon: "📊",
    title: "Business Analytics",
    description: "Businesses get anonymized insights on consumer behavior, trends, and brand performance.",
  },
  {
    icon: "🔐",
    title: "Blockchain Security",
    description: "Self-custodial wallets, fraud prevention, and transparent on-chain reward tracking.",
  },
];

const INVEST_CARDS = [
  {
    title: "1. Executive Summary",
    points: [
      "ReceiptX tokenizes real-world spending using AI OCR and blockchain technology.",
      "Users earn RWT tokens (1 per $1) and redeem for real rewards from businesses.",
      "NFT milestone system and AIA staking create engagement loops.",
      "Businesses access anonymized analytics dashboards for consumer insights.",
    ],
  },
  {
    title: "2. Complete Product Suite",
    points: [
      "Receipt scanning with OCR (Web + Telegram bot integration)",
      "POS integrations: 50+ platforms (Shopify, Square, Clover, Toast, Stripe)",
      "Dual token system: RWT (rewards) + AIA (governance/staking)",
      "7 NFT types with auto-minting at milestones",
      "4-tier staking system with multiplier bonuses (1.0x to 1.5x)",
      "Rewards marketplace with redemption codes",
      "Business portal for creating and managing offers",
    ],
  },
  {
    title: "3. Revenue Streams",
    points: [
      "POS integration fees: $99-$999/mo (tiered by transaction volume)",
      "Business subscriptions: Analytics dashboard access",
      "Featured rewards placement: Businesses pay to feature offers",
      "Brand multiplier partnerships: Sponsored 1.5x campaigns",
      "Marketplace transaction fees: 5-10% on reward redemptions",
      "API access: Enterprise data feeds for retail analytics",
    ],
  },
  {
    title: "4. Technology Stack",
    points: [
      "Next.js 16 + TypeScript frontend",
      "Supabase PostgreSQL with RLS policies",
      "Privy for Web3 authentication (seedless wallets)",
      "OCR.space API for receipt text extraction",
      "Solidity smart contracts (upgradeable UUPS proxy)",
      "Supra EVM blockchain deployment",
    ],
  },
  {
    title: "5. Market Traction",
    points: [
      "MVP fully functional with complete user flow",
      "Active brand partnerships: Starbucks, McDonald's, Circle K",
      "Sample rewards marketplace with 5+ live offers",
      "NFT system with 7 collectible types",
      "Staking mechanism with proven engagement metrics",
      "Ready for pilot launch and user onboarding",
    ],
  },
  {
    title: "6. Roadmap & Milestones",
    points: [
      "Q1 2025: Deploy database migration, launch pilot with 100 users",
      "Q2 2025: Scale to 10 business partnerships, 1K active users",
      "Q3 2025: Mobile app launch (iOS/Android), expand to 10K users",
      "Q4 2025: International expansion, 50+ brand partnerships",
      "2026: Enterprise analytics platform, white-label solutions",
    ],
  },
  {
    title: "7. Competitive Advantages",
    points: [
      "50+ POS integrations: Fastest market deployment with webhook adapters",
      "Frictionless onboarding: No seed phrases, email/Telegram login",
      "Gamified engagement: NFTs and staking create addiction loops",
      "Instant gratification: Auto-rewards on every receipt",
      "Zero PII storage: Privacy-first architecture",
      "Brand-agnostic: Works with any receipt, any merchant",
      "Real utility: RWT redeemable for actual products/services",
    ],
  },
  {
    title: "8. Use of Funds",
    points: [
      "Product development: Mobile apps, advanced OCR, SKU matching",
      "Business development: Sales team for brand partnerships",
      "Marketing: User acquisition campaigns, influencer partnerships",
      "Infrastructure: Cloud hosting, database scaling, blockchain fees",
      "Legal & compliance: Terms of service, privacy policy, security audits",
      "Team expansion: 3-5 full-time hires (engineering, BD, marketing)",
    ],
  },
];
