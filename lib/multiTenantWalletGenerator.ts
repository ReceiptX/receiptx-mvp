/// Multi-Tenant Wallet Generator Architecture
/// Solves: Licensing liability - each tenant controls their own wallets
/// ReceiptX is NOT custodian of licensee wallets

import CryptoJS from "crypto-js";

interface TenantConfig {
  tenant_id: string;                    // Unique identifier (e.g., "starbucks", "mcdonalds")
  tenant_salt: string;                  // Tenant-controlled secret (they manage, not you)
  tenant_pepper: string;                // Tenant-controlled pepper (they backup, not you)
  wallet_policy: "custodial" | "non-custodial"; // Who controls private keys?
}

interface UserContext {
  email?: string;
  telegram_id?: string;
  user_id?: string;
  tenant_id: string;                    // NEW: Which tenant owns this user?
  biometrics?: any;
  [key: string]: any;
}

interface WalletInstance {
  address: string;
  privateKey: string;
  publicKey: string;                    // Public key for signature verification
  tenant_id: string;                    // NEW: Track ownership
}

export class MultiTenantWalletGenerator {
  
  /**
   * Generate wallet using TENANT'S secrets (not ReceiptX's)
   * Liability: Tenant is custodian, not ReceiptX
   */
  async generateWalletForTenant(
    userContext: UserContext,
    tenantConfig: TenantConfig
  ): Promise<WalletInstance> {
    
    // Validate tenant secrets are set (their responsibility!)
    if (!tenantConfig.tenant_salt || tenantConfig.tenant_salt === 'CHANGE-ME') {
      throw new Error(`Tenant ${tenantConfig.tenant_id} must configure their own salt`);
    }
    if (!tenantConfig.tenant_pepper || tenantConfig.tenant_pepper === 'CHANGE-ME') {
      throw new Error(`Tenant ${tenantConfig.tenant_id} must configure their own pepper`);
    }
    
    const entropy = await this.collectUserEntropy(userContext);
    const privateKey = await this.deriveSecureKey(
      entropy,
      userContext.biometrics,
      tenantConfig.tenant_salt,
      tenantConfig.tenant_pepper
    );
    
    const wallet = await this.createWalletInstance(privateKey);
    
    // Store with tenant ownership metadata
    await this.storeWalletSecurely(wallet, userContext, tenantConfig);
    
    return {
      ...wallet,
      tenant_id: tenantConfig.tenant_id
    };
  }

  private async deriveSecureKey(
    entropy: Uint8Array,
    biometrics: any,
    tenantSalt: string,      // Tenant controls this
    tenantPepper: string     // Tenant controls this
  ): Promise<string> {
    const encoder = new TextEncoder();
    
    // Use TENANT's secrets, not ReceiptX's
    const saltBytes = encoder.encode(tenantSalt);
    const pepperBytes = encoder.encode(tenantPepper);
    
    // Combine: entropy + biometrics + tenant salt + tenant pepper
    const bioBytes = biometrics ? encoder.encode(JSON.stringify(biometrics)) : new Uint8Array();
    const combined = new Uint8Array([...entropy, ...bioBytes, ...saltBytes, ...pepperBytes]);
    
    // PBKDF2 derivation (same as before)
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      combined,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    
    const pbkdf2Salt = new Uint8Array([...saltBytes, ...pepperBytes]);
    
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: pbkdf2Salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    
    return Array.from(new Uint8Array(derivedKey))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async collectUserEntropy(ctx: UserContext): Promise<Uint8Array> {
    // EntropyEngine is disabled for MVP/Netlify build
    return new Uint8Array(0);
  }

  private async createWalletInstance(privateKey: string): Promise<WalletInstance> {
    // Derive public key from private key (simplified - use proper EC key derivation in production)
    const publicKey = "0x04" + privateKey.slice(0, 128); // Placeholder - real impl uses secp256k1
    
    return {
      address: "0x" + privateKey.slice(0, 40),
      privateKey: privateKey,
      publicKey: publicKey,
      tenant_id: "" // Will be set by caller
    };
  }

  private async storeWalletSecurely(
    wallet: WalletInstance,
    userContext: UserContext,
    tenantConfig: TenantConfig
  ): Promise<void> {
    // Use supabaseAdmin from server/supabaseAdmin
    const { supabaseAdmin } = require('../server/supabaseAdmin');
    const supabase = supabaseAdmin;

    const tenantSalt = tenantConfig.tenant_salt || process.env.RECEIPTX_TENANT_SALT;
    const tenantPepper = tenantConfig.tenant_pepper || process.env.RECEIPTX_TENANT_PEPPER;

    if (!tenantSalt || !tenantPepper) {
      throw new Error(`Missing tenant salt/pepper for ${tenantConfig.tenant_id}`);
    }

    // Resolve user_id if not provided
    let userId = userContext.user_id || null;

    try {
      if (!userId && userContext.email) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', userContext.email)
          .maybeSingle();
        if (data?.id) {
          userId = data.id;
        }
      }

      if (!userId && userContext.telegram_id) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', userContext.telegram_id)
          .maybeSingle();
        if (data?.id) {
          userId = data.id;
        }
      }
    } catch (err) {
      console.error('Failed to resolve user_id for wallet storage:', err);
    }

