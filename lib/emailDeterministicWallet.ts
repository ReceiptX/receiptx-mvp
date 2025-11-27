// --- Security Helper: AES-GCM Encryption for Private Keys ---
async function encryptPrivateKey(privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  // Import secretKey from server/tenantKeys or fallback
  let secretKey: string;
  try {
    secretKey = require('../server/tenantKeys').RECEIPTX_TENANT_SALT;
  } catch {
    secretKey = 'default-secret-key';
  }
  const keyData = encoder.encode(secretKey);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyData),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString('base64');
}
/// Email-Based Deterministic Wallet Generation
/// Implements Patent Application #1: "Method and System for Deterministic 
/// Cryptocurrency Wallet Creation from Email Addresses"
/// 
/// CRITICAL PATENT CLAIMS:
/// 1. Deterministic wallet generation from email addresses
/// 2. Secure private key derivation without user interaction
/// 3. Wallet recovery using only email (no seed phrases)
/// 4. Cryptographic process maintaining security with simplicity

import { ethers } from 'ethers';

interface DeterministicWalletResult {
  address: string;
  privateKey: string;
  publicKey: string;
  derivation_method: 'email_deterministic';
  can_recover: true;
  recovery_input: 'email_only';
}

export class EmailDeterministicWallet {
  
  /**
   * Generate deterministic wallet from email address
   * 
   * PATENT CLAIM: This method creates reproducible wallets where:
   * - Same email always produces same wallet
   * - User can recover wallet by re-entering email
   * - No seed phrases or key management required
   * 
   * SECURITY: Uses email + application pepper for key derivation
   * - Email alone is not enough (requires pepper secret)
   * - Pepper is server-side constant, never exposed
   * - 100k PBKDF2 iterations for brute-force resistance
   */
  static async generateFromEmail(email: string): Promise<DeterministicWalletResult> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get application pepper (server-side secret)
    // Import pepper from server/tenantKeys
    let pepper: string | undefined;
    try {
      pepper = require('../server/tenantKeys').RECEIPTX_TENANT_PEPPER;
    } catch {}
    if (!pepper) {
      throw new Error('RECEIPTX_TENANT_PEPPER not configured');
    }
    
    // Derive private key using PBKDF2
    const privateKey = await this.deriveKeyFromEmail(normalizedEmail, pepper);
    
    // Create Ethereum/Supra wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Derive public key from the signing key
    const publicKey = wallet.signingKey.publicKey;
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: publicKey,
      derivation_method: 'email_deterministic',
      can_recover: true,
      recovery_input: 'email_only'
    };
  }

  /**
   * Derive cryptographic key from email using PBKDF2
   * 
   * PATENT NOVELTY: Deterministic derivation that:
   * - Produces valid secp256k1 private keys
   * - Is reproducible across sessions
   * - Requires server pepper (not just email)
   * - Uses 100k iterations for security
   */
  private static async deriveKeyFromEmail(
    email: string,
    pepper: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    
    // Combine email with pepper
    const input = encoder.encode(email + pepper);
    
    // Use email hash as salt (deterministic)
    const emailHash = await crypto.subtle.digest('SHA-256', encoder.encode(email));
    const salt = new Uint8Array(emailHash);
    
    // Import key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      input,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive 256-bit key
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // NIST recommended
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    // Convert to hex private key
    const privateKeyBytes = new Uint8Array(derivedBits);
    const privateKeyHex = '0x' + Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Validate it's a valid secp256k1 private key
    try {
      new ethers.Wallet(privateKeyHex);
    } catch (err) {
      throw new Error('Derived key is not a valid private key');
    }
    
    return privateKeyHex;
  }

  /**
   * Recover wallet from email (proof of deterministic generation)
   * 
   * PATENT CLAIM: Wallet recovery without seed phrases
   * User only needs to remember their email address
   */
  static async recoverFromEmail(email: string): Promise<DeterministicWalletResult> {
    // Same process as generation (deterministic)
    return this.generateFromEmail(email);
  }

  /**
   * Verify email owns a wallet address
   */
  static async verifyEmailOwnership(email: string, address: string): Promise<boolean> {
    try {
      const wallet = await this.generateFromEmail(email);
      return wallet.address.toLowerCase() === address.toLowerCase();
    } catch (err) {
      return false;
    }
  }

  /**
   * Store wallet in database with email linkage
   */
  static async storeWallet(
    email: string,
    wallet: DeterministicWalletResult,
    telegram_id?: string
  ): Promise<void> {
    const { createClient } = await import("@supabase/supabase-js");
    // Use supabaseAdmin from server/supabaseAdmin
    const { supabaseAdmin } = require('../server/supabaseAdmin');
    const supabase = supabaseAdmin;
    
    // Check if wallet already exists for this email
    const { data: existing } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("user_email", email)
      .maybeSingle();
    
    if (existing) {
      // Wallet already exists for email (do not log sensitive info in production)
      return; // Don't create duplicate
    }
    
    // Encrypt private key before storing (best practice)
    const encryptedKey = await encryptPrivateKey(wallet.privateKey);
    await supabase.from("user_wallets").insert({
      user_email: email,
      telegram_id: telegram_id || null,
      wallet_address: wallet.address,
      encrypted_private_key: encryptedKey,
      blockchain_network: "supra_testnet",
      derivation_path: "email_deterministic",
      metadata: {
        derivation_method: wallet.derivation_method,
        can_recover: wallet.can_recover,
        recovery_input: wallet.recovery_input,
        created_at: new Date().toISOString()
      }
    });
  }

  /**
   * Migrate existing users to email-based wallets
   * For users who already have wallets, this creates a deterministic backup
   */
  static async createRecoveryWallet(email: string): Promise<{
    recovery_address: string;
    can_recover_with_email: boolean;
  }> {
    const wallet = await this.generateFromEmail(email);
    
    return {
      recovery_address: wallet.address,
      can_recover_with_email: true
    };
  }
}

