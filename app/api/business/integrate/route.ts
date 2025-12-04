import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";
export const dynamic = "force-dynamic";

let api: any = null;
let bridge: any = null;
let distributor: any = null;

async function initProprietaryModules() {
  try {
    const [apiModule, bridgeModule, distributorModule] = await Promise.all([
      import("@/lib/proprietary/businessAPI").catch(() => null),
      import("@/lib/proprietary/web2web3Bridge").catch(() => null),
      import("@/lib/proprietary/tokenDistributor").catch(() => null),
    ]);

    api = apiModule?.default ?? apiModule;
    bridge = bridgeModule?.default ?? bridgeModule;
    distributor = distributorModule?.default ?? distributorModule;

    return Boolean(api && bridge && distributor);
  } catch (error) {
    console.warn("proprietary modules unavailable", error);
    api = null;
    bridge = null;
    distributor = null;
    return false;
  }
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
      const contactEmail = event.contact_email || event.email || event.business_email;

      if (!contactEmail) {
        return NextResponse.json(
          { success: false, error: "contact_email is required when integration modules are unavailable" },
          { status: 400 }
        );
      }

      const fallbackPayload = {
        business_name: event.business_name || event.company || "Unknown Business",
        contact_name: event.contact_name || event.name || null,
        contact_email: contactEmail,
        contact_phone: event.contact_phone || event.phone || null,
        website: event.website || event.company_url || null,
        monthly_transactions: event.monthly_transactions || event.transaction_volume || null,
        integration_preference: event.integration_preference || event.preferred_integration || null,
        message: event.message || event.notes || null,
        status: "new",
        source: "integration_api",
        metadata: event,
      };

      const { error: fallbackError } = await supabaseService
        .from("business_signups")
        .insert(fallbackPayload);

      if (fallbackError) {
        console.error("business/integrate fallback insert failed", fallbackError);
        return NextResponse.json(
          { success: false, error: "Failed to queue integration request" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        queued: true,
        message: "Integration request queued for follow-up",
      }, { status: 202 });
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
