import { NextResponse } from "next/server";
import { BUSINESS_SESSION_COOKIE, constantTimeEquals, createBusinessSession } from "@/lib/businessPortalAuth";
import { supabaseService } from "@/lib/supabaseServiceClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password: string | undefined = body?.password;

  const fallback = process.env.BUSINESS_PORTAL_PASSWORD || process.env.BUSINESS_API_KEY;
  if (!password) {
    return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
  }

  // Check per-business portal_pass first
  const { data: access } = await supabaseService
    .from("business_access")
    .select("*")
    .eq("portal_pass", password)
    .eq("status", "active")
    .maybeSingle();

  const now = new Date();
  const allowed =
    access &&
    (!access.starts_at || new Date(access.starts_at) <= now) &&
    (!access.expires_at || new Date(access.expires_at) >= now);

  const matchesFallback = fallback && constantTimeEquals(password, fallback);

  if (!allowed && !matchesFallback) {
    return NextResponse.json({ success: false, error: "Invalid or expired credentials" }, { status: 401 });
  }

  const subject = access?.business_name ? `business:${access.business_name}` : "business-admin";
  const { token, payload } = createBusinessSession(subject);

  const response = NextResponse.json({
    success: true,
    expires_at: new Date(payload.exp).toISOString(),
    business: access?.business_name || null,
  });

  response.cookies.set({
    name: BUSINESS_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor((payload.exp - payload.iat) / 1000),
  });

  return response;
}
