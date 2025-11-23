"use client";

import Link from "next/link";

export default function MultipliersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-100 via-yellow-300 to-orange-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white/80 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        <h1 className="text-4xl font-bold text-yellow-700 mb-4 text-center">Buy Multipliers</h1>
        <p className="text-lg text-yellow-800 mb-6 text-center">
          Boost your RWT earnings! Purchase a multiplier to increase your rewards for every receipt you scan.
        </p>
        <div className="flex flex-col gap-4 w-full mb-6">
          <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 transition-all text-xl font-bold shadow-lg">
            🔥 1.5x Multiplier – $2.99
            <span className="block mt-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-base mt-2"
                onClick={() => window.Telegram?.WebApp?.openInvoice && window.Telegram.WebApp.openInvoice({slug: 'multiplier_1_5x'})}
              >
                Buy with Telegram Stars
              </button>
            </span>
          </button>
          <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:opacity-90 transition-all text-xl font-bold shadow-lg">
            🚀 2x Multiplier – $4.99
            <span className="block mt-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-base mt-2"
                onClick={() => window.Telegram?.WebApp?.openInvoice && window.Telegram.WebApp.openInvoice({slug: 'multiplier_2x'})}
              >
                Buy with Telegram Stars
              </button>
            </span>
          </button>
          <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-700 hover:opacity-90 transition-all text-xl font-bold shadow-lg">
            💎 3x Multiplier – $9.99
            <span className="block mt-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-base mt-2"
                onClick={() => window.Telegram?.WebApp?.openInvoice && window.Telegram.WebApp.openInvoice({slug: 'multiplier_3x'})}
              >
                Buy with Telegram Stars
              </button>
            </span>
          </button>
        </div>
        <div className="text-center text-yellow-900 text-sm mb-4">
          <p>Multipliers apply instantly and last for 30 days.<br />
            <span className="font-semibold">More multipliers, more rewards!</span>
          </p>
        </div>
        <Link href="/dashboard">
          <button className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded font-semibold w-full">
            Back to Dashboard
          </button>
        </Link>
      </div>
    </main>
  );
}
