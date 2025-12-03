import { supabaseService } from "@/lib/supabaseServiceClient";

export type UserIdentity = {
  user_email?: string;
  telegram_id?: string;
  wallet_address?: string;
};

type AgentFetchResult<T = any> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function ensureIdentity(identity: UserIdentity): Required<UserIdentity> {
  const hasIdentifier = identity.user_email || identity.telegram_id || identity.wallet_address;
  if (!hasIdentifier) {
    throw new Error("At least one user identifier (email, telegram_id, or wallet_address) is required");
  }
  return {
    user_email: identity.user_email,
    telegram_id: identity.telegram_id,
    wallet_address: identity.wallet_address,
  } as Required<UserIdentity>;
}

function buildParams(identity: UserIdentity): URLSearchParams {
  const params = new URLSearchParams();
  if (identity.user_email) params.set("user_email", identity.user_email);
  if (identity.telegram_id) params.set("telegram_id", identity.telegram_id);
  if (identity.wallet_address) params.set("wallet_address", identity.wallet_address);
  return params;
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<AgentFetchResult<T>> {
  const res = await fetch(url, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: res.ok ? undefined : (data as any)?.error || res.statusText,
  };
}

export async function getUserSnapshot(identity: UserIdentity) {
  const id = ensureIdentity(identity);
  const params = buildParams(id);
  const base = DEFAULT_BASE_URL.replace(/\/$/, "");

  const endpoints = {
    balance: `${base}/api/rewards/balance?${params.toString()}`,
    stats: `${base}/api/stats/comprehensive?${params.toString()}`,
    nfts: `${base}/api/nfts/list?${params.toString()}&status=active`,
    receipts: `${base}/api/receipts/history?${params.toString()}&limit=5`,
    multiplier: `${base}/api/multipliers/active?${params.toString()}`,
    referral: `${base}/api/referrals/create?${params.toString()}`,
  };

  const [balance, stats, nfts, receipts, multiplier, referral] = await Promise.all([
    fetchJson(endpoints.balance),
    fetchJson(endpoints.stats),
    fetchJson(endpoints.nfts),
    fetchJson(endpoints.receipts),
    fetchJson(endpoints.multiplier),
    fetchJson(endpoints.referral),
  ]);

  return {
    balance,
    stats,
    nfts,
    receipts,
    multiplier,
    referral,
    identity: id,
  };
}

export async function createReferralLink(identity: UserIdentity) {
  const id = ensureIdentity(identity);
  const base = DEFAULT_BASE_URL.replace(/\/$/, "");
  return fetchJson(`${base}/api/referrals/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(id),
  });
}

export async function stakeAIA(identity: UserIdentity, amount: number) {
  const id = ensureIdentity(identity);
  const base = DEFAULT_BASE_URL.replace(/\/$/, "");
  return fetchJson(`${base}/api/staking/stake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...id, amount }),
  });
}

export async function unstakeAIA(identity: UserIdentity, amount: number) {
  const id = ensureIdentity(identity);
  const base = DEFAULT_BASE_URL.replace(/\/$/, "");
  return fetchJson(`${base}/api/staking/unstake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...id, amount }),
  });
}

export async function convertNFT(identity: UserIdentity, nft_id: string) {
  const id = ensureIdentity(identity);
  const base = DEFAULT_BASE_URL.replace(/\/$/, "");
  return fetchJson(`${base}/api/nfts/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...id, nft_id }),
  });
}

export async function listFraudSignals(receipt_id: string) {
  if (!receipt_id) {
    throw new Error("receipt_id is required");
  }

  const { data, error } = await supabaseService
    .from("receipts")
    .select("id, brand, amount, fraud_score, validation_status, fraud_indicators, receipt_hash, created_at")
    .eq("id", receipt_id)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, data: null, error: error.message };
  }

  return { ok: true, status: 200, data };
}

// Placeholder for future: trigger a reprocess using stored receipt data.
export async function requestReceiptReprocess(receipt_id: string) {
  if (!receipt_id) throw new Error("receipt_id is required");
  // Implementation idea: fetch receipt row to get storage URL, then post back into OCR pipeline.
  return { ok: false, status: 501, data: null, error: "Reprocess flow not yet implemented" };
}
