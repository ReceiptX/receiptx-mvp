"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

interface Receipt {
  id: string;
  brand: string;
  amount: number;
  rwt_earned: number;
  multiplier: number;
  created_at: string;
  image_url?: string;
  brand_multiplier?: number;
  ocr_status?: "completed" | "processing" | "failed" | string;
}

export default function ReceiptHistoryPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  const fetchReceipts = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const email = user?.email?.address;
      const telegramId = user?.telegram?.telegramUserId;

      if (!email && !telegramId) {
        throw new Error("User identifier required to fetch receipts.");
      }

      const params = new URLSearchParams({ limit: "100" });
      if (email) {
        params.append("email", email);
      } else if (telegramId) {
        params.append("telegram_id", telegramId);
      }

      const response = await fetch(`/api/receipts/history?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch receipts");
      }

      const data = (await response.json()) as { receipts?: Receipt[] };
      setReceipts(data.receipts ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load receipts";
      console.error("Error fetching receipts:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authenticated && user) {
      void fetchReceipts();
    }
  }, [authenticated, fetchReceipts, user]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen rx-body flex items-center justify-center">
        <div className="text-white text-xl">Loading receipts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen rx-body flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 text-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={() => void fetchReceipts()} className="mt-4 rx-btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRwt = receipts.reduce((sum, r) => sum + (r.rwt_earned || 0), 0);
  const totalSpent = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="min-h-screen rx-body p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Receipt History</h1>
            <p className="text-gray-300">{receipts.length} receipts scanned</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              ← Back
            </button>
            <button
              onClick={() => router.push("/receipts/scan")}
              className="rx-btn-primary"
            >
              Scan Receipt
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rx-card">
            <h3 className="text-sm text-gray-300 mb-2">Total Receipts</h3>
            <p className="text-4xl font-bold text-white">{receipts.length}</p>
          </div>
          <div className="rx-card">
            <h3 className="text-sm text-gray-300 mb-2">Total RWT Earned</h3>
            <p className="text-4xl font-bold text-green-400">{totalRwt.toLocaleString()}</p>
          </div>
          <div className="rx-card">
            <h3 className="text-sm text-gray-300 mb-2">Total Spent</h3>
            <p className="text-4xl font-bold text-blue-400">${totalSpent.toFixed(2)}</p>
          </div>
        </div>

        {/* Receipts List */}
        <div className="rx-card">
          {receipts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-xl mb-4">No receipts yet</p>
              <button
                onClick={() => router.push("/receipts/scan")}
                className="rx-btn-primary"
              >
                Scan Your First Receipt
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="rx-card hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {receipt.brand}
                        </h3>
                        {(receipt.brand_multiplier ?? 1) > 1 && (
                          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-semibold">
                            {receipt.brand_multiplier}x Multiplier
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            receipt.ocr_status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : receipt.ocr_status === "processing"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {receipt.ocr_status ?? "unknown"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Amount</p>
                          <p className="text-white font-semibold">${receipt.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">RWT Earned</p>
                          <p className="text-green-400 font-semibold">
                            +{receipt.rwt_earned}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Receipt Date</p>
                          <p className="text-white font-semibold">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Scanned</p>
                          <p className="text-white font-semibold">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
