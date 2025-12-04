'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';

const INITIAL_FORM = {
  business_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  monthly_transactions: '',
  integration_preference: '',
  message: '',
};

type FormState = typeof INITIAL_FORM;

type ApiResponse = {
  success: boolean;
  error?: string;
};

export default function BusinessSignupPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/business/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) {
        setResult({ success: false, error: data.error || 'Submission failed' });
        setSubmitting(false);
        return;
      }

      setResult({ success: true });
      setForm(INITIAL_FORM);
    } catch (error: any) {
      setResult({ success: false, error: error?.message || 'Unexpected error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#111827] to-[#1E1B4B] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow">Partner with ReceiptX</h1>
          <p className="mt-4 text-slate-300">
            Share a few details and our team will fast-track your access to aggregated consumer insights and incentive tooling.
          </p>
        </div>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Business Name *</span>
                <input
                  required
                  value={form.business_name}
                  onChange={updateField('business_name')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Acme Coffee Co."
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Contact Name</span>
                <input
                  value={form.contact_name}
                  onChange={updateField('contact_name')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Jordan Michaels"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Contact Email *</span>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={updateField('contact_email')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="ops@acmecoffee.com"
                  autoComplete="email"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Phone</span>
                <input
                  value={form.contact_phone}
                  onChange={updateField('contact_phone')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="+1 (555) 123-4567"
                  autoComplete="tel"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Website</span>
                <input
                  type="url"
                  value={form.website}
                  onChange={updateField('website')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="https://acmecoffee.com"
                  autoComplete="url"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Monthly Transactions</span>
                <input
                  value={form.monthly_transactions}
                  onChange={updateField('monthly_transactions')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="e.g. 5k - 10k receipts"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm uppercase tracking-wide text-slate-400">Preferred Integration</span>
                <input
                  value={form.integration_preference}
                  onChange={updateField('integration_preference')}
                  className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="e.g. Shopify, Square, custom API"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm uppercase tracking-wide text-slate-400">How can we help?</span>
              <textarea
                value={form.message}
                onChange={updateField('message')}
                className="min-h-[140px] rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Tell us about your customer engagement goals, technical requirements, or questions."
              />
            </label>

            {result && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  result.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/40 bg-red-500/10 text-red-200'
                }`}
              >
                {result.success
                  ? 'Thanks! We received your request and will reach out within one business day.'
                  : result.error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Request Access'}
            </button>
          </form>
        </section>

        <div className="mt-10 flex flex-col items-center gap-3 text-slate-300">
          <p>Want to see live insights?</p>
          <Link
            href="/business/dashboard"
            className="rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-300 hover:text-cyan-100"
          >
            View the Business Analytics Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
