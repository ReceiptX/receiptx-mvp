"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
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
      "Whitelist forever",
    ],
    note: "Lifetime multiplier applies to all receipts.",
    metadata: {
      tier: 3,
      label: "GENESIS",
      art: "genesis.svg",
      commission: 0.08, // 8% resale commission
    },
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
      "Special Discord/Telegram role",
    ],
    note: "2x multiplier applies only to your first 2,000 receipts.",
    metadata: {
      tier: 2,
      label: "POWER USER",
      art: "poweruser.svg",
      commission: 0.07, // 7% resale commission
    },
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
      "Early supporter badge",
    ],
    note: "3x multiplier applies only to your first 750 receipts.",
    metadata: {
      tier: 1,
      label: "EARLY BIRD",
      art: "earlybird.svg",
      commission: 0.05, // 5% resale commission
    },
  },
] as const;

type NftTier = (typeof NFT_TIERS)[number];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [selectedTier, setSelectedTier] = useState<NftTier | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [refParam, setRefParam] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // On mount, check for ?ref= param
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) setRefParam(ref);
  }, [searchParams]);

  // Telegram Stars payment integration
  async function handleTelegramStarsPurchase(tier: NftTier) {
    setSelectedTier(tier);
    setLoading(true);
    try {
      // Call backend to get invoice slug/payload
      const res = await fetch("/api/telegram/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceSlug) {
        alert("Failed to create Telegram invoice.");
        setLoading(false);
        return;
      }
      if (typeof window !== "undefined" && (window as any)?.Telegram?.WebApp?.openInvoice) {
        (window as any).Telegram.WebApp.openInvoice(
          data.invoiceSlug,
          (status: string) => {
            if (status === "paid") {
              // Simulate wallet generation after payment
              const mockWallet = "0x" + Math.random().toString(16).slice(2, 42);
              setWalletAddress(mockWallet);
              setPurchaseSuccess(true);
            } else {
              alert("Payment was not completed.");
            }
            setLoading(false);
          }
        );
      } else {
        alert("Telegram Stars payment is only available in Telegram WebApp.");
        setLoading(false);
      }
    } catch (err) {
      alert("Error initiating Telegram Stars payment.");
      setLoading(false);
    }
  }

  async function handleWaitlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    // 1. Store email in waitlist table, with referral_code if present
    const { error } = await supabase
      .from("waitlist")
      .insert([{ email, referral_code: refParam || null }]);

    if (!error) {
      setWaitlistSuccess(true);
      // Copy email value for referral / wallet calls before clearing
      const emailForRequests = email;
      setEmail("");

      // 2. Generate wallet for this user
      try {
        const walletRes = await fetch("/api/wallet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailForRequests }),
        });
        const walletData = await walletRes.json();
        if (walletData.success && walletData.wallet?.address) {
          setWalletAddress(walletData.wallet.address);
        }
      } catch (_err) {
        // Wallet generation failed, but don't block signup
        setWalletAddress("");
      }

      // 3. Track referral if ?ref= param present
      if (refParam) {
        await fetch("/api/referrals/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referral_code: refParam,
            referred_email: emailForRequests,
          }),
        });
      }

      // 4. Create referral code for this user
      const res = await fetch("/api/referrals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: emailForRequests }),
      });
      const data = await res.json();
      if (data.success && data.referral_code) {
        setReferralCode(data.referral_code);
        setReferralLink(data.referral_link);
      }
    } else {
      alert("There was an error joining the waitlist. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white flex flex-col items-center px-4 py-10">
      {/* Hero Section */}
      <section className="max-w-3xl w-full text-center mb-12">
        <div className="flex justify-center mb-6">
          {/* Brand Logo SVG from public/logo.svg */}
          <img
            src="/logo.svg"
            alt="ReceiptX Logo"
            className="w-60 max-w-xs h-auto drop-shadow-xl object-contain"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 drop-shadow">
          Unlock the Future of Receipts
        </h1>
        <p className="text-lg text-slate-200 mb-6">
          Earn rewards, analytics, and exclusive multipliers with ReceiptX. Join
          the waitlist or become a founding member by purchasing a Lifetime
          Multiplier NFT.
        </p>
      </section>

      {/* NFT Sale Section */}
      <section className="w-full max-w-4xl mb-14">
        <h2 className="text-2xl font-bold mb-6 text-center text-cyan-300">
          Founders NFT Sale
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {NFT_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border-2 shadow-xl p-6 flex flex-col items-center ${tier.background} border-cyan-700/30`}
            >
              <div
                className={`text-4xl mb-2 bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}
              >
                {tier.badge}
              </div>
              <div className="text-xl font-semibold mb-1 flex items-center gap-2">
                {tier.name}
                <span className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 ml-2 uppercase tracking-widest">
                  {tier.rarity}
                </span>
              </div>
              <div className="text-lg font-bold text-cyan-200 mb-1">
                {tier.metadata.label}
              </div>
              <div className="text-2xl font-bold text-cyan-300 mb-2">
                ${tier.price}
              </div>
              <div className="text-sm text-slate-400 mb-2">
                Max {tier.supply} NFTs
              </div>
              <ul className="text-left text-sm text-slate-200 mb-4 list-disc list-inside">
                {tier.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className="text-xs text-pink-400 mb-2 font-semibold">
                {`Resale commission: ${(tier.metadata.commission * 100).toFixed(
                  0
                )}% will be collected on every secondary sale`}
              </div>
              <div className="text-xs text-slate-400 mb-2 italic">
                {tier.note}
              </div>
              <button
                className="mt-auto px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold shadow hover:opacity-90 disabled:opacity-40"
                disabled={loading || purchaseSuccess}
                onClick={() => handleTelegramStarsPurchase(tier)}
              >
                {loading && selectedTier === tier
                  ? "Processing..."
                  : purchaseSuccess && selectedTier === tier
                  ? "Purchased!"
                  : "Buy with Telegram Stars"}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Modal removed: replaced by Telegram Stars payment */}
        {purchaseSuccess && selectedTier && (
          <div className="mt-8 bg-green-900/60 border border-green-500 text-green-100 p-4 rounded-lg text-center max-w-xl mx-auto">
            <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
            <p>
              You’ve secured a {selectedTier.name} and your Supra wallet has
              been generated:
            </p>
            <div className="mt-2 text-cyan-300 font-mono text-lg">
              {walletAddress}
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Your NFT and wallet will be securely held until the MVP launch.
            </p>
          </div>
        )}
      </section>

      {/* Waitlist Section with Referral */}
      <section className="w-full max-w-lg mb-14">
        <h2 className="text-xl font-bold mb-4 text-cyan-300 text-center">
          Join the Waitlist
        </h2>
        <form
          onSubmit={handleWaitlist}
          className="flex flex-col md:flex-row gap-4 items-center justify-center"
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg bg-[#232946] border border-cyan-700/30 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={waitlistSuccess}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold shadow hover:opacity-90 disabled:opacity-40"
            disabled={waitlistSuccess}
          >
            {waitlistSuccess ? "Joined!" : "Join Waitlist"}
          </button>
        </form>

        {waitlistSuccess && (
          <div className="mt-4 text-green-300 text-center">
            <div>
              Thank you! You’re on the list for early access and updates.
            </div>
            {walletAddress && (
              <div className="mt-2">
                <span className="block text-cyan-200">
                  Your Supra wallet address:
                </span>
                <span className="block text-cyan-400 font-mono break-all">
                  {walletAddress}
                </span>
                <span className="block text-xs text-slate-400 mt-1">
                  Your Early Supporter NFT will be airdropped here at launch.
                </span>
              </div>
            )}
            {referralLink && (
              <div className="mt-4">
                <span className="block text-cyan-200">
                  Your referral link:
                </span>
                <span className="block text-cyan-400 font-mono break-all">
                  {referralLink}
                </span>
                <span className="block text-xs text-slate-400 mt-1">
                  Share this link—earn 5-10 AIA for every friend who joins and
                  uploads a receipt!
                </span>
              </div>
            )}
          </div>
        )}

        {refParam && !waitlistSuccess && (
          <div className="mt-2 text-cyan-300 text-center text-xs">
            Referral code detected:{" "}
            <span className="font-mono">{refParam}</span>
          </div>
        )}
      </section>

      {/* Wallet Tech Showcase */}
      <section className="w-full max-w-3xl mb-14 text-center">
        <h2 className="text-xl font-bold mb-4 text-cyan-300">
          Seamless Supra Wallet Generation
        </h2>
        <p className="text-slate-200 mb-4">
          Our proprietary wallet engine creates a secure Supra wallet for every
          NFT purchaser—no browser extension or seed phrase required. Your
          wallet and NFT are safely held until launch, then you’ll get full
          access and self-custody options.
        </p>
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <div className="bg-[#181A2A] rounded-xl p-6 border border-cyan-700/20 shadow w-full md:w-1/2">
            <div className="text-cyan-300 font-mono text-lg mb-2">
              Supra Wallet Address Example
            </div>
            <div className="text-white font-mono text-xl break-all">
              0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0
            </div>
          </div>
          <div className="bg-[#181A2A] rounded-xl p-6 border border-cyan-700/20 shadow w-full md:w-1/2">
            <div className="text-cyan-300 font-mono text-lg mb-2">
              How It Works
            </div>
            <ul className="text-left text-slate-200 text-sm list-disc list-inside">
              <li>Buy an NFT → Wallet is generated instantly</li>
              <li>Wallet and NFT are securely held until MVP launch</li>
              <li>
                At launch, you get full access and can transfer to self-custody
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full max-w-3xl mb-14">
        <h2 className="text-xl font-bold mb-4 text-cyan-300 text-center">
          FAQ
        </h2>
        <div className="space-y-4 text-slate-200">
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">
              What is ReceiptX?
            </summary>
            <p className="mt-2">
              ReceiptX is a next-gen rewards and analytics platform powered by
              NFTs and Supra blockchain. Upload receipts, earn tokens, and
              unlock exclusive multipliers.
            </p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">
              How does the NFT multiplier work?
            </summary>
            <p className="mt-2">
              Each NFT tier grants a lifetime multiplier on all RWT and AIA
              rewards. The higher the tier, the bigger your boost—forever.
            </p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">
              How is my wallet generated and secured?
            </summary>
            <p className="mt-2">
              We use enterprise-grade, non-custodial wallet generation. Your
              wallet is created and stored securely until launch, then you’ll
              receive full access and can transfer to your own wallet.
            </p>
          </details>
          <details className="bg-[#181A2A] rounded-lg p-4 border border-cyan-700/20">
            <summary className="font-semibold text-cyan-300 cursor-pointer">
              When will I get my NFT and wallet?
            </summary>
            <p className="mt-2">
              NFTs and wallets are distributed at MVP launch. You’ll get an
              email with instructions to claim and manage your assets.
            </p>
          </details>
        </div>
      </section>

      {/* Legal/Disclaimer Section */}
      <section className="w-full max-w-3xl mb-10 text-xs text-slate-400 text-center">
        <p className="mb-2">
          ReceiptX is a rewards and analytics platform. NFTs are digital
          collectibles and do not represent equity or securities. All purchases
          are final. Please read our{" "}
          <a href="/privacy" className="underline text-cyan-300">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="underline text-cyan-300">
            Terms of Service
          </a>{" "}
          before participating.
        </p>
        <p>
          Powered by Supra blockchain. Not affiliated with any POS brand unless
          stated.
        </p>
      </section>
    </main>
  );
}


