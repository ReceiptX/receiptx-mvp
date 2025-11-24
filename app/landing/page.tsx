"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const NFT_TIERS = [
  {
    name: "Genesis Pass",
    price: 100,
    supply: 1000,
    multiplier: 1.5,
    rarity: "Legendary",
    color: "from-[#FF003D] via-[#9D00FF] to-[#5A00FF]",
    badge: "🌟",
    background: "bg-gradient-to-br from-[#1a0022] via-[#2d0036] to-[#050509]",
    perks: [
      "Lifetime 1.5x RWT & AIA multiplier",
      "Max multipliers on all rewards",
      "Governance rights",
      "Future airdrops",
      "Whitelist forever"
    ],
    note: "Lifetime multiplier applies to all receipts.",
    metadata: {
      tier: 3,
      label: "GENESIS",
      art: "genesis.svg",
      commission: 0.08 // 8% resale commission
    }
  },
  {
    name: "Power User NFT",
    price: 25,
    supply: 2000,
    multiplier: 2.0,
    rarity: "Epic",
    color: "from-[#FF006E] via-[#9D00FF] to-[#5A00FF]",
    badge: "⚡",
    background: "bg-gradient-to-br from-[#2a0036] via-[#3d0050] to-[#050509]",
    perks: [
      "2x multiplier on first 2,000 receipts uploaded",
      "Priority airdrops",
      "Special Discord/Telegram role"
    ],
    note: "2x multiplier applies only to your first 2,000 receipts.",
    metadata: {
      tier: 2,
      label: "POWER USER",
      art: "poweruser.svg",
      commission: 0.07 // 7% resale commission
    }
  },
  {
    name: "Early Bird NFT",
    price: 5,
    supply: 4000,
    multiplier: 3.0,
    rarity: "Rare",
    color: "from-[#FF006E] via-[#FF003D] to-[#9CA3AF]",
    badge: "🐦",
    background: "bg-gradient-to-br from-[#2a0022] via-[#3d0030] to-[#050509]",
    perks: [
      "3x multiplier on first 750 receipts uploaded",
      "Early supporter badge"
    ],
    note: "3x multiplier applies only to your first 750 receipts.",
    metadata: {
      tier: 1,
      label: "EARLY BIRD",
      art: "earlybird.svg",
      commission: 0.05 // 5% resale commission
    }
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);


  // Telegram Stars payment integration
  async function handleTelegramStarsPurchase(tier) {
    setSelectedTier(tier);
    setLoading(true);
    try {
      // Call backend to get invoice slug/payload
      const res = await fetch('/api/telegram/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceSlug) {
        alert('Failed to create Telegram invoice.');
        setLoading(false);
        return;
      }
      if (window?.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(data.invoiceSlug, (status) => {
          if (status === 'paid') {
            // Simulate wallet generation after payment
            const mockWallet = "0x" + Math.random().toString(16).slice(2, 42);
            setWalletAddress(mockWallet);
            setPurchaseSuccess(true);
          } else {
            alert('Payment was not completed.');
          }
          setLoading(false);
        });
      } else {
        alert('Telegram Stars payment is only available in Telegram WebApp.');
        setLoading(false);
      }
    } catch (err) {
      alert('Error initiating Telegram Stars payment.');
      setLoading(false);
    }
  }

  async function handleWaitlist(e) {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from('waitlist').insert([{ email }]);
    if (!error) {
      setWaitlistSuccess(true);
      setEmail("");
    } else {
      alert("There was an error joining the waitlist. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white flex flex-col items-center px-4 py-10">
      {/* Hero Section */}
      <section className="max-w-3xl w-full text-center mb-12">
        <div className="flex justify-center mb-6">
          {/* Logo SVG */}
          <svg width="120" height="50" viewBox="0 0 900 380" className="drop-shadow-xl" style={{maxWidth:'180px'}}>
            <defs>
              <linearGradient id="rxSiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee"/>
                <stop offset="50%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#a21caf"/>
              </linearGradient>
            </defs>
            <polygon points="130,32 218,84 218,176 130,228 42,176 42,84" stroke="url(#rxSiteGrad)" strokeWidth="14" fill="#0B0C10" transform="translate(10,10)"/>
            <text x="180" y="90" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontWeight="700" fontSize="60" letterSpacing="4" fill="url(#rxSiteGrad)">RECEIPTX</text>
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 drop-shadow">Unlock the Future of Receipts</h1>
        <p className="text-lg text-slate-200 mb-6">Earn rewards, analytics, and exclusive multipliers with ReceiptX. Join the waitlist or become a founding member by purchasing a Lifetime Multiplier NFT.</p>
      </section>

      {/* NFT Sale Section */}
      <section className="w-full max-w-4xl mb-14">
        <h2 className="text-2xl font-bold mb-6 text-center text-cyan-300">Founders NFT Sale</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {NFT_TIERS.map((tier, i) => (
            <div key={tier.name} className={`rounded-2xl border-2 shadow-xl p-6 flex flex-col items-center ${tier.background} border-cyan-700/30`}>
              <div className={`text-4xl mb-2 bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>{tier.badge}</div>
              <div className="text-xl font-semibold mb-1 flex items-center gap-2">
                {tier.name}
                <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 ml-2 uppercase tracking-widest">{tier.rarity}</span>
              </div>
              <div className="text-lg font-bold text-cyan-200 mb-1">{tier.metadata.label}</div>
              <div className="text-2xl font-bold text-cyan-300 mb-2">${tier.price}</div>
              <div className="text-sm text-slate-400 mb-2">Max {tier.supply} NFTs</div>
              <ul className="text-left text-sm text-slate-200 mb-4 list-disc list-inside">
                {tier.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className="text-xs text-pink-400 mb-2 font-semibold">
                {`Resale commission: ${(tier.metadata.commission * 100).toFixed(0)}% will be collected on every secondary sale`}
              </div>
              <div className="text-xs text-slate-400 mb-2 italic">{tier.note}</div>
              <button
                className="mt-auto px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold shadow hover:opacity-90 disabled:opacity-40"
                disabled={loading || purchaseSuccess}
                onClick={() => handleTelegramStarsPurchase(tier)}
              >
                {loading && selectedTier === tier ? 'Processing...' : purchaseSuccess && selectedTier === tier ? 'Purchased!' : 'Buy with Telegram Stars'}
              </button>
            </div>
          ))}
        </div>
        {/* Payment Modal removed: replaced by Telegram Stars payment */}
        {purchaseSuccess && (
          <div className="mt-8 bg-green-900/60 border border-green-500 text-green-100 p-4 rounded-lg text-center max-w-xl mx-auto">
            <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
            <p>You’ve secured a {selectedTier.name} and your Supra wallet has been generated:</p>
            <div className="mt-2 text-cyan-300 font-mono text-lg">{walletAddress}</div>
            <p className="mt-2 text-sm text-slate-300">Your NFT and wallet will be securely held until the MVP launch.</p>
          </div>
        )}
      </section>

      {/* Waitlist Section */}
      <section className="w-full max-w-lg mb-14">
        <h2 className="text-xl font-bold mb-4 text-cyan-300 text-center">Join the Waitlist</h2>
        <form onSubmit={handleWaitlist} className="flex flex-col md:flex-row gap-4 items-center justify-center">
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg bg-[#232946] border border-cyan-700/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={waitlistSuccess}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold shadow hover:opacity-90 disabled:opacity-40"
            disabled={waitlistSuccess}
          >
            {waitlistSuccess ? 'Joined!' : 'Join Waitlist'}
          </button>
        </form>
        {waitlistSuccess && (
          <div className="mt-4 text-green-300 text-center">Thank you! You’re on the list for early access and updates.</div>
        )}
      </section>

      {/* Wallet Tech Showcase */}
      <section className="w-full max-w-3xl mb-14 text-center">
        <h2 className="text-xl font-bold mb-4 text-cyan-300">Seamless Supra Wallet Generation</h2>
        <p className="text-slate-200 mb-4">Our proprietary wallet engine creates a secure Supra wallet for every NFT purchaser—no browser extension or seed phrase required. Your wallet and NFT are safely held until launch, then you’ll get full access and self-custody options.</p>
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <div className="bg-[#181A2A] rounded-xl p-6 border border-cyan-700/20 shadow w-full md:w-1/2">
            <div className="text-cyan-300 font-mono text-lg mb-2">Supra Wallet Address Example</div>
            <div className="text-white font-mono text-xl break-all">0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0</div>
          </div>
          <div className="bg-[#181A2A] rounded-xl p-6 border border-cyan-700/20 shadow w-full md:w-1/2">
            <div className="text-cyan-300 font-mono text-lg mb-2">How It Works</div>
            <ul className="text-left text-slate-200 text-sm list-disc list-inside">
              <li>Buy an NFT → Wallet is generated instantly</li>
              <li>Wallet and NFT are securely held until MVP launch</li>
              <li>At launch, you get full access and can transfer to self-custody</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full max-w-3xl mb-14">
        <h2 className="text-xl font-bold mb-4 text-cyan-300 text-center">FAQ</h2>
        <div className="space-y-4 text-slate-200">
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">What is ReceiptX?</summary>
            <p className="mt-2">ReceiptX is a next-gen rewards and analytics platform powered by NFTs and Supra blockchain. Upload receipts, earn tokens, and unlock exclusive multipliers.</p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">How does the NFT multiplier work?</summary>
            <p className="mt-2">Each NFT tier grants a lifetime multiplier on all RWT and AIA rewards. The higher the tier, the bigger your boost—forever.</p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">How is my wallet generated and secured?</summary>
            <p className="mt-2">We use enterprise-grade, non-custodial wallet generation. Your wallet is created and stored securely until launch, then you’ll receive full access and can transfer to your own wallet.</p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">When will I get my NFT and wallet?</summary>
            <p className="mt-2">NFTs and wallets are distributed at MVP launch. You’ll get an email with instructions to claim and manage your assets.</p>
          </details>
        </div>
      </section>

      {/* Legal/Disclaimer Section */}
      <section className="w-full max-w-3xl mb-10 text-xs text-slate-400 text-center">
        <p className="mb-2">ReceiptX is a rewards and analytics platform. NFTs are digital collectibles and do not represent equity or securities. All purchases are final. Please read our <a href="/privacy" className="underline text-cyan-300">Privacy Policy</a> and <a href="/terms" className="underline text-cyan-300">Terms of Service</a> before participating.</p>
        <p>Powered by Supra blockchain. Not affiliated with any POS brand unless stated.</p>
      </section>
    </main>
  );
}
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

            <div className="mt-8 flex flex-col gap-4 w-full max-w-xs">
              <Link href="/dashboard">
                <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 transition-all text-xl font-bold shadow-lg">
                  🚀 Start Earning RWT
                </button>
              </Link>
              <Link href="/multipliers">
                <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 transition-all text-xl font-bold shadow-lg">
                  💎 Buy Multipliers
                </button>
              </Link>
            </div>
            <div className="mt-8 w-full max-w-xs">
              <form /* TODO: implement /api/waitlist endpoint */ className="flex flex-col gap-2 items-center">
                <input
                  type="email"
                  placeholder="Get updates & bonuses (email)"
                  className="px-4 py-2 rounded w-full text-black"
                  required
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded font-semibold w-full">
                  Join Updates & Bonuses
                </button>
              </form>
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

