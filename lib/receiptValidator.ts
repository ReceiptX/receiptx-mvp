/// Receipt Fraud Detection System
/// Implements Patent Application #3 claims for cryptographic verification
/// and machine learning-based fraud prevention

interface ReceiptAnalysis {
  receipt_hash: string;
  is_duplicate: boolean;
  fraud_score: number; // 0-100 (0 = legitimate, 100 = definitely fraud)
  fraud_indicators: string[];
  validation_status: 'approved' | 'flagged' | 'rejected';
  confidence_score: number;
}

interface ReceiptData {
  ocr_text: string;
  total_amount: number;
  merchant_name: string;
  timestamp: string;
  image_hash: string;
}

export class ReceiptValidator {
  
  /**
   * Cryptographic receipt hashing for duplicate detection
   * Creates deterministic hash from receipt content (not image pixels)
   * Uses image_hash to detect exact duplicate uploads regardless of submission date
   */
  static generateReceiptHash(receipt: ReceiptData): string {
    const crypto = require('crypto');
    
    // Use image hash as primary identifier - catches exact duplicate images
    // Even if uploaded on different dates, same receipt image = same hash
    if (receipt.image_hash) {
      return receipt.image_hash; // Already a SHA-256 hash from OCR processor
    }
    
    // Fallback: Generate hash from content (merchant + amount)
    // NOTE: Intentionally excludes date to catch resubmissions
    const normalized = {
      merchant: receipt.merchant_name.toLowerCase().trim(),
      amount: parseFloat(receipt.total_amount.toFixed(2)),
      // Don't include date - same receipt uploaded twice should have same hash
    };
    
    const hashInput = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check for duplicate receipt submissions
   * Implements anti-fraud measure from Patent #3
   */
  static async checkDuplicate(receiptHash: string): Promise<boolean> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      // Use supabaseAdmin from server/supabaseAdmin
      require('../server/supabaseAdmin').supabaseAdmin
    );
    
    const { data, error } = await supabase
      .from("receipts")
      .select("id")
      .eq("receipt_hash", receiptHash)
      .limit(1);
    
