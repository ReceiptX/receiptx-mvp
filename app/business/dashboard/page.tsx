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

      {loading ? (
        <p>Loading analytics...</p>
      ) : (
        <div className="bg-[#1F2833] p-6 rounded-2xl shadow-xl">
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
