/**
 * Plinko Simulation for Lottery Ticket Rewards
 * 16 rows, outer columns: 100/1000 RWT, rest: 1 RWT
 * Deterministic if seed is provided (e.g., ticket hash)
 */
export interface PlinkoResult {
  board: number[][];
  finalColumn: number;
  reward: number;
  path: number[];
}

// Plinko board config: 16 rows, 17 columns (0-16)
const PLINKO_ROWS = 16;
const PLINKO_COLS = 17;
const PLINKO_REWARDS = [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1000];

function seededRandom(seed: string, i: number): number {
  // Simple deterministic pseudo-random (hash + index)
  const hash = crypto.createHash('sha256').update(seed + i).digest('hex');
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

/**
 * Simulate a single Plinko drop
 * @param seed - string to seed randomness (e.g., ticket hash)
 * @returns PlinkoResult
 */
export function simulatePlinko(seed: string): PlinkoResult {
  let col = Math.floor(PLINKO_COLS / 2); // Start in the center
  const path: number[] = [col];
  for (let row = 0; row < PLINKO_ROWS; row++) {
    const rand = seededRandom(seed, row);
    // 50/50 left/right, but clamp to board edges
    if (rand < 0.5 && col > 0) {
      col--;
    } else if (rand >= 0.5 && col < PLINKO_COLS - 1) {
      col++;
    }
    path.push(col);
  }
  const reward = PLINKO_REWARDS[col];
  // Optionally, build a board representation (not used for logic)
  const board = [];
  for (let r = 0; r < PLINKO_ROWS; r++) {
    board.push(new Array(PLINKO_COLS).fill(0));
  }
  return { board, finalColumn: col, reward, path };
}
/**
 * Lottery Ticket Detection & Validation
 * Detects scratch-off lottery tickets and applies 2x multiplier
 * Hidden feature - not publicly advertised
 */

import crypto from "crypto";

export interface LotteryDetectionResult {
  isLotteryTicket: boolean;
  ticketType: "scratcher" | "draw" | null;
  state: string | null;
  ticketNumber: string | null;
  gameName: string | null;
  confidence: number;
  indicators: string[];
}

// Lottery keywords commonly found on scratch-off tickets
const LOTTERY_KEYWORDS = [
  // Generic lottery terms
  "LOTTERY", "LOTTO", "SCRATCH", "SCRATCHER", "INSTANT WIN", "SCRATCH-OFF",
  "TICKET NUMBER", "VALIDATION CODE", "WINNING NUMBERS", "PLAY INSTRUCTIONS",
  
  // State lotteries (most common)
  "CALIFORNIA LOTTERY", "CALOTTERY", "FLORIDA LOTTERY", "FLA LOTTERY",
  "TEXAS LOTTERY", "NEW YORK LOTTERY", "NY LOTTERY", "NYLOTTERY",
  "PENNSYLVANIA LOTTERY", "PA LOTTERY", "OHIO LOTTERY", "MICHIGAN LOTTERY",
  "GEORGIA LOTTERY", "NC LOTTERY", "NORTH CAROLINA LOTTERY",
  "ILLINOIS LOTTERY", "VIRGINIA LOTTERY", "VA LOTTERY",
  
  // Popular scratch game names
  "CASH EXPLOSION", "MONEY BAGS", "GOLD RUSH", "LUCKY 7", "TRIPLE PLAY",
  "CROSSWORD", "BINGO", "MONOPOLY", "CASH WORD", "CASH BLAST",
  "SET FOR LIFE", "MILLIONAIRE", "PLATINUM", "DIAMOND", "RUBY",
  
  // Ticket validation
  "SCAN TO CLAIM", "VALIDATE AT RETAILER", "CHECK YOUR TICKET",
  "WINNING TICKET", "PRIZE CLAIM", "CLAIM FORM", "RETAILER VALIDATION",
  
  // Prize structures
  "PRIZE AMOUNT", "TOP PRIZE", "ODDS OF WINNING", "GAME NUMBER",
  "PACK NUMBER", "TICKET PACK", "SCRATCH HERE", "SCRATCH OFF"
];

// Patterns for lottery ticket numbers (alphanumeric codes)
const TICKET_NUMBER_PATTERNS = [
  /TICKET\s*#?:?\s*([A-Z0-9]{10,20})/i,
  /VALIDATION\s*CODE:?\s*([A-Z0-9]{10,20})/i,
  /GAME\s*#?:?\s*(\d{3,4})/i,
  /PACK\s*#?:?\s*([A-Z0-9]{6,12})/i,
  /SERIAL\s*#?:?\s*([A-Z0-9]{8,16})/i,
];

// State lottery abbreviations
const STATE_ABBREV: Record<string, string> = {
  "CA": "California", "FL": "Florida", "TX": "Texas", "NY": "New York",
  "PA": "Pennsylvania", "OH": "Ohio", "MI": "Michigan", "GA": "Georgia",
  "NC": "North Carolina", "IL": "Illinois", "VA": "Virginia", "NJ": "New Jersey",
  "MA": "Massachusetts", "WA": "Washington", "AZ": "Arizona", "TN": "Tennessee"
};

/**
 * Detect if the OCR text is from a lottery ticket
 */
export function detectLotteryTicket(ocrText: string): LotteryDetectionResult {
  const textUpper = ocrText.toUpperCase();
  const indicators: string[] = [];
  let confidence = 0;
  let ticketNumber: string | null = null;
  let state: string | null = null;
  let gameName: string | null = null;

  // 1. Check for lottery keywords
  let keywordMatches = 0;
  for (const keyword of LOTTERY_KEYWORDS) {
    if (textUpper.includes(keyword)) {
      keywordMatches++;
      indicators.push(`Keyword: ${keyword}`);
    }
  }

  // More than 3 lottery keywords = very likely a lottery ticket
  if (keywordMatches >= 3) {
    confidence += 40;
  } else if (keywordMatches >= 2) {
    confidence += 20;
  } else if (keywordMatches >= 1) {
    confidence += 10;
  }

  // 2. Check for ticket number patterns
  for (const pattern of TICKET_NUMBER_PATTERNS) {
    const match = textUpper.match(pattern);
    if (match) {
      ticketNumber = match[1];
      indicators.push(`Ticket number: ${ticketNumber}`);
      confidence += 25;
      break;
    }
  }

  // 3. Check for state lottery mentions
  for (const [abbrev, fullName] of Object.entries(STATE_ABBREV)) {
    if (textUpper.includes(`${abbrev} LOTTERY`) || textUpper.includes(`${fullName.toUpperCase()} LOTTERY`)) {
      state = fullName;
      indicators.push(`State: ${fullName}`);
      confidence += 20;
      break;
    }
  }

  // 4. Check for scratch-off specific terms
  const scratchTerms = ["SCRATCH", "SCRATCHER", "SCRATCH-OFF", "INSTANT WIN", "SCRATCH HERE"];
  const hasScratchTerm = scratchTerms.some(term => textUpper.includes(term));
  
  if (hasScratchTerm) {
    indicators.push("Scratch-off detected");
    confidence += 15;
  }

  // 5. Extract game name (often appears as "GAME: NAME" or just capitalized)
  const gameMatch = ocrText.match(/GAME:\s*([A-Z\s]{3,30})/i);
  if (gameMatch) {
    gameName = gameMatch[1].trim();
    indicators.push(`Game: ${gameName}`);
    confidence += 10;
  }

  // 6. Check for barcode presence (lottery tickets have Code 128 barcodes)
  // Note: OCR.space doesn't detect barcodes directly, but we can infer from long alphanumeric strings
  const hasLongAlphanumeric = /[A-Z0-9]{15,}/.test(textUpper);
  if (hasLongAlphanumeric) {
    indicators.push("Barcode-like string detected");
    confidence += 5;
  }

  const isLotteryTicket = confidence >= 50; // Threshold: 50% confidence

  return {
    isLotteryTicket,
    ticketType: hasScratchTerm ? "scratcher" : (isLotteryTicket ? "draw" : null),
    state,
    ticketNumber,
    gameName,
    confidence,
    indicators
  };
}

/**
 * Generate a unique hash for a lottery ticket to prevent duplicate scans
 * Combines ticket number, state, and expiry date (if available)
 */
export function generateLotteryTicketHash(
  ticketNumber: string | null,
  state: string | null,
  ocrText: string
): string {
  // Use ticket number + state + truncated OCR text for hash
  const hashInput = `${ticketNumber || "unknown"}-${state || "unknown"}-${ocrText.slice(0, 100)}`;
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/**
 * Check if a lottery ticket has already been scanned
 */
export async function isLotteryTicketDuplicate(
  ticketHash: string,
  supabase: any
): Promise<boolean> {
  const { data, error } = await supabase
    .from("lottery_tickets")
    .select("id")
    .eq("ticket_hash", ticketHash)
    .single();

  return !!data && !error;
}

/**
 * Record a scanned lottery ticket to prevent future duplicates
 */
export async function recordLotteryTicket(
  ticketHash: string,
  detectionResult: LotteryDetectionResult,
  userEmail: string | null,
  telegramId: string | null,
  walletAddress: string | null,
  supabase: any
): Promise<void> {
  await supabase
    .from("lottery_tickets")
    .insert({
      ticket_hash: ticketHash,
      ticket_number: detectionResult.ticketNumber,
      state: detectionResult.state,
      game_name: detectionResult.gameName,
      ticket_type: detectionResult.ticketType,
      confidence_score: detectionResult.confidence,
      indicators: detectionResult.indicators,
      user_email: userEmail,
      telegram_id: telegramId,
      wallet_address: walletAddress,
      scanned_at: new Date().toISOString()
    });
}
