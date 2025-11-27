"use client";

import { useState, useEffect, FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { WalletAutoGenerator } from "../components/WalletAutoGenerator";
const CameraCapture = dynamic(() => import("../components/CameraCapture"), { ssr: false });
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { usePrivy } from "@privy-io/react-auth";

export default function LandingPage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
    // Redirect authenticated users to dashboard
    useEffect(() => {
      if (ready && authenticated) {
        router.push("/dashboard");
      }
    }, [ready, authenticated, router]);
  const [email, setEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [customCodeLoading, setCustomCodeLoading] = useState(false);
  const [customCodeError, setCustomCodeError] = useState<string | null>(null);
  const [customCodeSuccess, setCustomCodeSuccess] = useState(false);
  const [refParam, setRefParam] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) setRefParam(ref);
  }, [searchParams]);

  async function handleWaitlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !receiptFile || !password) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", receiptFile);
    formData.append("user_email", email);
    if (refParam) formData.append("referral_code", refParam);
    formData.append("password", password);

    try {
      await fetch("/api/ocr/process", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Error uploading receipt to OCR endpoint:", err);
    }

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email, referral_code: refParam || null }]);

    if (!error) {
      setWaitlistSuccess(true);
      const emailForRequests = email;
      setEmail("");
      setReceiptFile(null);

      // Wallet generation removed from landing page flow

      if (refParam) {
        try {
          await fetch("/api/referrals/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referral_code: refParam,
              referred_email: emailForRequests,
            }),
          });
        } catch (err) {
          console.error("Error tracking referral:", err);
        }
      }

      try {
        const res = await fetch("/api/referrals/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_email: emailForRequests }),
        });

        const data = await res.json();
        if (data.success && data.referral_code) {
          setReferralCode(data.referral_code);
          setReferralLink(data.referral_link);
        }
      } catch (err) {
        console.error("Error creating referral code:", err);
      }
      setCustomCode("");
      setCustomCodeError(null);
      setCustomCodeSuccess(false);
    } else {
      console.error("Supabase waitlist insert error:", error);
      alert("There was an error joining the waitlist. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white flex flex-col items-center px-4 py-10">

      {/* LOGO */}
      <section className="max-w-3xl w-full text-center mb-6">
        <img src="/logo.svg" alt="ReceiptX Logo" className="w-[340px] md:w-[520px] max-w-full mx-auto drop-shadow-[0_0_45px_rgba(0,230,255,0.7)]" />
      </section>

      {/* WHAT IS RECEIPTX */}
      <section className="w-full max-w-3xl text-center mb-12">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 drop-shadow">What Is ReceiptX?</h2>
        <p className="text-slate-200 leading-relaxed">
          ReceiptX is a next-generation rewards engine and analytics protocol built on the Supra blockchain. Users upload receipts, AI extracts purchase data, and users earn RWT rewards and AIA governance tokens. Businesses gain access to anonymized analytics through our intelligence layer.
        </p>
      </section>

      {/* WAITLIST SIGNUP */}
      <section className="w-full max-w-lg mb-16">
        <h2 className="text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent text-center mb-4 drop-shadow">
          Join the Waitlist for Airdrops, Rewards & Early Access
        </h2>

        <form onSubmit={handleWaitlist} className="flex flex-col gap-4 items-center" encType="multipart/form-data">
                    <span className="text-sm text-slate-300 mb-[-8px]">Upload a photo of your receipt</span>

          <input
            type="email"
            required
            placeholder="Enter your email"
            className="w-full px-4 py-3 rounded-lg bg-[#232946] border border-cyan-700/30 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={waitlistSuccess}
          />

          <input
            type="password"
            required
            placeholder="Create a password (for wallet recovery)"
            className="w-full px-4 py-3 rounded-lg bg-[#232946] border border-cyan-700/30 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={waitlistSuccess}
            minLength={8}
            autoComplete="new-password"
          />


          {/* Camera capture for desktop/mobile */}
          <div className="w-full flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              required={!receiptFile}
              className="w-full px-4 py-3 rounded-lg bg-[#232946] border border-cyan-700/30 text-white"
              onChange={e => setReceiptFile(e.target.files?.[0] || null)}
              disabled={waitlistSuccess}
              aria-label="Upload a photo of your receipt"
              title="Upload a photo of your receipt"
            />
            <span className="text-xs text-slate-400 text-center">or</span>
            <CameraCapture
              onCapture={file => setReceiptFile(file)}
              disabled={waitlistSuccess}
            />
            {receiptFile && (
              <span className="text-green-400 text-xs mt-1">Photo ready for upload: {receiptFile.name}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={waitlistSuccess || loading}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 text-white font-extrabold shadow-lg hover:scale-105 disabled:opacity-40 transition"
          >
            {loading ? "Joining..." : waitlistSuccess ? "Joined!" : "Get Early Access"}
          </button>
        </form>

        {waitlistSuccess && (
          <div className="mt-6 w-full max-w-lg bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] border border-cyan-500/60 text-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <p className="font-extrabold text-2xl mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">🎉 Success! Your receipt was uploaded and you’re on the waitlist.</p>
            <p className="mb-4 text-slate-200">Watch your inbox for updates and rewards.</p>
            {referralLink && (
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block my-2 text-cyan-400 underline break-all hover:text-cyan-300 text-base"
              >
                {referralLink}
              </a>
            )}
            {/* Custom Referral Code Section */}
            {!customCodeSuccess && (
              <form
                className="w-full flex flex-col items-center gap-2 mt-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCustomCodeLoading(true);
                  setCustomCodeError(null);
                  try {
                    const res = await fetch("/api/referrals/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ user_email: email, custom_code: customCode }),
                    });
                    const data = await res.json();
                    if (data.success && data.referral_code) {
                      setReferralCode(data.referral_code);
                      setReferralLink(data.referral_link);
                      setCustomCodeSuccess(true);
                    } else if (data.code_taken) {
                      setCustomCodeError("This code is already taken. Please try another.");
                    } else {
                      setCustomCodeError(data.error || "Unknown error. Please try again.");
                    }
                  } catch (err) {
                    setCustomCodeError("Network error. Please try again.");
                  } finally {
                    setCustomCodeLoading(false);
                  }
                }}
              >
                <label className="text-sm text-slate-300">Want a custom referral code?</label>
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 rounded bg-[#232946] border border-cyan-700/30 text-white"
                    placeholder="Enter custom code (A-Z, 4-16 chars)"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.toUpperCase())}
                    minLength={4}
                    maxLength={16}
                    pattern="[A-Z0-9]+"
                    disabled={customCodeLoading}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-cyan-600 text-white font-bold disabled:opacity-50"
                    disabled={customCodeLoading || !customCode || customCode.length < 4}
                  >
                    {customCodeLoading ? "Checking..." : "Set Code"}
                  </button>
                </div>
                {customCodeError && <div className="text-red-400 text-sm mt-1">{customCodeError}</div>}
                {customCodeSuccess && <div className="text-green-400 text-sm mt-1">Custom code set!</div>}
              </form>
            )}
            {customCodeSuccess && referralLink && (
              <div className="mt-2 text-green-400 text-sm">Your custom referral link:<br /><a href={referralLink} target="_blank" rel="noopener noreferrer" className="underline break-all">{referralLink}</a></div>
            )}
            <div className="my-4 w-full flex flex-col items-center">
              <WalletAutoGenerator />
            </div>
            <button
              className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 text-white font-extrabold shadow-lg hover:scale-105 transition text-lg"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
