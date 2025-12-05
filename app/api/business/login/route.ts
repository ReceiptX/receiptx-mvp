import { NextResponse } from "next/server";
import { BUSINESS_SESSION_COOKIE, constantTimeEquals, createBusinessSession } from "@/lib/businessPortalAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password: string | undefined = body?.password;

  const expected = process.env.BUSINESS_PORTAL_PASSWORD || process.env.BUSINESS_API_KEY;
  if (!expected) {
    return NextResponse.json({ success: false, error: "Portal secret not configured" }, { status: 500 });
  }

  if (!password || !constantTimeEquals(password, expected)) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const { token, payload } = createBusinessSession("business-admin");

  const response = NextResponse.json({
    success: true,
    expires_at: new Date(payload.exp).toISOString(),
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
