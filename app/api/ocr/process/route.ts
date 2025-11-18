import { NextRequest, NextResponse } from "next/server";
import { processImageOCR } from "@/lib/ocrService";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rateLimiter";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown';
    const rateLimit = checkRateLimit(ip, 10, 60 * 1000); // 10 requests per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimit)
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const telegram_id = formData.get("telegram_id") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only images (JPEG, PNG, WebP, HEIC) are allowed." },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB." },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage
    const filePath = `receipts/${Date.now()}-${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const image_url = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath).data.publicUrl;

    // 2. Run OCR
    const ocrResult = await processImageOCR(buffer);

    const rawText = ocrResult.text;
    
    console.log("📄 OCR Text extracted:", rawText.slice(0, 200));

    // 2.5. Check for duplicate receipt (fraud prevention)
    // Create a simple hash from key receipt data
    const receiptHash = Buffer.from(rawText.slice(0, 200)).toString('base64').slice(0, 50);
    
    const { data: duplicateCheck } = await supabase
      .from("receipts")
      .select("id, telegram_id, created_at")
      .eq("metadata->>receiptHash", receiptHash)
      .limit(1);
    
    if (duplicateCheck && duplicateCheck.length > 0) {
      const existingReceipt = duplicateCheck[0];
      console.log("⚠️ Duplicate receipt detected:", existingReceipt.id);
      
      return NextResponse.json(
        { 
          success: false, 
          error: "This receipt has already been submitted",
          duplicate: true,
          originalSubmission: existingReceipt.created_at
        },
        { status: 409 }
      );
    }

    // 3. Extract non-personal data
    // Look for common receipt total patterns
    const amountPatterns = [
      /total[:\s]*\$?(\d+\.?\d{0,2})/i,
      /amount[:\s]*\$?(\d+\.?\d{0,2})/i,
      /\$(\d+\.\d{2})/,
      /(\d+\.\d{2})/,
    ];
    
    let amount = 0.0;
    for (const pattern of amountPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        amount = parseFloat(match[1]);
        console.log(`✅ Found amount: $${amount} using pattern: ${pattern}`);
        break;
      }
    }
    
    if (amount === 0) {
      console.log("⚠️ No amount found in OCR text");
    }

    const brand = detectBrand(rawText); // custom logic below
    const multiplier = brandMultiplier(brand);
    
    console.log(`🏷️ Brand: ${brand}, Multiplier: ${multiplier}x`);

    // 4. Insert into Supabase
    const { data: insertData, error: insertError } = await supabase
      .from("receipts")
      .insert({
        brand,
        amount,
        multiplier,
        telegram_id,
        image_url,
        metadata: { rawText, receiptHash },
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // 5. Calculate RWT rewards
    const baseRWT = amount * 1; // $1 = 1 RWT base
    const totalRWT = baseRWT * multiplier;

    console.log(`💰 RWT Calculation:
      - Amount: $${amount}
      - Base RWT: ${baseRWT}
      - Brand: ${brand}
      - Multiplier: ${multiplier}x
      - Total RWT: ${totalRWT}
    `);

    // 6. Log reward to user_rewards table
    const { data: rewardData, error: rewardError } = await supabase
      .from("user_rewards")
      .insert({
        telegram_id,
        brand,
        base_amount: baseRWT,
        multiplier,
        total_reward: totalRWT,
        receipt_id: insertData[0].id,
      })
      .select();

    if (rewardError) {
      console.error("⚠️ Failed to log reward:", rewardError.message);
    } else {
      console.log("✅ Reward logged to user_rewards:", rewardData[0]);
    }

    return NextResponse.json(
      {
        success: true,
        data: insertData[0],
        ocr_text: rawText,
        reward: {
          base_rwt: baseRWT,
          multiplier,
          total_rwt: totalRWT,
          brand,
        },
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// 🔎 Detect Brand
function detectBrand(text: string): string {
  text = text.toLowerCase();

  if (text.includes("starbucks")) return "Starbucks";
  if (text.includes("circle k")) return "Circle K";
  if (text.includes("dr pepper") || text.includes("dr. pepper"))
    return "Dr Pepper";

  return "Unknown";
}

// ⭐ Brand Multiplier Engine
function brandMultiplier(brand: string): number {
  if (brand === "Starbucks") return 1.5;
  if (brand === "Circle K") return 1.5;
  if (brand === "Dr Pepper") return 1.5;
  return 1.0;
}
