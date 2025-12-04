import { NextRequest, NextResponse } from "next/server";
import { processImageOCR } from "@/lib/ocrService";
import { supabase } from "@/lib/supabaseClient";
import { supabaseService } from "@/lib/supabaseServiceClient";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rateLimiter";
import crypto from "crypto";
import { 
  detectBrandFromText, 
  getBrandMultiplier, 
  getBrandDisplayName,
  BASE_RWT_PER_CURRENCY_UNIT,
  type BrandKey 
} from "@/lib/multipliers";

// --- Supra Move integration (pseudo-SDK import, replace with actual SDK/API) ---
// import { sendMoveTx } from "@/lib/supraMoveClient";

async function registerUserOnChain(walletAddress: string, referralCode: string, joinedAtMs: number) {
  // TODO: Replace with actual Supra Move SDK/client call
  // Example:
  // await sendMoveTx({
  //   module: "receiptx::registry",
  //   function: "register_user",
  //   args: [walletAddress, referralCode ?? "", joinedAtMs],
  // });
  try {
    // Simulate on-chain registration (replace with real call)
    console.log(`[Supra Move] Registering user on-chain:`, { walletAddress, referralCode, joinedAtMs });
    // await sendMoveTx({ ... });
    return true;
  } catch (err) {
    console.error("[Supra Move] Failed to register user on-chain:", err);
    return false;
  }
}
import { ReceiptValidator } from "@/lib/receiptValidator";
import { 
  detectLotteryTicket, 
  generateLotteryTicketHash, 
  isLotteryTicketDuplicate, 
  recordLotteryTicket 
} from "@/lib/lotteryDetector";


// Blockchain integration: only load at runtime if enabled and not on Vercel
let mintRWT: any = null;
let isContractConfigured: any = null;
let processReferralBonus: any = null;
let hasReceivedReferralBonus: any = null;

function loadBlockchainIntegration() {
  if (process.env.ENABLE_BLOCKCHAIN === 'true' && process.env.VERCEL !== '1') {
    try {
      // Use a path relative to this file for build compatibility
      // Use a relative path import for Next.js build compatibility
      let receiptxToken = null;
      try {
        receiptxToken = require('../../../../lib/blockchain/receiptxToken.js');
      } catch (e) {
        // Not found, skip blockchain integration
      }
      if (receiptxToken) {
        mintRWT = receiptxToken.mintRWT;
        isContractConfigured = receiptxToken.isContractConfigured;
        processReferralBonus = receiptxToken.processReferralBonus;
        hasReceivedReferralBonus = receiptxToken.hasReceivedReferralBonus;
        mintRWT = receiptxToken.mintRWT;
        isContractConfigured = receiptxToken.isContractConfigured;
        processReferralBonus = receiptxToken.processReferralBonus;
        hasReceivedReferralBonus = receiptxToken.hasReceivedReferralBonus;
      } else {
        console.log("ℹ️ Blockchain integration disabled (receiptxToken not found)");
      }
    } catch (e) {
      console.log("ℹ️ Blockchain integration disabled (receiptxToken not found)");
    }
  }
}

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
// --- Plinko integration variables ---
let reqPlinkoResult: any = null;
let reqPlinkoHash: string | null = null;
let reqLotteryResult: any = null;

