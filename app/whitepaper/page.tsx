import React from 'react';

export const metadata = {
  title: 'ReceiptX Whitepaper',
  description: 'ReceiptX protocol whitepaper: rewards, staking, and NFT mechanics.'
}

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white flex flex-col items-center px-6 py-10">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="ReceiptX Logo" className="w-[280px] md:w-[400px] max-w-full drop-shadow-[0_0_45px_rgba(0,230,255,0.7)]" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-center mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">
          ReceiptX Whitepaper
        </h1>
        <p className="text-slate-300 text-center mb-10 max-w-2xl mx-auto">
          Welcome — this page contains the technical summary of the ReceiptX protocol. Download the full PDF or read the executive summary below.
        </p>

        {/* Executive Summary Card */}
        <section className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-cyan-700/20 shadow-xl mb-8">
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Executive Summary
          </h2>
          <p className="text-slate-200 leading-relaxed mb-4">
            ReceiptX is a next-generation rewards and analytics platform that mints RWT (Reward Tokens) and AIA (Analytics Intelligence Access) tokens for verified receipts and awards milestone NFTs. 
          </p>
          <p className="text-slate-200 leading-relaxed">
            The protocol focuses on privacy-preserving analytics, deterministic multi-tenant wallet generation, and frictionless rewards for users while providing businesses access to anonymized consumer insights through our intelligence layer.
          </p>
        </section>

        {/* Key Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-cyan-700/20">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">🪙 Dual-Token Economy</h3>
            <p className="text-slate-300 text-sm">RWT for rewards, AIA for governance and analytics access with staking-based tier multipliers.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-cyan-700/20">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">🎨 Auto-Minting NFTs</h3>
            <p className="text-slate-300 text-sm">Milestone NFTs at 5, 15, 40, and 100 receipts, plus brand-specific "Warrior" NFTs.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-cyan-700/20">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">🔐 Multi-Tenant Wallets</h3>
            <p className="text-slate-300 text-sm">Deterministic wallet generation from user_id with AES-256-GCM encryption.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-cyan-700/20">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">📊 Privacy-First Analytics</h3>
            <p className="text-slate-300 text-sm">Anonymized receipt data for business intelligence without compromising user privacy.</p>
          </div>
        </div>

        {/* Download Section */}
        <section className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 backdrop-blur-sm p-8 rounded-2xl border border-cyan-700/30 text-center">
          <h3 className="text-xl font-bold mb-3">📄 Download Full Whitepaper</h3>
          <p className="text-slate-300 mb-6">
            Access the complete technical documentation including tokenomics, architecture diagrams, and roadmap.
          </p>
          <a 
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 rounded-xl text-white font-extrabold shadow-lg hover:scale-105 transition" 
            href="/whitepaper.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            📥 Open PDF
          </a>
        </section>

        {/* Back to Home Link */}
        <div className="text-center mt-8">
          <a href="/" className="text-cyan-400 hover:text-cyan-300 underline transition">
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  )
}
