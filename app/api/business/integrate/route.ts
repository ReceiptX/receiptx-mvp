import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";

export const dynamic = "force-dynamic";

let api: any = null;
let bridge: any = null;
let distributor: any = null;

async function initProprietaryModules() {
  try {
    const [apiModule, bridgeModule, distributorModule] = await Promise.all([
      import("@/lib/proprietary/businessAPI").catch(() => import("../../../../lib/proprietary/businessAPI").catch(() => null)),
      import("@/lib/proprietary/web2web3Bridge").catch(() => import("../../../../lib/proprietary/web2web3Bridge").catch(() => null)),
      import("@/lib/proprietary/tokenDistributor").catch(() => import("../../../../lib/proprietary/tokenDistributor").catch(() => null)),
    ]);

    api = apiModule && typeof apiModule === "object" && "default" in apiModule ? (apiModule as any).default : apiModule;
    bridge = bridgeModule && typeof bridgeModule === "object" && "default" in bridgeModule ? (bridgeModule as any).default : bridgeModule;
    distributor = distributorModule && typeof distributorModule === "object" && "default" in distributorModule ? (distributorModule as any).default : distributorModule;

    return Boolean(api && bridge && distributor);
  } catch (error) {
    console.warn("proprietary modules unavailable", error);
    api = null;
    bridge = null;
    distributor = null;
    return false;
  }
}

async function queueFallbackSignup(event: any) {
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

export async function POST(req: Request) {
  try {
    if (!api && !bridge && !distributor) {
      await initProprietaryModules();
    }

    const apiKey = req.headers.get("x-api-key");
    const fallbackApiKey = process.env.BUSINESS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing API key" },
        { status: 401 }
      );
    }

    // Validate per-business access with expiry + quota
    const { data: access, error: accessError } = await supabaseService
      .from("business_access")
      .select("*")
      .eq("api_key", apiKey)
      .maybeSingle();

    const now = new Date();
    const active =
      access &&
      access.status === "active" &&
      (!access.starts_at || new Date(access.starts_at) <= now) &&
      (!access.expires_at || new Date(access.expires_at) >= now) &&
      (!access.max_calls || Number(access.call_count || 0) < Number(access.max_calls));

    if (accessError) {
      console.error("business_access lookup failed", accessError);
    }

    if (!active && apiKey !== fallbackApiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid, expired, or over quota API key" },
        { status: 401 }
      );
    }

    if (access?.id) {
      try {
        await supabaseService
          .from("business_access")
          .update({
            call_count: Number(access.call_count || 0) + 1,
            last_used_at: now.toISOString(),
          })
          .eq("id", access.id);
      } catch (err) {
        console.warn("business_access usage update failed", err);
      }
    }

    const event = await req.json();

    if (!api || !bridge || !distributor) {
      return queueFallbackSignup(event);
    }

    const handled = await api.handleBusinessEvent(event);
    await bridge.transparentTransaction({
      event,
      normalizedReceipt: handled.normalizedReceipt,
      recordId: handled.recordId,
    });
    const distribution = await distributor.distribute({
      recordId: handled.recordId,
      normalizedReceipt: handled.normalizedReceipt,
    });

    await supabaseService
      .from("business_api_events")
      .update({ status: "processed" })
      .eq("id", handled.recordId);

    return NextResponse.json({
      success: true,
      platform: handled.platform,
      record_id: handled.recordId,
      normalized_receipt: handled.normalizedReceipt,
      distribution,
    });
  } catch (error: any) {
    console.error("business/integrate error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
