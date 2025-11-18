import { NextResponse } from "next/server";
import { DropifyBusinessAPI } from "@/lib/proprietary/businessAPI";
import { Web2Web3Bridge } from "@/lib/proprietary/web2web3Bridge";
import { TokenDistributor } from "@/lib/proprietary/tokenDistributor";

const api = new DropifyBusinessAPI();
const bridge = new Web2Web3Bridge();
const distributor = new TokenDistributor();

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
