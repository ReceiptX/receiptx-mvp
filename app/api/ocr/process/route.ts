import { NextRequest, NextResponse } from "next/server";
import { processImageOCR } from "@/lib/ocrService";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rateLimiter";
import crypto from "crypto";
import { 
  detectBrandFromText, 
  getBrandMultiplier, 
  getBrandDisplayName,
  BASE_RWT_PER_CURRENCY_UNIT,
  type BrandKey 
} from "@/lib/multipliers";
import { ReceiptValidator } from "@/lib/receiptValidator";

// Optional blockchain integration (EVM smart contract)
// Note: Blockchain modules are disabled (.ts.disabled) for MVP launch
// Database-only token tracking is used instead
let mintRWT: any = null;
let isContractConfigured: any = null;
let processReferralBonus: any = null;
let hasReceivedReferralBonus: any = null;

// Skip blockchain imports during build (files are .disabled)
if (process.env.ENABLE_BLOCKCHAIN === 'true') {
  try {
    const receiptxToken = require("@/lib/blockchain/receiptxToken");
    mintRWT = receiptxToken.mintRWT;
    isContractConfigured = receiptxToken.isContractConfigured;
    processReferralBonus = receiptxToken.processReferralBonus;
    hasReceivedReferralBonus = receiptxToken.hasReceivedReferralBonus;
  } catch (e) {
    console.log("ℹ️ Blockchain integration disabled (receiptxToken not found)");
  }
}

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
    const user_email = formData.get("user_email") as string;
    const wallet_address = formData.get("wallet_address") as string;

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
    
    // Generate image hash for fraud detection
    const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

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

    const brand = detectBrand(rawText); // custom logic below
    const multiplier = brandMultiplier(brand);
    
    console.log(`🏷️ Brand: ${brand}, Multiplier: ${multiplier}x`);

    // 3.5. FRAUD DETECTION (Patent #3: AI-Powered Receipt Processing)
    const validator = new ReceiptValidator();
    const fraudCheck = await validator.validateReceipt({
      ocrText: rawText,
      totalAmount: amount,
      merchantName: brand,
      purchaseDate: new Date().toISOString(), // Will extract properly from OCR
      userEmail: user_email,
      telegramId: telegram_id,
      imageUrl: image_url
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

    // 4. Calculate RWT rewards (before inserting receipt)
    const baseRWT = amount * BASE_RWT_PER_CURRENCY_UNIT; // $1 = 1 RWT base
    const totalRWT = Math.round(baseRWT * multiplier);

    console.log(`💰 RWT Calculation:
      - Amount: $${amount}
      - Base RWT: ${baseRWT}
      - Brand: ${brand}
      - Multiplier: ${multiplier}x
      - Total RWT: ${totalRWT}
    `);

    // 5. Insert into Supabase with fraud detection data
    const { data: insertData, error: insertError } = await supabase
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
        metadata: { rawText },
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

    // 6. Log reward to user_rewards table
    const { data: rewardData, error: rewardError } = await supabase
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
