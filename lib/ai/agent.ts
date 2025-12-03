import { NextResponse } from "next/server";
import { getUserSnapshot, stakeAIA, unstakeAIA, convertNFT, listFraudSignals, createReferralLink, requestReceiptReprocess, UserIdentity } from "@/lib/ai/tools";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RunAgentInput = {
  messages: ChatMessage[];
  identity: UserIdentity;
  user?: any;
};

function deriveIdentity(identity: UserIdentity, user?: any): UserIdentity {
  if (identity.user_email || identity.telegram_id || identity.wallet_address) return identity;
  const email = (user as any)?.email;
  const telegram = (user as any)?.telegram_id || (user as any)?.telegram?.userId;
  const wallet = (user as any)?.wallet_address || (user as any)?.wallet?.address;
  return {
    user_email: email || undefined,
    telegram_id: telegram || undefined,
    wallet_address: wallet || undefined,
  };
}

function shortSummary(snapshot: Awaited<ReturnType<typeof getUserSnapshot>>) {
  const rwt = snapshot.balance.data?.rwtBalance ?? 0;
  const aia = snapshot.balance.data?.aiaBalance ?? 0;
  const tier = snapshot.stats.data?.stats?.current_tier || "Bronze";
  const nfts = snapshot.nfts.data?.nfts?.length || 0;
  const multiplier = snapshot.multiplier.data?.active ? `${snapshot.multiplier.data.multiplier}x` : "none";

  return [
    `RWT ${rwt.toLocaleString()}`,
    `AIA ${aia.toLocaleString()}`,
    `Tier ${tier}`,
    `NFTs ${nfts}`,
    `Multiplier ${multiplier}`,
  ].join(" | ");
}

export async function runAgent(input: RunAgentInput) {
  try {
    const identity = deriveIdentity(input.identity || {}, input.user);
    const snapshot = await getUserSnapshot(identity);
    const lastUserMessage = input.messages?.filter(m => m.role === "user").pop();

    // Simple intent hints (non-LLM placeholder): support stake/unstake/convert keywords.
    const text = (lastUserMessage?.content || "").toLowerCase();
    let actionResult: any = null;

    if (text.includes("stake")) {
      const amount = parseInt(text.match(/stake\s+(\d+)/)?.[1] || "0", 10);
      if (amount > 0) {
        actionResult = await stakeAIA(identity, amount);
      }
    } else if (text.includes("unstake")) {
      const amount = parseInt(text.match(/unstake\s+(\d+)/)?.[1] || "0", 10);
      if (amount > 0) {
        actionResult = await unstakeAIA(identity, amount);
      }
    } else if (text.includes("convert nft")) {
      const nftIdMatch = text.match(/convert nft\s+([a-z0-9-]+)/);
      if (nftIdMatch) {
        actionResult = await convertNFT(identity, nftIdMatch[1]);
      }
    } else if (text.includes("fraud") && text.match(/receipt\s+([a-z0-9-]+)/)) {
      const receiptId = text.match(/receipt\s+([a-z0-9-]+)/)?.[1];
      if (receiptId) {
        actionResult = await listFraudSignals(receiptId);
      }
    } else if (text.includes("referral")) {
      actionResult = await createReferralLink(identity);
    }

    const replyLines = ["Snapshot: " + shortSummary(snapshot)];
    if (actionResult) {
      if (actionResult.ok) {
        replyLines.push("Action: success", JSON.stringify(actionResult.data));
      } else {
        replyLines.push("Action: failed - " + (actionResult.error || "unknown error"));
      }
    } else {
      replyLines.push("No action detected. Ask me to stake/unstake AIA, convert NFT <id>, or show fraud for receipt <id>.");
    }

    return NextResponse.json({ success: true, reply: replyLines.join("\n"), snapshot, action: actionResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
