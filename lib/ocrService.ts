/**
 * OCR Service
 * 
 * This service handles OCR processing for receipt images.
 * Now using OCR.space API - no Python server needed!
 */

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;

export interface OCRResult {
  text: string;
  confidence?: number;
}

/**
 * Process image buffer with OCR using OCR.space API
 */
export async function processImageOCR(buffer: Buffer): Promise<OCRResult> {
  try {
    if (!OCR_SPACE_API_KEY) {
      throw new Error("OCR_SPACE_API_KEY not configured in .env.local");
    }

    // Convert Buffer to base64
    const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;

    const formData = new FormData();
    formData.append("base64Image", base64Image);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2"); // Engine 2 is better for receipts

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: OCR_SPACE_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR.space API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || "OCR processing failed");
    }

    const text = data.ParsedResults?.[0]?.ParsedText || "";
    
    // console.log(`✅ OCR.space extracted text (${text.length} chars)`); // Remove in production
    
    return {
      text: text.trim(),
      confidence: 0.9,
    };
  } catch (error: any) {
    // console.error("❌ OCR Error:", error.message); // Remove in production
    throw new Error(`Failed to process OCR: ${error.message}`);
  }
}

/**
 * Helper function to validate OCR result
 */
export function validateOCRResult(result: OCRResult): boolean {
  if (!result.text || result.text.length < 10) {
    return false;
  }
  
  if (result.confidence !== undefined && result.confidence < 0.3) {
    return false;
  }
  
  return true;
}
