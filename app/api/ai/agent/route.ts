import { NextRequest, NextResponse } from "next/server";
import getUserFromRequest from "@/lib/authEdge";
import { runAgent } from "@/lib/ai/agent";
import { UserIdentity } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const body = await req.json().catch(() => ({}));

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const identity: UserIdentity = body.identity || {};

  if (!user && !identity.user_email && !identity.telegram_id && !identity.wallet_address) {
    return NextResponse.json({ success: false, error: "Authentication or user identity required" }, { status: 401 });
  }

  return runAgent({ messages, identity, user });
}