export async function POST(req: NextRequest) {
  // Load blockchain integration at runtime only
  loadBlockchainIntegration();
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

    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let formData: FormData | null = null;
    let jsonBody: Record<string, unknown> | null = null;

    if (contentType.includes('application/json')) {
      jsonBody = await req.json();
      const rawImage = jsonBody && typeof jsonBody === 'object'
        ? (jsonBody as Record<string, unknown>)['image']
        : undefined;
      const dataUrl = typeof rawImage === 'string' ? rawImage : undefined;
      if (!dataUrl?.startsWith('data:')) {
        return NextResponse.json(
          { success: false, error: 'No image provided' },
          { status: 400, headers: getRateLimitHeaders(rateLimit) }
        );
      }

      const [meta, b64] = dataUrl.split(',');
      const mimeMatch = meta.match(/data:(.*);base64/);
      const mime = mimeMatch?.[1] || 'image/png';
      const buffer = Buffer.from(b64, 'base64');
      const extension = mime.split('/')[1] || 'png';
      file = new File([buffer], `camera-upload.${extension}`, { type: mime });
    } else {
      formData = await req.formData();
      file = formData.get('file') as File | null;
    }

    const getField = (key: string): string | null => {
      if (jsonBody && typeof jsonBody === 'object') {
        const value = (jsonBody as Record<string, unknown>)[key];
        if (value === undefined || value === null) {
          return null;
        }
        return typeof value === 'string' ? value : String(value);
      }

      const value = formData?.get(key);
      if (typeof value === 'string') {
        return value;
      }
      return value !== null && value !== undefined ? String(value) : null;
    };

    const telegram_id = getField('telegram_id');
    const user_email = getField('user_email');
    const password = getField('password');
    let wallet_address = getField('wallet_address');

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }


    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only images (JPEG, PNG, WebP, HEIC) and PDFs are allowed." },
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

    // Generate file hash for fraud detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const imageHash = fileHash;

    // --- Look up wallet_address from user_wallets by user_id ---
    // Multi-tenant wallet lookup: supports email, telegram_id, or existing wallet_address
    if (!wallet_address) {
      try {
        let userId: string | null = null;

        // Find user_id by email or telegram_id
        if (user_email) {
        const { data: userData } = await supabaseService
          .from("users")
          .select("id")
          .eq("email", user_email)
          .maybeSingle();          if (userData) {
            userId = userData.id;
          }
        } else if (telegram_id) {
          // Telegram user lookup
          const { data: telegramUser } = await supabaseService
            .from("users")
            .select("id")
            .eq("telegram_id", telegram_id)
            .maybeSingle();
          
          if (telegramUser) {
            userId = telegramUser.id;
          }
        }

        // Look up multi-tenant wallet by user_id
        if (userId) {
          const { data: walletData } = await supabaseService
            .from("user_wallets")
            .select("wallet_address")
            .eq("user_id", userId)
            .maybeSingle();

          if (walletData) {
            wallet_address = walletData.wallet_address;
            console.log("[Multi-Tenant Wallet] Retrieved wallet for user_id:", userId, "→", wallet_address);
          } else {
            console.warn("[Multi-Tenant Wallet] No wallet found for user_id:", userId, "- will be generated");
          }
        }
      } catch (e) {
        console.error("[Multi-Tenant Wallet] Failed to look up wallet:", e);
      }
    }

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


    let rawText = "";
    let ocrResult: { text: string; confidence?: number } = { text: "", confidence: 0.9 };
    if (file.type === 'application/pdf') {
      // PDF: extract text using pdf-parse (must be installed)
      try {
        const pdfParse = await import('pdf-parse').then(mod => mod.default || mod);
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text || "";
        ocrResult.text = rawText;
        ocrResult.confidence = 0.9;
      } catch (err) {
        return NextResponse.json(
          { success: false, error: "Failed to extract text from PDF. Please upload a clear scan." },
          { status: 400 }
        );
      }
    } else {
      // Image: use OCR as before
      ocrResult = await processImageOCR(buffer);
      rawText = ocrResult.text;
    }

    // --- PII Redaction Step ---
    function redactPII(text: string): string {
      // Email addresses
      text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED_EMAIL]');
      // Phone numbers (simple patterns)
      text = text.replace(/(\+?\d{1,2}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g, '[REDACTED_PHONE]');
      // Credit card numbers (simple patterns)
      text = text.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]');
      // Names: not reliably detectable, skip for now
      return text;
    }
    const redactedText = redactPII(rawText);
    ocrResult.text = redactedText;
    // Use redactedText for all logging and storage below
    rawText = redactedText;

    // Basic receipt keyword detection for PDFs and images
    const receiptKeywords = [
      'total', 'date', 'store', 'amount', 'tax', 'cashier', 'change', 'receipt', 'item', 'qty', 'balance', 'payment', 'transaction'
    ];
    const foundKeywords = receiptKeywords.filter(k => rawText.toLowerCase().includes(k));
    if (foundKeywords.length < 2) {
      return NextResponse.json(
        { success: false, error: "This file does not appear to be a real receipt. Please upload a valid store receipt." },
        { status: 400 }
      );
    }

    console.log("OCR/PDF Text extracted:", rawText.slice(0, 200));

    // 3. Extract non-personal data
    // Look for common receipt total patterns (supports both US and European formats)
    const amountPatterns = [
      /total\s+net[:\s]*€?\$?(\d+[,.]?\d{0,2})/i, // "TOTAL NET 5,20" or "TOTAL NET 5.20"
      /total[:\s]*€?\$?(\d+[,.]?\d{0,2})/i,       // "Total: 5.20" or "Total 5,20"
      /amount[:\s]*€?\$?(\d+[,.]?\d{0,2})/i,      // "Amount: 5.20"
      /\$(\d+\.\d{2})/,                            // "$5.20"
      /€(\d+[,.]\d{2})/,                           // "€5,20" or "€5.20"
      /(\d+[,.]\d{2})/,                            // "5.20" or "5,20"
    ];
    
    let amount = 0.0;
    for (const pattern of amountPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        // Convert European format (5,20) to US format (5.20)
        const amountStr = match[1].replace(',', '.');
        amount = parseFloat(amountStr);
        console.log(`✅ Found amount: $${amount} using pattern: ${pattern}`);
        break;
      }
    }
    
    if (amount === 0 || isNaN(amount)) {
      console.log("⚠️ No valid amount found in OCR text");
      amount = 0.0;
    }

    // Check if this is a lottery ticket (hidden 2x multiplier feature)
    const lotteryResult = detectLotteryTicket(rawText);
    let isLotteryTicket = false;
    let lotteryMultiplier = 1.0;
    
    if (lotteryResult.isLotteryTicket && lotteryResult.ticketType === "scratcher") {
      const lotteryHash = generateLotteryTicketHash(
        lotteryResult.ticketNumber,
        lotteryResult.state,
        rawText
      );
      // Check for duplicate lottery ticket
      const isDuplicate = await isLotteryTicketDuplicate(lotteryHash, supabase);
      if (!isDuplicate) {
        isLotteryTicket = true;
        // Record this lottery ticket to prevent future duplicates
        await recordLotteryTicket(
          lotteryHash,
          lotteryResult,
          user_email,
          telegram_id,
          wallet_address,
          supabase
        );
        // === Plinko Simulation ===
        const { simulatePlinko } = await import("@/lib/lotteryDetector");
        const plinkoResult = simulatePlinko(lotteryHash);
        // Override RWT logic for scratcher: only award Plinko RWT
        amount = 0; // Prevent normal RWT calculation
        lotteryMultiplier = 0; // No 2x multiplier
        // Store Plinko result for later DB insert
        reqPlinkoResult = plinkoResult;
        reqPlinkoHash = lotteryHash;
        reqLotteryResult = lotteryResult;
        console.log(`🎰 Lottery ticket detected! Plinko triggered. Final column: ${plinkoResult.finalColumn}, RWT: ${plinkoResult.reward}`);
      } else {
        console.log(`⚠️ Duplicate lottery ticket detected - Plinko not triggered`);
      }
    }

    const brand = detectBrand(rawText); // custom logic below
    const multiplier = brandMultiplier(brand);
    const validatorUserEmail = user_email ?? undefined;
    const validatorTelegramId = telegram_id ?? undefined;
    
    console.log(`🏷️ Brand: ${brand}, Multiplier: ${multiplier}x${isLotteryTicket ? ' + 2x Lottery Bonus 🎰' : ''}`);

    // 3.5. FRAUD DETECTION (Patent #3: AI-Powered Receipt Processing)
    const validator = new ReceiptValidator();
    const fraudCheck = await validator.validateReceipt({
      ocrText: rawText,
      totalAmount: amount,
      merchantName: brand,
      purchaseDate: new Date().toISOString(), // Will extract properly from OCR
      userEmail: validatorUserEmail,
      telegramId: validatorTelegramId,
      imageUrl: image_url,
      imageHash: imageHash // SHA-256 hash of image for duplicate detection
    });

    // Handle fraud detection results
    if (fraudCheck.status === 'rejected') {
      console.log('🚫 Receipt rejected by fraud detection:', {
        hash: fraudCheck.receiptHash,
        score: fraudCheck.fraudScore,
        indicators: fraudCheck.indicators
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Receipt validation failed',
          reason: fraudCheck.reason,
          fraudScore: fraudCheck.fraudScore,
          indicators: fraudCheck.indicators
        },
        { status: 400 }
      );
    }

    if (fraudCheck.status === 'flagged') {
      console.warn('⚠️ Receipt flagged for review:', {
        hash: fraudCheck.receiptHash,
        score: fraudCheck.fraudScore,
        indicators: fraudCheck.indicators
      });
      // Continue processing but mark for admin review
    }

    console.log('✅ Fraud check passed:', {
      status: fraudCheck.status,
      score: fraudCheck.fraudScore,
      hash: fraudCheck.receiptHash
    });


    // 4. Check for active boosts (Golden Receipt, time-limited multipliers)
    let boostMultiplier = 1.0;
    let usedBoostId: string | null = null;

    // --- Telegram Stars Multiplier Logic ---
    let starsMultiplier = 1.0;
    let starsMultiplierSlug: string | null = null;
    let starsMultiplierExpires: string | null = null;
    try {
      // Try to find an active multiplier purchased via Telegram Stars
      let userMultipliersQuery = supabase
        .from("user_multipliers")
        .select("*")
        .eq("active", true)
        .or(`user_id.eq.${user_email || telegram_id || wallet_address}`)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
      const { data: multipliers, error: multipliersError } = await userMultipliersQuery;
      if (!multipliersError && multipliers && multipliers.length > 0) {
        // Pick the highest multiplier (by product_slug)
        // Example product_slug: 'multiplier_1_5x', 'multiplier_2x', 'multiplier_3x'
        const parseMultiplier = (slug: string) => {
          const match = slug.match(/(\d+(_\d+)?)/);
          if (!match) return 1.0;
          return parseFloat(match[0].replace('_', '.'));
        };
        multipliers.sort((a, b) => parseMultiplier(b.product_slug) - parseMultiplier(a.product_slug));
        const active = multipliers[0];
        starsMultiplier = parseMultiplier(active.product_slug);
        starsMultiplierSlug = active.product_slug;
        starsMultiplierExpires = active.expires_at;
        console.log(`🚀 Active Telegram Stars multiplier: ${starsMultiplier}x (slug: ${starsMultiplierSlug})`);
      }
    } catch (err) {
      console.error("Failed to fetch user_multipliers:", err);
    }

    // --- Legacy boost logic (Golden Receipt, etc) ---
    const { data: activeBoosts, error: boostError } = await supabase
      .from("user_boosts")
      .select("*")
      .eq("active", true)
      .or(`user_email.eq.${user_email || 'null'},telegram_id.eq.${telegram_id || 'null'},wallet_address.eq.${wallet_address}`)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("multiplier", { ascending: false }); // Get highest multiplier first

    if (!boostError && activeBoosts && activeBoosts.length > 0) {
      const boost = activeBoosts[0];
      boostMultiplier = parseFloat(boost.multiplier.toString());
      usedBoostId = boost.id;

      console.log(`🚀 Active boost found: ${boost.boost_type} (${boostMultiplier}x)`);

      // Decrement uses_remaining if applicable (Golden Receipt)
      if (boost.uses_remaining !== null) {
        const newUses = boost.uses_remaining - 1;
        await supabase
          .from("user_boosts")
          .update({
            uses_remaining: newUses,
            active: newUses > 0
          })
          .eq("id", boost.id);
        console.log(`✅ Golden Receipt used (${newUses} uses remaining)`);
      }
    }



    // 5. Calculate RWT rewards (with all multipliers: brand, lottery, boost, Telegram Stars)
    let baseRWT = amount * BASE_RWT_PER_CURRENCY_UNIT; // $1 = 1 RWT base
    let brandMultipliedRWT = baseRWT * multiplier;
    let lotteryMultipliedRWT = brandMultipliedRWT * lotteryMultiplier; // Apply lottery multiplier
    // Apply both boostMultiplier and starsMultiplier (multiplicative)
    let totalRWT = Math.round(lotteryMultipliedRWT * boostMultiplier * starsMultiplier);

    // --- Early Adopter Airdrop: Guarantee 1000 RWT for first 5000 unique users (first receipt only) ---
    let isEarlyAdopter = false;
    if (user_email) {
      // Count unique users in waitlist (by email)
      const { count: waitlistCount, error: waitlistCountError } = await supabase
        .from("waitlist")
        .select("email", { count: "exact", head: true });
      if (!waitlistCountError && typeof waitlistCount === 'number' && waitlistCount <= 5000) {
        // Check if this is user's first receipt
        const { count: receiptCount, error: receiptCountError } = await supabase
          .from("receipts")
          .select("id", { count: "exact", head: true })
          .eq("user_email", user_email);
        if (!receiptCountError && receiptCount === 0) {
          if (totalRWT < 1000) {
            totalRWT = 1000;
            isEarlyAdopter = true;
          }
        }
      }
    }

    // If Plinko triggered, override RWT with Plinko reward
    if (reqPlinkoResult) {
      baseRWT = 0;
      brandMultipliedRWT = 0;
      lotteryMultipliedRWT = 0;
      totalRWT = reqPlinkoResult.reward;
    }

    console.log(`💰 RWT Calculation:
      - Amount: $${amount}
      - Base RWT: ${baseRWT}
      - Brand: ${brand}
      - Brand Multiplier: ${multiplier}x
      - Lottery Multiplier: ${lotteryMultiplier}x ${isLotteryTicket ? '🎰' : ''}
      - Boost Multiplier: ${boostMultiplier}x
      - Telegram Stars Multiplier: ${starsMultiplier}x
      - Total RWT: ${totalRWT}
      - Early Adopter: ${isEarlyAdopter}
    `);


    // 6. Insert into Supabase with fraud detection data, boost info, and Telegram Stars multiplier info
    const { data: insertData, error: insertError } = await supabaseService
      .from("receipts")
      .insert({
        brand,
        amount,
        multiplier,
        rwt_earned: totalRWT,
        user_email,
        telegram_id,
        wallet_address,
        image_url,
        metadata: {
          rawText,
          boost_multiplier: boostMultiplier,
          boost_id: usedBoostId,
          stars_multiplier: starsMultiplier,
          stars_multiplier_slug: starsMultiplierSlug,
          stars_multiplier_expires: starsMultiplierExpires,
          lottery_multiplier: lotteryMultiplier,
          is_lottery_ticket: isLotteryTicket,
          lottery_details: isLotteryTicket ? {
            ticket_type: reqLotteryResult?.ticketType,
            state: reqLotteryResult?.state,
            ticket_number: reqLotteryResult?.ticketNumber,
            game_name: reqLotteryResult?.gameName,
            confidence: reqLotteryResult?.confidence
          } : null,
          plinko: reqPlinkoResult ? {
            final_column: reqPlinkoResult.finalColumn,
            reward: reqPlinkoResult.reward,
            path: reqPlinkoResult.path,
            hash: reqPlinkoHash
          } : null
        },
        receipt_hash: fraudCheck.receiptHash,
        fraud_score: fraudCheck.fraudScore,
        validation_status: fraudCheck.status,
        fraud_indicators: fraudCheck.indicators,
        confidence_score: fraudCheck.confidenceScore,
        image_hash: imageHash,
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // 6.5. Issue RWT/AIA rewards directly to transaction tables
    try {
      // Get user_id from the identifiers
      let userId: string | null = null;
      
      if (user_email) {
        const { data: userData } = await supabaseService
          .from("users")
          .select("id")
          .eq("email", user_email)
          .maybeSingle();
        if (userData) userId = userData.id;
      } else if (telegram_id) {
        const { data: userData } = await supabaseService
          .from("users")
          .select("id")
          .eq("telegram_id", telegram_id)
          .maybeSingle();
        if (userData) userId = userData.id;
      } else if (wallet_address) {
        const { data: walletData } = await supabaseService
          .from("user_wallets")
          .select("user_id")
          .eq("wallet_address", wallet_address)
          .maybeSingle();
        if (walletData) userId = walletData.user_id;
      }

      if (userId) {
        const { issueReceiptReward } = await import('@/lib/rewardsReceiptDirect');
        await issueReceiptReward({
          userId,
          receiptId: insertData[0].id,
          rwtAmount: totalRWT,
          aiaAmount: 0, // Receipts don't earn AIA by default
          brand,
          multiplier,
          baseRWT
        });
        console.log(`✅ Receipt rewards issued to transactions table: ${totalRWT} RWT`);
      } else {
        console.warn('⚠️ Could not find user_id for transaction - rewards logged to user_rewards only');
      }
    } catch (rewardErr: any) {
      console.error('⚠️ Failed to issue receipt rewards:', rewardErr.message);
      // Don't fail the whole request if reward transaction fails
    }

    // 7. Update or create user_stats entry
    const { data: existingStats } = await supabaseService
      .from("user_stats")
      .select("*")
      .or(`user_email.eq.${user_email || 'null'},telegram_id.eq.${telegram_id || 'null'},wallet_address.eq.${wallet_address}`)
      .single();

    if (existingStats) {
      // Update existing stats
      const { error: updateError } = await supabaseService
        .from("user_stats")
        .update({
          total_receipts: existingStats.total_receipts + 1,
          total_rwt_earned: existingStats.total_rwt_earned + totalRWT,
          average_rwt_per_receipt: (existingStats.total_rwt_earned + totalRWT) / (existingStats.total_receipts + 1),
          updated_at: new Date().toISOString()
        })
        .eq("id", existingStats.id);
      
      if (updateError) {
        console.error("⚠️ Failed to update user_stats:", updateError.message);
      } else {
        console.log("✅ Updated user_stats for receipt");
      }
    } else {
      // Create new stats entry
      const { error: insertError } = await supabaseService
        .from("user_stats")
        .insert({
          user_email,
          telegram_id,
          wallet_address,
          total_receipts: 1,
          total_rwt_earned: totalRWT,
          average_rwt_per_receipt: totalRWT,
          current_tier: 'Bronze'
        });
      
      if (insertError) {
        console.error("⚠️ Failed to create user_stats:", insertError.message);
      } else {
        console.log("✅ Created user_stats entry");
      }
    }

    // 7b. Also log to user_rewards table for transaction history
    const { data: rewardData, error: rewardError } = await supabaseService
      .from("user_rewards")
      .insert({
        user_email,
        telegram_id,
        wallet_address,
        brand,
        base_amount: baseRWT,
        multiplier,
        total_reward: totalRWT,
        receipt_id: insertData[0].id,
        plinko: reqPlinkoResult ? {
          final_column: reqPlinkoResult.finalColumn,
          reward: reqPlinkoResult.reward,
          path: reqPlinkoResult.path,
          hash: reqPlinkoHash
        } : null
      })
      .select();

    if (rewardError) {
      console.error("⚠️ Failed to log reward:", rewardError.message);
    } else {
      console.log("✅ Reward logged to user_rewards:", rewardData[0]);
    }

    // 7. Check if this is user's first receipt and process referral bonus
    let referralBonus = null;
    if (wallet_address) {
      try {
        // Check if there's a pending referral for this user
        const { data: referralData, error: referralError } = await supabase
          .from("referrals")
          .select("*")
          .or(`referred_email.eq.${user_email || 'null'},referred_telegram_id.eq.${telegram_id || 'null'},referred_wallet_address.eq.${wallet_address}`)
          .eq("status", "pending")
          .single();

        if (referralData && !referralError) {
          console.log("🎁 Found pending referral for user:", referralData.id);
          
          // Check if this is from a multiplier brand (Starbucks, Circle K, McDonald's)
          const brandKey = detectBrandFromText(rawText);
          const isMultiplierBrand = brandKey ? ['starbucks', 'circle_k', 'mcdonalds'].includes(brandKey) : false;
          const aiaBonus = isMultiplierBrand ? 10 : 5;
          
          console.log(`🎁 Referral bonus: ${aiaBonus} AIA (multiplier brand: ${isMultiplierBrand})`);
          
          // Update referral status to qualified
          const { error: updateReferralError } = await supabase
            .from("referrals")
            .update({
              status: 'qualified',
              first_receipt_id: insertData[0].id,
              first_receipt_brand: brand,
              is_multiplier_brand: isMultiplierBrand,
              aia_bonus_amount: aiaBonus
            })
            .eq("id", referralData.id);
          
          if (updateReferralError) {
            console.error("⚠️ Failed to update referral:", updateReferralError.message);
          }
          
          // Process blockchain referral bonus if contract is available
          if (processReferralBonus && hasReceivedReferralBonus && isContractConfigured && isContractConfigured()) {
            try {
              // Get referrer wallet address
              const referrerWallet = referralData.referrer_wallet_address;
              
              if (referrerWallet) {
                // Check if already rewarded on-chain
                const alreadyRewarded = await hasReceivedReferralBonus(wallet_address);
                
                if (!alreadyRewarded) {
                  console.log(`🔗 Processing referral bonus: ${aiaBonus} AIA to ${referrerWallet}`);
                  
                  const bonusResult = await processReferralBonus(
                    referrerWallet,
                    wallet_address,
                    isMultiplierBrand
                  );
                  
                  if (bonusResult.success) {
                    console.log("✅ Referral bonus paid on blockchain:", bonusResult.txHash);
                    
                    // Update referral with blockchain info
                    await supabase
                      .from("referrals")
                      .update({
                        status: 'rewarded',
                        blockchain_tx_hash: bonusResult.txHash,
                        rewarded_at: new Date().toISOString()
                      })
                      .eq("id", referralData.id);
                    
                    referralBonus = {
                      referrer: referrerWallet,
                      aiaAmount: aiaBonus,
                      txHash: bonusResult.txHash,
                      isMultiplierBrand
                    };
                  } else {
                    console.error("⚠️ Blockchain referral bonus failed:", bonusResult.error);
                  }
                } else {
                  console.log("ℹ️ Referral bonus already paid on-chain");
                }
              } else {
                console.log("ℹ️ Referrer has no wallet address, skipping blockchain bonus");
              }
            } catch (error: any) {
              console.error("⚠️ Referral bonus processing failed:", error.message);
            }
          } else {
            console.log("ℹ️ Blockchain referral bonus skipped (contract not configured)");
          }
        }
      } catch (error: any) {
        console.error("⚠️ Referral check failed (continuing without):", error.message);
      }
    }

    // 8. Mint RWT tokens on-chain (if contract deployed and wallet exists)
    let blockchainTx = null;
    if (wallet_address && mintRWT && isContractConfigured && isContractConfigured()) {
      try {
        console.log(`🔗 Minting ${totalRWT} RWT to ${wallet_address}`);
        
        // Convert RWT amount to wei (assuming 18 decimals)
        const { ethers } = await import('ethers');
        const amountInWei = ethers.parseUnits(totalRWT.toString(), 18);
        
        // Mint RWT tokens via smart contract
        const result = await mintRWT(wallet_address, amountInWei);
        
        if (result.success) {
          console.log("✅ RWT tokens minted on blockchain:", result.txHash);
          
          // Update reward record with blockchain transaction
          const { error: updateError } = await supabase
            .from("user_rewards")
            .update({
              blockchain_tx_hash: result.txHash,
              blockchain_explorer_url: `https://testnet.suprascan.io/tx/${result.txHash}`
            })
            .eq("receipt_id", insertData[0].id);
          
          if (updateError) {
            console.error("⚠️ Failed to update reward with tx hash:", updateError.message);
          }
          
          blockchainTx = {
            txHash: result.txHash,
            tokens: totalRWT,
            explorer: `https://testnet.suprascan.io/tx/${result.txHash}`
          };
        } else {
          console.error("⚠️ Blockchain minting failed:", result.error);
        }
      } catch (error: any) {
        console.error("⚠️ Blockchain minting failed (continuing without):", error.message);
        // Don't fail the whole request if blockchain fails
      }
    } else {
      console.log("ℹ️ Blockchain minting skipped (contract not configured or no wallet)");
    }

    // ===========================
    // Step 8: NFT Auto-Minting on Milestones
    // ===========================
    let mintedNFTs: any[] = [];
    try {
      console.log("🎁 Checking NFT eligibility...");
      
      // Get user's total receipt count and eligible NFTs
      const eligibilityParams = new URLSearchParams();
      if (user_email) eligibilityParams.set("user_email", user_email);
      if (telegram_id) eligibilityParams.set("telegram_id", telegram_id.toString());
      if (wallet_address) eligibilityParams.set("wallet_address", wallet_address);

      const eligibilityRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nfts/mint?${eligibilityParams}`,
        { method: 'GET' }
      );
      
      if (eligibilityRes.ok) {
        const eligibilityData = await eligibilityRes.json();
        
        if (eligibilityData.eligible_nfts && eligibilityData.eligible_nfts.length > 0) {
          console.log(`🎁 User eligible for ${eligibilityData.eligible_nfts.length} NFT(s)`);
          
          // Auto-mint each eligible NFT
          for (const eligibleNFT of eligibilityData.eligible_nfts) {
            if (eligibleNFT.is_eligible) {
              try {
                const mintRes = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nfts/mint`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_email,
                      telegram_id,
                      wallet_address,
                      nft_type: eligibleNFT.nft_type,
                    }),
                  }
                );
                
                if (mintRes.ok) {
                  const mintData = await mintRes.json();
                  mintedNFTs.push(mintData.nft);
                  console.log(`✅ Auto-minted NFT: ${eligibleNFT.nft_name} (${eligibleNFT.nft_type})`);
                }
              } catch (mintErr) {
                console.error(`❌ Failed to mint ${eligibleNFT.nft_type}:`, mintErr);
              }
            }
          }
        } else {
          console.log("ℹ️ No new NFTs eligible at this time");
        }
      }
    } catch (nftErr) {
      console.error("❌ NFT auto-minting failed:", nftErr);
      // Don't fail the whole request if NFT minting fails
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
        plinko: reqPlinkoResult ? {
          final_column: reqPlinkoResult.finalColumn,
          reward: reqPlinkoResult.reward,
          path: reqPlinkoResult.path,
          hash: reqPlinkoHash
        } : null,
        blockchain: blockchainTx,
        referral: referralBonus,
        nfts: mintedNFTs.length > 0 ? mintedNFTs : undefined,
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

// 🔎 Brand Detection & Multiplier Engine
function detectBrand(text: string): string {
  const brandKey = detectBrandFromText(text);
  return getBrandDisplayName(brandKey);
}

function brandMultiplier(brand: string): number {
  // Convert display name back to key for lookup
  const brandKey = detectBrandFromText(brand);
  return getBrandMultiplier(brandKey);
}

