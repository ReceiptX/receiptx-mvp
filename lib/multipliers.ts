export type BrandKey =
  | "starbucks"
  | "circle_k"
  | "mcdonalds"
  | "walmart"
  | "target";

export interface BrandMultiplierConfig {
  key: BrandKey;
  displayName: string;
  // What appears on receipts (upper/lower/mixed)
  aliases: string[];
  // Menu items, product codes, or unique identifiers (case-insensitive)
  menuItems?: string[];
  // Receipt formatting patterns unique to this brand
  patterns?: RegExp[];
  // Multiplier applied when at least one item from this brand appears
  multiplier: number;
  // Whether this brand is currently live in the engine
  isActive: boolean;
  phase: "mvp" | "phase2";
  // Optional notes for analytics / dashboard
  category?: string;
}

export const BRAND_CONFIG: Record<BrandKey, BrandMultiplierConfig> = {
  starbucks: {
    key: "starbucks",
    displayName: "Starbucks",
    aliases: ["STARBUCKS", "STARBKS", "STBX", "SBX"],
    menuItems: [
      // Signature drinks
      "PIKE PLACE", "BLONDE ROAST", "DARK ROAST", "ICED COFFEE",
      "CAFFE LATTE", "CAPPUCCINO", "MACCHIATO", "FRAPPUCCINO",
      "JAVA CHIP", "CARAMEL FRAP", "MOCHA FRAP",
      // Food items
      "BUTTER CROISSANT", "MORNING BUN", "CAKE POP",
      "BACON GOUDA", "DOUBLE SMOKED",
      // Unique terms
      "VENTI", "GRANDE", "TALL", "TRENTA"
    ],
    patterns: [
      /STORE\s*#\s*\d{5}/i, // "STORE # 12345"
      /BARISTA:\s*\w+/i     // "BARISTA: NAME"
    ],
    multiplier: 1.5,
    isActive: true,
    phase: "mvp",
    category: "coffee",
  },
  circle_k: {
    key: "circle_k",
    displayName: "Circle K",
    aliases: ["CIRCLE K", "CIRCLE-K", "CIRCLEK", "CRCL K"],
    menuItems: [
      "POLAR POP", "FROSTER", "THIRST BUSTER",
      "UNLEADED", "PREMIUM", "DIESEL", "DEF",
      "FOUNTAIN", "SLURPEE"
    ],
    patterns: [
      /PUMP\s*#?\s*\d{1,2}/i,        // "PUMP # 5" or "PUMP 5"
      /GALLON/i,                      // Gas purchases
      /GRADE:\s*(REG|PREM|MID)/i     // "GRADE: REG"
    ],
    multiplier: 1.5,
    isActive: true,
    phase: "mvp",
    category: "gas_convenience",
  },
  mcdonalds: {
    key: "mcdonalds",
    displayName: "McDonald's",
    aliases: ["MCDONALD'S", "MCDONALD", "MCDONALDS", "MC DONALD", "MC DONALDS", "M C DONALD"],
    menuItems: [
      // Burgers & sandwiches
      "BIG MAC", "QUARTER POUNDER", "QTR PNDR", "MCDOUBLE", "MC DOUBLE",
      "FILET O FISH", "MCCHICKEN", "MC CHICKEN", "CRISPY CHICKEN",
      // Breakfast
      "EGG MCMUFFIN", "SAUSAGE BISCUIT", "HASH BROWN", "HOTCAKES",
      "BACON EGG CHEESE", "MCGRIDDLE", "MC GRIDDLE",
      // Sides & drinks
      "FRENCH FRY", "WORLD FAMOUS FRIES", "MCNUGGET", "MC NUGGET",
      "HAPPY MEAL", "COCA COLA", "SPRITE", "HI-C",
      // Desserts
      "MCFLURRY", "MC FLURRY", "APPLE PIE", "MCAFE", "MCCAFE",
      "CARAMEL FRAPPE", "MOCHA FRAPPE",
      // Unique codes
      "M DOUBLE", "QPC", "DQPC"
    ],
    patterns: [
      /ORDER\s*#\s*\d+/i,           // "ORDER # 123"
      /FRONT\s*COUNTER/i,            // "FRONT COUNTER"
      /DRIVE\s*THRU/i,               // "DRIVE THRU"
      /\$\d+\.\d{2}\s+CASH\s+TEND/i // McDonald's specific cash format
    ],
    multiplier: 1.5,
    isActive: true,
    phase: "mvp",
    category: "quick_service",
  },
  walmart: {
    key: "walmart",
    displayName: "Walmart",
    aliases: ["WALMART", "WM SUPERCENTER", "WAL-MART"],
    multiplier: 1.25,
    isActive: false,       // Phase 2: OFF at launch
    phase: "phase2",
    category: "big_box",
  },
  target: {
    key: "target",
    displayName: "Target",
    aliases: ["TARGET", "TARJAY"],
    multiplier: 1.5,
    isActive: false,       // Phase 2: OFF at launch
    phase: "phase2",
    category: "big_box",
  },
};

// Base rate: how many RWT per 1 unit of currency (e.g. per $1)
export const BASE_RWT_PER_CURRENCY_UNIT = 1;

