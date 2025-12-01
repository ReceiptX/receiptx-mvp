import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    // Preserve query params when redirecting to /landing
    const origin = req.nextUrl.origin;
    const search = req.nextUrl.search || "";
    const destination = new URL(`/landing${search}`, origin);
    return NextResponse.redirect(destination, 307);
  } catch (err) {
    return NextResponse.redirect(new URL('/landing', req.nextUrl.origin), 307);
  }
}