// =============================================================================
// PATENT ADVANTAGES OVER PRIOR ART
// =============================================================================

/*
## Comparison with Existing Solutions:

### MetaMask
- Requires: 12-word seed phrase management
- Recovery: Must backup seed phrase securely
- User Complexity: HIGH

### Coinbase Wallet  
- Requires: Understanding of wallet concepts
- Recovery: Seed phrase + iCloud backup
- User Complexity: MEDIUM

### Trust Wallet
- Requires: Manual seed phrase storage
- Recovery: User must have seed phrase
- User Complexity: HIGH

### Our Email-Based Solution (PATENT #1)
- Requires: Just email address (already familiar)
- Recovery: Re-enter email (+ server pepper)
- User Complexity: ZERO
- Novelty: No seed phrases, no key management, instant recovery

## Key Innovation:
Traditional wallets assume users will manage cryptographic secrets.
Our system eliminates this assumption entirely by deriving secrets
from information users already manage (email addresses).
*/

// =============================================================================
// SECURITY CONSIDERATIONS
// =============================================================================

/*
## Security Model:

### Attack Vector 1: Email Compromise
- Attacker gets user's email
- Attacker CANNOT derive wallet (needs server pepper)
- Mitigation: Pepper is server-side only, never exposed

### Attack Vector 2: Server Compromise  
- Attacker gets pepper from server
- Attacker still needs user emails
- Mitigation: Emails are public knowledge, but rate limiting + monitoring

### Attack Vector 3: Full Compromise (Email + Pepper)
- If both email AND pepper are known, wallet can be derived
- Mitigation: 
  1. Encrypt private keys in DB with user password (hybrid custody)
  2. Use multi-factor authentication for high-value transactions
  3. Implement spending limits for auto-derived wallets

### Best Practice for Production:
1. Email derivation for EASY RECOVERY
2. User password encryption for SECURITY  
3. 2FA for HIGH-VALUE TRANSACTIONS
4. Insurance fund for EDGE CASES
*/

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Example 1: Generate wallet during signup
import { EmailDeterministicWallet } from '@/lib/emailDeterministicWallet';

const wallet = await EmailDeterministicWallet.generateFromEmail('user@example.com');
console.log('Address:', wallet.address);
console.log('Can recover with email:', wallet.can_recover);

// Example 2: Recover lost wallet
const recovered = await EmailDeterministicWallet.recoverFromEmail('user@example.com');
console.log('Recovered address:', recovered.address);
// Same address as Example 1!

// Example 3: Verify ownership
const isOwner = await EmailDeterministicWallet.verifyEmailOwnership(
  'user@example.com',
  '0x123...'
);

// Example 4: Store in database
await EmailDeterministicWallet.storeWallet(
  'user@example.com',
  wallet,
  'telegram_id_123'
);
*/
