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
      {/* Top Nav */}
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur border-b border-white/10 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            ReceiptX
          </div>
          <Link
            href="/"
            className="text-sm text-cyan-300 hover:text-cyan-200 transition"
          >
            Back to App →
          </Link>
        </div>
      </header>

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
              into tokenized rewards.
            </h1>

            <p className="mt-4 text-slate-300 text-lg">
              AI-powered OCR + Web3 loyalty rails = new value for users and real-time analytics for businesses.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="#investor"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-900 font-semibold shadow-lg shadow-cyan-500/30"
              >
                Investor Overview
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
            className="relative h-[320px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur"
          >
            <div className="absolute inset-0 rounded-3xl blur-3xl bg-gradient-to-tr from-cyan-500/30 to-violet-500/30" />
            <div className="relative p-6 flex flex-col justify-between h-full">
              <h3 className="text-lg font-semibold text-cyan-300">
                ReceiptX Flow
              </h3>
              <ul className="text-sm text-slate-300 space-y-3">
                <li>📸 Upload a receipt (web or Telegram)</li>
                <li>🤖 OCR extracts store, total, and items</li>
                <li>⚡ RWT tokens automatically calculated</li>
                <li>📊 Brand partners access anonymized analytics</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Investor Section */}
      <section
        id="investor"
        className="max-w-6xl mx-auto px-4 pb-20 space-y-12"
      >
        <motion.div variants={fadeInUp} initial="initial" whileInView="animate">
          <h2 className="text-3xl font-semibold">Investor / Grant Overview</h2>
          <p className="text-slate-300 max-w-3xl mt-2">
            Structured to answer exactly what accelerators, partners, and
            early-stage investors want to evaluate.
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

const INVEST_CARDS = [
  {
    title: "1. Executive Summary",
    points: [
      "ReceiptX tokenizes real-world transactions (RWT) using AI OCR.",
      "Users earn RWT for validated receipts; businesses get anonymized insights.",
      "Chain-agnostic Web3 loyalty rails with frictionless, seedless wallets.",
    ],
  },
  {
    title: "2. Business Model",
    points: [
      "B2B analytics dashboard (subscription tiers).",
      "Paid brand multipliers (Starbucks, Circle K, Dr Pepper).",
      "Telegram Stars purchase system for user multipliers.",
      "Analytics API for enterprise partners.",
    ],
  },
  {
    title: "3. Dual Tokenomics (RWT + AIA)",
    points: [
      "RWT = reward token earned per receipt.",
      "AIA = analytics governance/value token.",
      "Brand campaigns partially convert spend into AIA.",
    ],
  },
  {
    title: "4. Roadmap",
    points: [
      "Pilot AI OCR + receipt parsing (DONE).",
      "Wallet integration + Supabase rewards tracking (IN PROGRESS).",
      "Business analytics dashboard v1.",
      "Brand partnership pilot program.",
    ],
  },
  {
    title: "5. Compliance",
    points: [
      "Zero PII stored — no names, card numbers, or addresses.",
      "Analytics aggregated at the store/product level only.",
      "Self-custodial wallets without seed phrases.",
    ],
  },
  {
    title: "6. Use of Funds",
    points: [
      "Improve OCR accuracy + SKU rebate matching.",
      "Analytics dashboard expansion.",
      "Brand acquisition + campaign integrations.",
      "Security review + smart contract audits.",
    ],
  },
];
