'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  password: z.string().min(8, 'Passphrase must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function BusinessLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      const res = await fetch('/api/business/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to sign in');
        return;
      }

      router.replace('/business/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#111827] to-[#0F172A] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ReceiptX Business</p>
            <h1 className="text-3xl font-bold text-white">Portal Login</h1>
          </div>
          <Link href="/landing" className="text-sm text-cyan-300 hover:text-cyan-100">
            Back to site
          </Link>
        </div>

        <p className="text-slate-300 text-sm mb-6">
          Enter the portal passphrase shared with your team to access the proprietary business API analytics.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Portal passphrase</span>
            <input
              type="password"
              {...register('password')}
              className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="••••••••••"
              autoComplete="current-password"
              required
            />
            {errors.password && <span className="text-xs text-red-400">{errors.password.message}</span>}
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 px-4 py-3 font-semibold text-white shadow-lg hover:brightness-105 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Access dashboard'}
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-500">
          Need access? <span className="text-cyan-200">Contact your ReceiptX admin for credentials.</span>
        </div>
      </div>
    </main>
  );
}
