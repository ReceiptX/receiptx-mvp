import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    success: true,
    message: "Sentry diagnostics endpoint",
  });
}
