"use client";

import { useState } from "react";
import Image from "next/image";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "demo1234";

export default function AdminAnalyticsPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      fetchAnalytics();
    } else {
      setError("Incorrect password");
    }
  };

  async function fetchAnalytics() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946]">
        <Image src="/logo.svg" alt="ReceiptX Logo" width={220} height={80} className="mb-8" />
        <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-xl shadow-lg flex flex-col items-center w-full max-w-xs">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Analytics Login</h1>
          <input
            type="password"
            className="w-full px-4 py-2 rounded bg-[#232946] border border-cyan-700/30 text-white mb-4"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full px-4 py-2 rounded bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 text-white font-bold shadow">Login</button>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        </form>
      </div>
    );
  }

  // Export handlers
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Brand", "Receipts", "RWT Earned"],
      ...data.brandStats.map((b: any) => [b.brand, b.count, b.rwt])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receiptX-analytics-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receiptX-analytics-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Image src="/logo.svg" alt="ReceiptX Logo" width={120} height={40} />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ReceiptX Analytics Dashboard</h1>
        </div>
        {loading && <div className="text-white text-lg">Loading analytics...</div>}
        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
        {data && (
          <div className="flex gap-4 mb-6">
            <button onClick={handleExportCSV} className="px-4 py-2 rounded bg-cyan-600 text-white font-bold shadow hover:bg-cyan-500">Export CSV</button>
            <button onClick={handleExportJSON} className="px-4 py-2 rounded bg-purple-600 text-white font-bold shadow hover:bg-purple-500">Export JSON</button>
          </div>
        )}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 p-6 rounded-xl text-center">
              <h2 className="text-lg font-bold text-cyan-300 mb-2">Total Receipts</h2>
              <p className="text-4xl font-extrabold text-white">{data.totalReceipts}</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl text-center">
              <h2 className="text-lg font-bold text-cyan-300 mb-2">Total RWT Earned</h2>
              <p className="text-4xl font-extrabold text-green-400">{data.totalRWT}</p>
            </div>
            <div className="bg-white/10 p-6 rounded-xl text-center">
              <h2 className="text-lg font-bold text-cyan-300 mb-2">Total AIA Earned</h2>
              <p className="text-4xl font-extrabold text-blue-400">{data.totalAIA}</p>
            </div>
          </div>
        )}
        {data && (
          <div className="bg-white/10 p-6 rounded-xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Brand Breakdown</h2>
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="text-cyan-300 font-semibold">Brand</th>
                  <th className="text-cyan-300 font-semibold">Receipts</th>
                  <th className="text-cyan-300 font-semibold">RWT Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.brandStats.map((brand: any) => (
                  <tr key={brand.brand} className="bg-[#232946] text-white">
                    <td className="py-2 px-4 font-bold">{brand.brand}</td>
                    <td className="py-2 px-4">{brand.count}</td>
                    <td className="py-2 px-4">{brand.rwt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Add more charts/visuals as needed */}
      </div>
    </div>
  );
}
