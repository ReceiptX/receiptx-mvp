"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready) setLoading(false);
  }, [ready]);

  // Auto-redirect root '/'
  if (typeof window !== "undefined" && window.location.pathname === "/") {
    if (authenticated) {
      redirect("/dashboard");
    } else {
      redirect("/landing");
    }
  }

  const Logo = () => (
    <div className="flex justify-center mb-8">
      <Image
        src="/logo.svg"
        alt="ReceiptX Logo"
        width={360}
        height={160}
        priority
        className="drop-shadow-[0_0_30px_rgba(0,230,255,0.65)]"
      />
    </div>
  );

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-[#C9D2E5] px-4">
        <Logo />
        <p className="text-[#00E6FF] animate-pulse">Initializing ReceiptX...</p>
      </main>
    );
  }

  // ---------------------------
  // NOT AUTHENTICATED
  // ---------------------------
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-[#C9D2E5] px-4">
        <Logo />

        <p className="text-[#C9D2E5] text-center mb-10 text-lg">
          Turn your everyday receipts into crypto rewards ⚡
        </p>

        <button
          onClick={login}
          className="
            px-10 py-4 rounded-xl text-lg font-semibold text-white
            bg-[linear-gradient(90deg,#00E6FF,#7A5CFF,#D048FF)]
            shadow-[0_0_24px_rgba(0,230,255,0.55)]
            hover:scale-[1.03] active:scale-[0.98]
            transition-transform transition-shadow
          "
        >
          Continue with Email
        </button>
      </main>
    );
  }

  // ---------------------------
  // AUTHENTICATED
  // ---------------------------
  const email = user?.email?.address || "";
  const wallet = user?.wallet?.address || "";
  const userDisplay = email || wallet || "User";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-[#C9D2E5] px-4">
      <Logo />

      <h1 className="text-3xl font-extrabold text-[#00E6FF] mb-3 drop-shadow-[0_0_15px_rgba(0,230,255,0.6)]">
        Welcome back, {userDisplay} 👋
      </h1>

      <p className="text-[#C9D2E5] mb-10 text-center">
        Manage your rewards, analytics, and AI-powered insights.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl text-center font-medium text-white
          bg-[linear-gradient(90deg,#7A5CFF,#D048FF)]
          hover:opacity-90 transition-opacity"
        >
          🏠 My Dashboard
        </Link>

        <Link
          href="/receipts/scan"
          className="px-6 py-3 rounded-xl text-center font-medium text-black
          bg-[linear-gradient(90deg,#00FFA3,#00C7B7)]
          hover:opacity-90 transition-opacity"
        >
          📸 Scan a Receipt
        </Link>

        <Link
          href="/business/dashboard"
          className="px-6 py-3 rounded-xl text-center font-medium text-white
          bg-[linear-gradient(90deg,#4FB8FF,#7A5CFF)]
          hover:opacity-90 transition-opacity"
        >
          📊 View Analytics
        </Link>

        <Link
          href="/telegram"
          className="px-6 py-3 rounded-xl text-center font-medium text-white
          bg-[linear-gradient(90deg,#D048FF,#FF2BCB)]
          hover:opacity-90 transition-opacity"
        >
          💫 Telegram Mini App
        </Link>

        <button
          onClick={logout}
          className="mt-6 px-4 py-2 rounded-xl border border-[#2E3A4F] text-[#C9D2E5]
          hover:bg-[#141824] transition-colors"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
