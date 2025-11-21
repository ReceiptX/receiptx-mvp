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
    multiplier: 1.5,
    isActive: true,        // MVP: ON
    phase: "mvp",
    category: "coffee",
  },
  circle_k: {
    key: "circle_k",
    displayName: "Circle K",
    aliases: ["CIRCLE K", "CRCL K", "CIR K", "CK"],
    multiplier: 1.5,
    isActive: true,        // MVP: ON
    phase: "mvp",
    category: "gas_convenience",
  },
  mcdonalds: {
    key: "mcdonalds",
    displayName: "McDonald's",
    aliases: ["MCDONALD'S", "MCD", "MCDONALDS", "MC DONALDS"],
    multiplier: 1.5,
    isActive: true,        // MVP: ON
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
 * Detect brand from OCR text using aliases
 * Returns the brand key if found, null otherwise
 */
export function detectBrandFromText(text: string): BrandKey | null {
  const normalizedText = text.toUpperCase();
  
  for (const [key, config] of Object.entries(BRAND_CONFIG)) {
    if (!config.isActive) continue; // Only check active brands
    
    for (const alias of config.aliases) {
      if (normalizedText.includes(alias)) {
        return key as BrandKey;
      }
    }
  }
  
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