// Strategy: take the highest multiplier among triggered brands.
// (You can easily swap to additive stacking later if you want.)
export function computeMultiplierFromBrands(triggeredBrands: BrandKey[]): number {
  if (!triggeredBrands.length) return 1.0;

  const activeConfigs = triggeredBrands
    .map((key) => BRAND_CONFIG[key])
    .filter((cfg) => cfg && cfg.isActive);

  if (!activeConfigs.length) return 1.0;

  return activeConfigs.reduce(
    (max, cfg) => (cfg.multiplier > max ? cfg.multiplier : max),
    1.0
  );
}

/**
 * Detect brand from OCR text using multi-strategy detection:
 * 1. Direct brand name aliases (header/footer)
 * 2. Menu items and product identifiers
 * 3. Receipt formatting patterns
 * 
 * Returns the brand key if found, null otherwise
 * Uses confidence scoring to handle ambiguous cases
 */
export function detectBrandFromText(text: string): BrandKey | null {
  const normalizedText = text.toUpperCase();
  
  // Strategy 1: Check brand name aliases (longest first)
  const brandCandidates: Array<{ key: BrandKey; alias: string; length: number }> = [];
  
  for (const [key, config] of Object.entries(BRAND_CONFIG)) {
    if (!config.isActive) continue;
    
    for (const alias of config.aliases) {
      brandCandidates.push({
        key: key as BrandKey,
        alias: alias,
        length: alias.length
      });
    }
  }
  
  brandCandidates.sort((a, b) => b.length - a.length);
  
  for (const candidate of brandCandidates) {
    if (normalizedText.includes(candidate.alias)) {
      console.log(`🏷️ Brand detected via name: ${candidate.key} (matched "${candidate.alias}")`);
      return candidate.key;
    }
  }
  
  // Strategy 2: Check menu items and product identifiers
  const menuItemScores: Partial<Record<BrandKey, number>> = {};
  
  for (const [key, config] of Object.entries(BRAND_CONFIG)) {
    if (!config.isActive || !config.menuItems) continue;
    
    let matchCount = 0;
    const matchedItems: string[] = [];
    
    for (const menuItem of config.menuItems) {
      if (normalizedText.includes(menuItem)) {
        matchCount++;
        matchedItems.push(menuItem);
      }
    }
    
    if (matchCount > 0) {
      menuItemScores[key as BrandKey] = matchCount;
      console.log(`🍔 Menu items detected for ${key}: ${matchedItems.join(", ")} (${matchCount} matches)`);
    }
  }
  
  // Strategy 3: Check receipt patterns
  const patternScores: Partial<Record<BrandKey, number>> = {};
  
  for (const [key, config] of Object.entries(BRAND_CONFIG)) {
    if (!config.isActive || !config.patterns) continue;
    
    let matchCount = 0;
    
    for (const pattern of config.patterns) {
      if (pattern.test(normalizedText)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      patternScores[key as BrandKey] = matchCount;
      console.log(`📋 Receipt patterns detected for ${key}: ${matchCount} matches`);
    }
  }
  
  // Combine scores: menu items (weight 1) + patterns (weight 2)
  const totalScores: Partial<Record<BrandKey, number>> = {};
  
  for (const key of Object.keys(BRAND_CONFIG) as BrandKey[]) {
    const menuScore = menuItemScores[key] || 0;
    const patternScore = (patternScores[key] || 0) * 2; // Patterns are more reliable
    const total = menuScore + patternScore;
    
    if (total > 0) {
      totalScores[key] = total;
    }
  }
  
  // Return brand with highest confidence score (minimum 2 to avoid false positives)
  const sortedBrands = Object.entries(totalScores)
    .sort(([, a], [, b]) => (b as number) - (a as number));
  
  if (sortedBrands.length > 0 && sortedBrands[0][1] >= 2) {
    const detectedBrand = sortedBrands[0][0] as BrandKey;
    console.log(`🎯 Brand detected via items/patterns: ${detectedBrand} (confidence: ${sortedBrands[0][1]})`);
    return detectedBrand;
  }
  
  console.log("❓ No brand detected in receipt");
  return null;
}

/**
 * Get multiplier for a specific brand
 */
export function getBrandMultiplier(brand: BrandKey | null): number {
  if (!brand) return 1.0;
  
  const config = BRAND_CONFIG[brand];
  if (!config || !config.isActive) return 1.0;
  
  return config.multiplier;
}

/**
 * Get display name for a brand key
 */
export function getBrandDisplayName(brand: BrandKey | null): string {
  if (!brand) return "Unknown";
  return BRAND_CONFIG[brand]?.displayName || "Unknown";
}

/**
 * Get all active brands for MVP
 */
export function getActiveBrands(): BrandMultiplierConfig[] {
  return Object.values(BRAND_CONFIG).filter(cfg => cfg.isActive);
}

/**
 * Get all Phase 2 brands (coming soon)
 */
export function getPhase2Brands(): BrandMultiplierConfig[] {
  return Object.values(BRAND_CONFIG).filter(cfg => cfg.phase === "phase2");
}
