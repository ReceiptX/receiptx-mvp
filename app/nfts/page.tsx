"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import RiskDisclaimer from "../components/RiskDisclaimer";

interface NFTData {
  id: string;
  nft_type: string;
  status: string;
  created_at: string;
  converted_at?: string;
  aia_received?: number;
  metadata?: any;
  nft_catalog: {
    nft_name: string;
    nft_type: string;
    description: string;
    tier: string;
    required_receipts: number;
    convertible_to_aia: boolean;
    aia_value: number;
    image_url?: string;
  };
}

export default function NFTsPage() {
  const router = useRouter();
  const { user, ready, authenticated } = usePrivy();
  
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "converted" | "all">("active");

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (authenticated) {
      fetchNFTs();
    }
  }, [authenticated, filter]);

  async function fetchNFTs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      const email = user?.email?.address;
      const telegramId = (user as any)?.telegram?.userId;
      const walletAddress = user?.wallet?.address;
      
      if (email) params.set("user_email", email);
      if (telegramId) params.set("telegram_id", telegramId.toString());
      if (walletAddress) params.set("wallet_address", walletAddress);
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/nfts/list?${params}`);
      const data = await res.json();

      if (data.success) {
        setNfts(data.nfts || []);
      } else {
        setError(data.error || "Failed to load NFTs");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConvert(nftId: string, aiaValue: number) {
    if (!confirm(`Convert this NFT to ${aiaValue} AIA tokens? This action cannot be undone.`)) {
      return;
    }

    try {
      setConverting(nftId);
      const res = await fetch("/api/nfts/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nft_id: nftId,
          user_email: user?.email?.address,
          telegram_id: (user as any)?.telegram?.userId,
          wallet_address: user?.wallet?.address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully converted NFT to ${data.aia_received} AIA!`);
        fetchNFTs(); // Refresh list
      } else {
        alert(data.error || "Conversion failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConverting(null);
    }
  }

  function getTierColor(tier: string) {
    switch (tier.toLowerCase()) {
      case "bronze": return "from-orange-600 to-amber-700";
      case "silver": return "from-gray-400 to-gray-600";
      case "gold": return "from-yellow-400 to-yellow-600";
      case "premium": return "from-purple-500 to-pink-600";
      default: return "from-blue-500 to-indigo-600";
    }
  }

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Risk Disclaimer */}
        <RiskDisclaimer />
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My NFT Collection</h1>
            <p className="text-gray-600">Collect NFTs by scanning receipts and convert them to AIA tokens</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter("active")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === "active"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Active NFTs
          </button>
          <button
            onClick={() => setFilter("converted")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === "converted"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Converted
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            All NFTs
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No NFTs Yet</h3>
            <p className="text-gray-600 mb-6">
              Keep scanning receipts to unlock milestone NFTs!
            </p>
            <button
              onClick={() => router.push("/receipts/scan")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Scan Your First Receipt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <div
                key={nft.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
              >
                <div className={`h-48 bg-gradient-to-br ${getTierColor(nft.nft_catalog.tier)} p-6 flex flex-col justify-between`}>
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                      {nft.nft_catalog.tier} Tier
                    </span>
                    {nft.status === "converted" && (
                      <span className="px-3 py-1 bg-green-500/80 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                        Converted
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-1">{nft.nft_catalog.nft_name}</h3>
                    <p className="text-white/90 text-sm">
                      {nft.nft_catalog.required_receipts} receipts required
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-4">{nft.nft_catalog.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">AIA Value:</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {nft.nft_catalog.aia_value} AIA
                    </span>
                  </div>

                  {nft.status === "active" && nft.nft_catalog.convertible_to_aia && (
                    <button
                      onClick={() => handleConvert(nft.id, nft.nft_catalog.aia_value)}
                      disabled={converting === nft.id}
                      className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {converting === nft.id ? "Converting..." : "Convert to AIA"}
                    </button>
                  )}

                  {nft.status === "converted" && (
                    <div className="text-center text-sm text-gray-500">
                      Converted on {new Date(nft.converted_at!).toLocaleDateString()}
                      <br />
                      Received: {nft.aia_received} AIA
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-400">
                    Earned: {new Date(nft.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
