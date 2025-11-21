'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

interface ReceiptStat {
  brand: string;
  total_spent: number;
  avg_multiplier: number;
  receipt_count: number;
}

export default function BusinessDashboard() {
  const [stats, setStats] = useState<ReceiptStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_brand_analytics');
    if (!error && data) setStats(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white p-10">
      <h1 className="text-3xl font-semibold text-cyan-400 mb-6">
        ReceiptX Business Analytics
      </h1>

      {/* POS Integration Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 p-6 rounded-2xl">
          <div className="text-4xl mb-2">🏪</div>
          <h3 className="text-lg font-semibold text-cyan-400 mb-1">POS Integrations</h3>
          <p className="text-3xl font-bold">50+</p>
          <p className="text-sm text-gray-400 mt-1">Platforms Supported</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 p-6 rounded-2xl">
          <div className="text-4xl mb-2">⚡</div>
          <h3 className="text-lg font-semibold text-green-400 mb-1">Setup Time</h3>
          <p className="text-3xl font-bold">&lt;5 min</p>
          <p className="text-sm text-gray-400 mt-1">Webhook Integration</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/20 p-6 rounded-2xl">
          <div className="text-4xl mb-2">🔗</div>
          <h3 className="text-lg font-semibold text-purple-400 mb-1">Connected</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-gray-400 mt-1">Active Integrations</p>
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="bg-[#1F2833] p-6 rounded-2xl shadow-xl mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">🔌 Supported POS Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Shopify', 'Square', 'Clover', 'Toast', 'Stripe', 'WooCommerce', 'BigCommerce', 'Lightspeed', 'PayPal', 'Magento'].map((platform) => (
            <div key={platform} className="bg-[#0B0C10] border border-gray-700 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-300">{platform}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-4 text-center">
          + 40 more platforms. See <a href="/POS_INTEGRATION_GUIDE.md" className="text-cyan-400 underline">integration guide</a>
        </p>
      </div>

      {/* Analytics Chart */}
      {loading ? (
        <p>Loading analytics...</p>
      ) : (
        <div className="bg-[#1F2833] p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Brand Performance</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="brand" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Bar dataKey="total_spent" fill="#00FFFF" name="Total Spent" />
              <Bar dataKey="avg_multiplier" fill="#FF69B4" name="Avg Multiplier" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </main>
  );
}
