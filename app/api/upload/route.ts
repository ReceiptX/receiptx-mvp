import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServiceClient";
import { processImageOCR } from "@/lib/ocrService";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const email = formData.get("email") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // File type and size validation (best practice)
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  // OCR extraction
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ocrResult = await processImageOCR(buffer);

  const text = ocrResult.text;
  const merchantMatch = text.match(/[A-Za-z\s]{3,20}(?=\s+(Store|Shop|Market|Cafe|Inc|LLC))/i);
  const totalMatch = text.match(/\$?\s*(\d+\.\d{2})/);

  const merchant = merchantMatch ? merchantMatch[0].trim() : "Unknown";
  const total = totalMatch ? parseFloat(totalMatch[1]) : 0;

  await supabaseService.from("receipts").insert([
    {
      user_email: email,
      merchant,
      total,
      receipt_date: new Date().toISOString().split("T")[0],
    },
  ]);

  return NextResponse.json({ merchant, total });
}
