import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Proprietary integrations are disabled for this deployment target.
let api: any = null;
let bridge: any = null;
let distributor: any = null;

async function initProprietaryModules() {
  // Stub ensures TypeScript is satisfied while keeping deployment safe.
  api = null;
  bridge = null;
  distributor = null;
  return false;
}

export async function POST(req: Request) {
  try {
    // Initialize proprietary modules on first request
    if (!api && !bridge && !distributor) {
      await initProprietaryModules();
    }

    // API Key Authentication
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = process.env.BUSINESS_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing API key" },
        { status: 401 }
      );
    }

    const event = await req.json();

    // Check if proprietary modules are available
    if (!api || !bridge || !distributor) {
      return NextResponse.json(
        { success: false, error: "Business integration not available in this deployment" },
        { status: 503 }
      );
    }

    // 1️⃣ Handle incoming business event
    await api.handleBusinessEvent(event);

    // 2️⃣ Bridge Web2 and Web3 states
    await bridge.transparentTransaction(event);

    // 3️⃣ Trigger token distribution
    const result = await distributor.distribute(event);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
