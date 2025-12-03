'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Reward {
  id: string;
  business_name: string;
  business_email?: string;
  title: string;
  description: string;
  category_id?: string;
  rwt_cost: number;
  original_value?: number;
  terms?: string;
  redemption_instructions?: string;
  total_stock?: number;
  claimed_count: number;
  max_per_user: number;
  is_active: boolean;
  featured: boolean;
  priority: number;
  starts_at: string;
  expires_at?: string;
  tags?: string[];
  created_at: string;
  reward_categories?: Category;
}

export default function BusinessRewardsPortal() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    business_email: '',
    title: '',
    description: '',
    category_id: '',
    rwt_cost: 50,
    original_value: 5.00,
    terms: '',
    redemption_instructions: '',
    total_stock: null as number | null,
    max_per_user: 1 as number | null,
    featured: false,
    priority: 0,
    expires_at: '',
    tags: [] as string[],
  });

  useEffect(() => {
    fetchCategories();
    fetchRewards();
  }, []);

  async function fetchCategories() {
    const res = await fetch('/api/rewards/categories');
    const data = await res.json();
    if (data.success) {
      setCategories(data.categories);
    }
  }

  async function fetchRewards() {
    setLoading(true);
    const res = await fetch('/api/business/rewards/list');
    const data = await res.json();
    if (data.success) {
      setRewards(data.rewards);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const endpoint = editingReward ? '/api/business/rewards/update' : '/api/business/rewards/create';
    const method = editingReward ? 'PATCH' : 'POST';

    const payload = editingReward
      ? { id: editingReward.id, ...formData }
      : formData;

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      alert(editingReward ? '✅ Reward updated!' : '✅ Reward created!');
      resetForm();
      fetchRewards();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingReward(null);
    setFormData({
      business_name: '',
      business_email: '',
      title: '',
      description: '',
      category_id: '',
      rwt_cost: 50,
      original_value: 5.00,
      terms: '',
      redemption_instructions: '',
      total_stock: null,
      max_per_user: 1,
      featured: false,
      priority: 0,
      expires_at: '',
      tags: [],
    });
  }

  function handleEdit(reward: Reward) {
    setEditingReward(reward);
    setFormData({
      business_name: reward.business_name,
      business_email: reward.business_email || '',
      title: reward.title,
      description: reward.description,
      category_id: reward.category_id || '',
      rwt_cost: reward.rwt_cost,
      original_value: reward.original_value || 0,
      terms: reward.terms || '',
      redemption_instructions: reward.redemption_instructions || '',
      total_stock: reward.total_stock || null,
      max_per_user: reward.max_per_user || null,
      featured: reward.featured,
      priority: reward.priority,
      expires_at: reward.expires_at ? new Date(reward.expires_at).toISOString().slice(0, 16) : '',
      tags: reward.tags || [],
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this reward? (It will be marked as inactive)')) return;

    const res = await fetch(`/api/business/rewards/delete?id=${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      alert('✅ Reward deleted!');
      fetchRewards();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  }

  async function handleToggleActive(reward: Reward) {
    const res = await fetch('/api/business/rewards/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reward.id, is_active: !reward.is_active }),
    });

    const data = await res.json();

    if (data.success) {
      fetchRewards();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">Business Rewards Portal</h1>
            <p className="text-gray-400">Manage your reward offers and track redemptions</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingReward(null); }}
            className="px-6 py-3 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300 transition"
          >
            {showForm ? '❌ Cancel' : '➕ Create Reward'}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#1F2833] rounded-xl p-6 mb-8 border border-cyan-400/30">
            <h2 className="text-2xl font-bold mb-6">{editingReward ? 'Edit Reward' : 'Create New Reward'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Info */}
              <div>
                <label className="block text-sm mb-2">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Business Email</label>
                <input
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter business email"
                  autoComplete="email"
                />
              </div>

              {/* Reward Details */}
              <div>
                <label className="block text-sm mb-2">Reward Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="e.g., $5 Gift Card"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  title="Select category"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  rows={3}
                  placeholder="Describe the reward..."
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="block text-sm mb-2">RWT Cost *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.rwt_cost}
                  onChange={(e) => setFormData({ ...formData, rwt_cost: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter RWT cost"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Original Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.original_value}
                  onChange={(e) => setFormData({ ...formData, original_value: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter original value"
                />
              </div>

              {/* Inventory */}
              <div>
                <label className="block text-sm mb-2">Total Stock (leave empty for unlimited)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.total_stock || ''}
                  onChange={(e) => setFormData({ ...formData, total_stock: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter total stock"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Max Per User</label>
                <input
                  type="number"
                  min={1}
                  value={formData.max_per_user || ''}
                  onChange={(e) => setFormData({ ...formData, max_per_user: parseInt(e.target.value) || null })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter max per user"
                />
              </div>

              {/* Terms */}
              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  rows={2}
                  placeholder="e.g., Valid for 30 days. Cannot be combined with other offers."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2">Redemption Instructions</label>
                <textarea
                  value={formData.redemption_instructions}
                  onChange={(e) => setFormData({ ...formData, redemption_instructions: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  rows={2}
                  placeholder="e.g., Show code to cashier at checkout."
                />
              </div>

              {/* Settings */}
              <div>
                <label className="block text-sm mb-2">Expires At</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Select expiration date"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Priority (higher = shown first)</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#0B0C10] border border-cyan-400/30 rounded-lg text-white"
                  placeholder="Enter priority"
                />
              </div>

              <div className="flex items-center gap-6 md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span>⭐ Featured</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="px-8 py-3 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300 transition"
              >
                {editingReward ? '💾 Update Reward' : '✅ Create Reward'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Rewards Table */}
        <div className="bg-[#1F2833] rounded-xl p-6 border border-cyan-400/20">
          <h2 className="text-2xl font-bold mb-4">Active Rewards ({rewards.length})</h2>

          {loading ? (
            <p className="text-gray-400">Loading rewards...</p>
          ) : rewards.length === 0 ? (
            <p className="text-gray-400">No rewards created yet. Click "Create Reward" to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-400/20 text-left">
                    <th className="pb-3">Reward</th>
                    <th className="pb-3">Cost</th>
                    <th className="pb-3">Stock</th>
                    <th className="pb-3">Claimed</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="border-b border-cyan-400/10">
                      <td className="py-4">
                        <div className="font-semibold">{reward.title}</div>
                        <div className="text-sm text-gray-400">{reward.business_name}</div>
                        {reward.featured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
                      </td>
                      <td className="py-4">
                        <span className="text-cyan-400 font-semibold">{reward.rwt_cost} RWT</span>
                      </td>
                      <td className="py-4">
                        {reward.total_stock === null ? '∞' : reward.total_stock}
                      </td>
                      <td className="py-4">{reward.claimed_count}</td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleActive(reward)}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            reward.is_active
                              ? 'bg-green-400/20 text-green-400'
                              : 'bg-red-400/20 text-red-400'
                          }`}
                        >
                          {reward.is_active ? '✅ Active' : '❌ Inactive'}
                        </button>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(reward)}
                            className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded hover:bg-cyan-400/30 transition text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(reward.id)}
                            className="px-3 py-1 bg-red-400/20 text-red-400 rounded hover:bg-red-400/30 transition text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