    return (data && data.length > 0);
  }

  /**
   * AI-powered fraud detection
   * Analyzes receipt characteristics for suspicious patterns
   */
  static async analyzeFraud(receipt: ReceiptData): Promise<ReceiptAnalysis> {
    const fraudIndicators: string[] = [];
    let fraudScore = 0;
    
    // INDICATOR 1: OCR text quality (low quality = possible fake)
    const textLength = receipt.ocr_text.length;
    if (textLength < 50) {
      fraudIndicators.push("Insufficient text extracted (possible low-quality image)");
      fraudScore += 20;
    }
    
    // INDICATOR 2: Suspiciously round amounts
    if (receipt.total_amount % 1 === 0 && receipt.total_amount > 50) {
      fraudIndicators.push("Perfectly round amount (unusual for real receipts)");
      fraudScore += 15;
    }
    
    // INDICATOR 3: Merchant name validation
    const hasValidMerchant = receipt.merchant_name && 
                            receipt.merchant_name.length >= 3 &&
                            /[a-zA-Z]/.test(receipt.merchant_name);
    if (!hasValidMerchant) {
      fraudIndicators.push("Invalid or missing merchant name");
      fraudScore += 25;
    }
    
    // INDICATOR 4: Amount validation (negative or zero)
    if (receipt.total_amount <= 0) {
      fraudIndicators.push("Invalid amount (must be positive)");
      fraudScore += 50;
    }
    
    // INDICATOR 5: Extremely high amount (potential manipulation)
    if (receipt.total_amount > 10000) {
      fraudIndicators.push("Unusually high transaction amount");
      fraudScore += 30;
    }
    
    // INDICATOR 6: Check for duplicate hash
    const receiptHash = this.generateReceiptHash(receipt);
    const isDuplicate = await this.checkDuplicate(receiptHash);
    if (isDuplicate) {
      fraudIndicators.push("Duplicate receipt detected");
      fraudScore += 100; // Auto-reject
    }
    
    // INDICATOR 7: OCR text contains suspicious keywords
    const suspiciousKeywords = ['test', 'sample', 'demo', 'fake', 'photoshop'];
    const lowerText = receipt.ocr_text.toLowerCase();
    for (const keyword of suspiciousKeywords) {
      if (lowerText.includes(keyword)) {
        fraudIndicators.push(`Suspicious keyword detected: ${keyword}`);
        fraudScore += 40;
      }
    }
    
    // Determine validation status
    let validationStatus: 'approved' | 'flagged' | 'rejected';
    if (fraudScore >= 70) {
      validationStatus = 'rejected';
    } else if (fraudScore >= 40) {
      validationStatus = 'flagged'; // Manual review needed
    } else {
      validationStatus = 'approved';
    }
    
    // Confidence score (inverse of fraud score)
    const confidenceScore = Math.max(0, 100 - fraudScore);
    
    return {
      receipt_hash: receiptHash,
      is_duplicate: isDuplicate,
      fraud_score: Math.min(100, fraudScore),
      fraud_indicators: fraudIndicators,
      validation_status: validationStatus,
      confidence_score: confidenceScore
    };
  }

  /**
   * Advanced ML-based fraud detection (placeholder for future implementation)
   * Would use trained model to detect:
   * - Photoshopped receipts
   * - Screenshot vs physical receipt
   * - Font inconsistencies
   * - Lighting and shadow analysis
   */
  static async mlFraudDetection(imageBuffer: Buffer): Promise<number> {
    // TODO: Integrate TensorFlow.js or external ML API
    // For now, return neutral score
    return 0;
  }

  /**
   * Main validation method - validates receipt and returns standardized response
   * This is the primary interface used by the OCR processor
   */
  async validateReceipt(params: {
    ocrText: string;
    totalAmount: number;
    merchantName: string;
    purchaseDate: string;
    userEmail?: string;
    telegramId?: string;
    imageUrl: string;
    imageHash?: string; // SHA-256 hash of the actual image file
  }): Promise<{
    status: 'approved' | 'flagged' | 'rejected';
    receiptHash: string;
    fraudScore: number;
    confidenceScore: number;
    indicators: string[];
    reason?: string;
  }> {
    // Use static analyzeFraud method
    const analysis = await ReceiptValidator.analyzeFraud({
      ocr_text: params.ocrText,
      total_amount: params.totalAmount,
      merchant_name: params.merchantName,
      timestamp: params.purchaseDate,
      image_hash: params.imageHash || params.imageUrl // Use SHA-256 hash if provided, fallback to URL
    });

    // Return standardized response
    return {
      status: analysis.validation_status,
      receiptHash: analysis.receipt_hash,
      fraudScore: analysis.fraud_score,
      confidenceScore: analysis.confidence_score,
      indicators: analysis.fraud_indicators,
      reason: analysis.validation_status === 'rejected' 
        ? `Receipt rejected with fraud score ${analysis.fraud_score}/100`
        : analysis.validation_status === 'flagged'
        ? `Receipt flagged for manual review (fraud score: ${analysis.fraud_score}/100)`
        : undefined
    };
  }

  /**
   * Store validation results in database
   */
  static async storeValidationResult(
    receiptId: string,
    analysis: ReceiptAnalysis
  ): Promise<void> {
    const { createClient } = await import("@supabase/supabase-js");
    // Use supabaseAdmin from server/supabaseAdmin
    const { supabaseAdmin } = require('../server/supabaseAdmin');
    const supabase = supabaseAdmin;
    
    await supabase.from("receipts").update({
      receipt_hash: analysis.receipt_hash,
      fraud_score: analysis.fraud_score,
      validation_status: analysis.validation_status,
      fraud_indicators: analysis.fraud_indicators,
      confidence_score: analysis.confidence_score
    }).eq("id", receiptId);
  }

  /**
   * Get fraud statistics for admin dashboard
   */
  static async getFraudStats(): Promise<{
    total_receipts: number;
    approved: number;
    flagged: number;
    rejected: number;
    average_fraud_score: number;
  }> {
    const { createClient } = await import("@supabase/supabase-js");
    // Use supabaseAdmin from server/supabaseAdmin
    const { supabaseAdmin } = require('../server/supabaseAdmin');
    const supabase = supabaseAdmin;
    
    const { data, error } = await supabase
      .from("receipts")
      .select("validation_status, fraud_score");
    
    if (error || !data) {
      return {
        total_receipts: 0,
        approved: 0,
        flagged: 0,
        rejected: 0,
        average_fraud_score: 0
      };
    }
    
    const stats = {
      total_receipts: data.length,
      approved: data.filter(r => r.validation_status === 'approved').length,
      flagged: data.filter(r => r.validation_status === 'flagged').length,
      rejected: data.filter(r => r.validation_status === 'rejected').length,
      average_fraud_score: data.reduce((sum, r) => sum + (r.fraud_score || 0), 0) / data.length
    };
    
    return stats;
  }
}

// =============================================================================
// DATABASE MIGRATION NEEDED
// =============================================================================

/*
-- Add fraud detection columns to receipts table
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS receipt_hash TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'approved' CHECK (validation_status IN ('approved', 'flagged', 'rejected')),
ADD COLUMN IF NOT EXISTS fraud_indicators JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 100;

-- Index for fraud analysis
CREATE INDEX IF NOT EXISTS idx_receipts_fraud_score ON receipts(fraud_score);
CREATE INDEX IF NOT EXISTS idx_receipts_validation_status ON receipts(validation_status);
CREATE INDEX IF NOT EXISTS idx_receipts_hash ON receipts(receipt_hash);

-- Prevent duplicate receipt hashes
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_unique_hash ON receipts(receipt_hash) WHERE receipt_hash IS NOT NULL;
*/

// =============================================================================
// USAGE EXAMPLE IN OCR PROCESSOR
// =============================================================================

/*
// In app/api/ocr/process/route.ts after OCR extraction:

import { ReceiptValidator } from '@/lib/receiptValidator';

// Analyze receipt for fraud
const analysis = await ReceiptValidator.analyzeFraud({
  ocr_text: ocrResult.text,
  total_amount: parsedAmount,
  merchant_name: detectedBrand,
  timestamp: new Date().toISOString(),
  image_hash: imageHash
});

// Block suspicious receipts
if (analysis.validation_status === 'rejected') {
  return NextResponse.json({
    success: false,
    error: 'Receipt validation failed',
    fraud_indicators: analysis.fraud_indicators,
    fraud_score: analysis.fraud_score
  }, { status: 422 });
}

// Flag for manual review
if (analysis.validation_status === 'flagged') {
  // Send to admin dashboard or moderation queue
  console.warn('Receipt flagged for review:', analysis);
}

// Store validation results
await ReceiptValidator.storeValidationResult(receiptId, analysis);
*/
