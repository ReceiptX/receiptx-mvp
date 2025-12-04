import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = ["business_name", "contact_email"] as const;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const business_name = normalizeString(body.business_name);
    const contact_name = normalizeString(body.contact_name);
    const contact_email = normalizeString(body.contact_email);
    const contact_phone = normalizeString(body.contact_phone);
    const website = normalizeString(body.website);
    const monthly_transactions = normalizeString(body.monthly_transactions);
    const integration_preference = normalizeString(body.integration_preference);
    const message = normalizeString(body.message);

    for (const field of REQUIRED_FIELDS) {
      const value = normalizeString(body[field]);
      if (!value) {
        return NextResponse.json(
          { success: false, error: `${field.replace(/_/g, " ")} is required` },
          { status: 400 }
        );
      }
    }

    const payload = {
      business_name: business_name!,
      contact_name,
      contact_email: contact_email!,
      contact_phone,
      website,
      monthly_transactions,
      integration_preference,
      message,
      source: normalizeString(body.source) || "signup_form",
      metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
    };

    const { data, error } = await supabaseService
      .from("business_signups")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("business/signup insert error", error);
      return NextResponse.json(
        { success: false, error: "Failed to record signup" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, signup: data });
  } catch (error: any) {
    const message = error?.message || "Invalid request payload";
    console.error("business/signup error", error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
