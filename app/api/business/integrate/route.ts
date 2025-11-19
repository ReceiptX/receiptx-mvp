import { NextResponse } from "next/server";

// Optional proprietary integrations (only if files exist locally)
let DropifyBusinessAPI: any = null;
let Web2Web3Bridge: any = null;
let TokenDistributor: any = null;
let api: any = null;
let bridge: any = null;
let distributor: any = null;

try {
  DropifyBusinessAPI = require("@/lib/proprietary/businessAPI").DropifyBusinessAPI;
  Web2Web3Bridge = require("@/lib/proprietary/web2web3Bridge").Web2Web3Bridge;
  TokenDistributor = require("@/lib/proprietary/tokenDistributor").TokenDistributor;
  api = new DropifyBusinessAPI();
  bridge = new Web2Web3Bridge();
  distributor = new TokenDistributor();
} catch (e) {
  console.log("ℹ️ Business integration disabled (proprietary modules not found)");
}

export async function POST(req: Request) {
  try {
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