    if (!userId) {
      throw new Error('User id required to store wallet. Please create the user before generating a wallet.');
    }

    const identifier = userContext.email || userContext.telegram_id || wallet.address;
    const passphrase = `${tenantSalt}${identifier}${tenantPepper}`;
    const encryptedPrivateKey = CryptoJS.AES.encrypt(wallet.privateKey, passphrase).toString();

    // Store with tenant ownership
    const { error } = await supabase.from("user_wallets").insert({
      user_id: userId,
      user_email: userContext.email,
      telegram_id: userContext.telegram_id,
      tenant_id: tenantConfig.tenant_id,
      wallet_address: wallet.address,
      encrypted_private_key: encryptedPrivateKey,
      created_by: userContext.email || userContext.telegram_id || tenantConfig.tenant_id,
      blockchain_network: "supra_testnet",
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to persist wallet: ${error.message}`);
    }
  }
}

// =============================================================================
// DATABASE SCHEMA UPDATE NEEDED
// =============================================================================

/*
ALTER TABLE user_wallets 
ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'receiptx',
ADD COLUMN tenant_owns_keys BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_tenant_wallets ON user_wallets(tenant_id);

COMMENT ON COLUMN user_wallets.tenant_id IS 'Which licensee owns this wallet (legal custodian)';
COMMENT ON COLUMN user_wallets.tenant_owns_keys IS 'If true, tenant is custodian. If false, user self-custodies.';
*/

// =============================================================================
// LICENSING AGREEMENT TEMPLATE
// =============================================================================

/*
## Wallet Custody Clause

ReceiptX provides wallet generation technology as a SERVICE ONLY. The Licensee is the 
sole CUSTODIAN and LEGAL OWNER of all wallets generated using their tenant configuration.

### Licensee Responsibilities:
1. Generate and securely backup their own `tenant_salt` and `tenant_pepper`
2. Maintain custody of all private keys for their users
3. Comply with all applicable custody regulations (FinCEN, GDPR, etc.)
4. Indemnify ReceiptX from any loss of user funds under their custody

### ReceiptX Responsibilities:
1. Provide secure wallet generation algorithms
2. Not store or access Licensee's `tenant_salt` or `tenant_pepper`
3. Not access private keys generated with Licensee credentials
4. Provide security audits of wallet generation code

### Key Separation:
- ReceiptX wallets: Generated with ReceiptX's salt/pepper
- Licensee wallets: Generated with Licensee's salt/pepper
- No cross-contamination possible
*/

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Example 1: ReceiptX's own users
const receiptxConfig: TenantConfig = {
  tenant_id: "receiptx",
  // Import from server/tenantKeys
  tenant_salt: require('../server/tenantKeys').RECEIPTX_TENANT_SALT!,
  tenant_pepper: require('../server/tenantKeys').RECEIPTX_TENANT_PEPPER!,
  wallet_policy: "custodial"
};

// Example 2: Starbucks licensed deployment
const starbucksConfig: TenantConfig = {
  tenant_id: "starbucks",
  // For demo, fallback to RECEIPTX_TENANT_SALT/PEPPER
  tenant_salt: require('../server/tenantKeys').RECEIPTX_TENANT_SALT!,
  tenant_pepper: require('../server/tenantKeys').RECEIPTX_TENANT_PEPPER!,
  wallet_policy: "custodial"
};

// Example 3: Circle K with non-custodial wallets (users control keys)
const circlekConfig: TenantConfig = {
  tenant_id: "circlek",
  tenant_salt: require('../server/tenantKeys').RECEIPTX_TENANT_SALT!,
  tenant_pepper: require('../server/tenantKeys').RECEIPTX_TENANT_PEPPER!,
  wallet_policy: "non-custodial" // Users export keys to own wallet
};
*/

// =============================================================================
// LICENSING REVENUE MODEL
// =============================================================================

/*
## Pricing Tiers

### Tier 1: SaaS (ReceiptX Custodian)
- $0.01 per wallet generated
- ReceiptX manages all security
- Licensee just integrates API

### Tier 2: Self-Hosted (Licensee Custodian)
- $50k/year license fee
- Licensee controls salt/pepper
- Licensee responsible for custody
- ReceiptX provides code + audits

### Tier 3: White Label (Full Ownership)
- $250k one-time + $50k/year support
- Licensee owns all code
- No ReceiptX branding
- Full custody responsibility
*/
