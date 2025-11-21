/**
 * ReceiptX Supra L1 Wallet Integration
 * Inspired by multi-wallet detection patterns for Web3 onboarding
 * Supports: StarKey (Supra Native), MetaMask, Privy Embedded, Email-based
 */

interface WalletDetectionResult {
  starkey: boolean;
  metamask: boolean;
  privy: boolean;
  email_based: boolean;
  available_wallets: string[];
  recommended_wallet: string;
  confidence_score: number;
}

interface WalletConnectionResult {
  success: boolean;
  wallet_type: 'starkey' | 'metamask' | 'privy' | 'email_deterministic' | 'none';
  address?: string;
  provider?: any;
  onboarding_time_ms: number;
  error?: string;
}

export class SupraWalletIntegration {
  
  /**
   * Comprehensive wallet detection for Supra L1
   * Detects all available wallet options for optimal UX
   */
  static async detectAvailableWallets(): Promise<WalletDetectionResult> {
    const result: WalletDetectionResult = {
      starkey: false,
      metamask: false,
      privy: false,
      email_based: true, // Always available
      available_wallets: ['email_deterministic'],
      recommended_wallet: 'email_deterministic',
      confidence_score: 0
    };

    if (typeof window === 'undefined') {
      return result; // Server-side, return defaults
    }

    try {
      // Detect StarKey (Supra's native wallet)
      if ((window as any).starkey) {
        result.starkey = true;
        result.available_wallets.push('starkey');
        result.confidence_score += 40;
        result.recommended_wallet = 'starkey'; // Native wallet is best
      }

      // Detect MetaMask (Supra-compatible via EVM)
      if ((window as any).ethereum?.isMetaMask) {
        result.metamask = true;
        result.available_wallets.push('metamask');
        result.confidence_score += 30;
        
        // Check if Supra network is configured
        try {
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          // Supra Testnet: 0x6, Supra Mainnet: 0x1 (example IDs)
          if (chainId === '0x6' || chainId === '0x1') {
            result.confidence_score += 10;
          }
        } catch (e) {
          // Ignore chain detection errors
        }
      }

      // Detect Privy (if initialized)
      if ((window as any).Privy || typeof (window as any).privy !== 'undefined') {
        result.privy = true;
        result.available_wallets.push('privy');
        result.confidence_score += 20;
      }

      // If no external wallets, recommend email-based
      if (result.available_wallets.length === 1) {
        result.recommended_wallet = 'email_deterministic';
        result.confidence_score += 10; // Always available baseline
      }

    } catch (error) {
      console.error('Wallet detection error:', error);
    }

    return result;
  }

  /**
   * Connect to StarKey wallet (Supra native)
   */
  static async connectStarKey(): Promise<WalletConnectionResult> {
    const startTime = Date.now();
    
    try {
      if (typeof window === 'undefined' || !(window as any).starkey) {
        return {
          success: false,
          wallet_type: 'none',
          onboarding_time_ms: Date.now() - startTime,
          error: 'StarKey wallet not detected. Please install StarKey browser extension.'
        };
      }

      // Request connection
      const response = await (window as any).starkey.connect();
      
      return {
        success: true,
        wallet_type: 'starkey',
        address: response.address || response.accounts?.[0],
        provider: (window as any).starkey,
        onboarding_time_ms: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        wallet_type: 'none',
        onboarding_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'StarKey connection failed'
      };
    }
  }

  /**
   * Connect to MetaMask with Supra network configuration
   */
  static async connectMetaMask(): Promise<WalletConnectionResult> {
    const startTime = Date.now();
    
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        return {
          success: false,
          wallet_type: 'none',
          onboarding_time_ms: Date.now() - startTime,
          error: 'MetaMask not detected. Please install MetaMask browser extension.'
        };
      }

      // Request accounts
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Try to add Supra network if not already added
      try {
        await this.addSupraNetwork();
      } catch (e) {
        console.warn('Could not add Supra network:', e);
      }

      return {
        success: true,
        wallet_type: 'metamask',
        address: accounts[0],
        provider: (window as any).ethereum,
        onboarding_time_ms: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        wallet_type: 'none',
        onboarding_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'MetaMask connection failed'
      };
    }
  }

  /**
   * Add Supra network to MetaMask
   */
  static async addSupraNetwork(): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not available');
    }

    const supraNetwork = {
      chainId: '0x6', // Supra Testnet (adjust for mainnet)
      chainName: 'Supra Testnet',
      nativeCurrency: {
        name: 'Supra',
        symbol: 'SUPRA',
        decimals: 18
      },
      rpcUrls: [process.env.SUPRA_TESTNET_RPC || 'https://rpc-testnet.supra.com'],
      blockExplorerUrls: ['https://explorer-testnet.supra.com']
    };

    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [supraNetwork]
    });
  }

  /**
   * Smart wallet connection - automatically selects best available option
   */
  static async smartConnect(
    preferredWallet?: 'starkey' | 'metamask' | 'privy' | 'email_deterministic'
  ): Promise<WalletConnectionResult> {
    
    // Detect available wallets
    const detection = await this.detectAvailableWallets();
    
    // Use preferred wallet if available
    if (preferredWallet) {
      if (preferredWallet === 'starkey' && detection.starkey) {
        return this.connectStarKey();
      }
      if (preferredWallet === 'metamask' && detection.metamask) {
        return this.connectMetaMask();
      }
      if (preferredWallet === 'privy' && detection.privy) {
        // Use Privy's connect method
        return {
          success: true,
          wallet_type: 'privy',
          onboarding_time_ms: 0,
          error: 'Use Privy hook: const { login } = usePrivy(); await login();'
        };
      }
      if (preferredWallet === 'email_deterministic') {
        return {
          success: true,
          wallet_type: 'email_deterministic',
          onboarding_time_ms: 0,
          error: 'Use EmailDeterministicWallet.generateFromEmail(email)'
        };
      }
    }

    // Auto-select based on detection
    if (detection.starkey) {
      return this.connectStarKey();
    }
    if (detection.metamask) {
      return this.connectMetaMask();
    }
    if (detection.privy) {
      return {
        success: true,
        wallet_type: 'privy',
        onboarding_time_ms: 0,
        error: 'Use Privy hook'
      };
    }

    // Fallback to email-based (always available)
    return {
      success: true,
      wallet_type: 'email_deterministic',
      onboarding_time_ms: 0
    };
  }

  /**
   * Store wallet connection in database
   */
  static async storeWalletConnection(
    connection: WalletConnectionResult,
    user_email?: string,
    telegram_id?: string
  ): Promise<void> {
    if (!connection.success || !connection.address) {
      return;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if wallet already exists
    const { data: existing } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("wallet_address", connection.address)
      .maybeSingle();

    if (existing) {
      console.log('Wallet already registered:', connection.address);
      return;
    }

    // Insert new wallet
    await supabase.from("user_wallets").insert({
      user_email: user_email || null,
      telegram_id: telegram_id || null,
      wallet_address: connection.address,
      encrypted_private_key: null, // External wallet, no private key stored
      blockchain_network: "supra_testnet",
      derivation_path: connection.wallet_type,
      metadata: {
        wallet_type: connection.wallet_type,
        connected_at: new Date().toISOString(),
        onboarding_time_ms: connection.onboarding_time_ms,
        is_external_wallet: connection.wallet_type !== 'email_deterministic'
      }
    });
  }

  /**
   * Get wallet connection status for user
   */
  static async getUserWallet(
    user_email?: string,
    telegram_id?: string
  ): Promise<{
    has_wallet: boolean;
    wallet_type?: string;
    wallet_address?: string;
  }> {
    if (!user_email && !telegram_id) {
      return { has_wallet: false };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from("user_wallets").select("wallet_address, derivation_path");
    
    if (user_email) {
      query = query.eq("user_email", user_email);
    } else if (telegram_id) {
      query = query.eq("telegram_id", telegram_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return { has_wallet: false };
    }

    return {
      has_wallet: true,
      wallet_type: data.derivation_path,
      wallet_address: data.wallet_address
    };
  }
}

// =============================================================================
// REACT HOOKS FOR WALLET INTEGRATION
// =============================================================================

/**
 * Custom hook for wallet connection in React components
 * Usage:
 * 
 * const { wallets, connect, connecting, connected, address } = useSupraWallet();
 * 
 * if (wallets.starkey) {
 *   await connect('starkey');
 * }
 */
export function useSupraWalletHook() {
  // This would be implemented as a React hook
  // For now, providing the structure
  return {
    detectWallets: SupraWalletIntegration.detectAvailableWallets,
    connect: SupraWalletIntegration.smartConnect,
    connectStarKey: SupraWalletIntegration.connectStarKey,
    connectMetaMask: SupraWalletIntegration.connectMetaMask
  };
}

// =============================================================================
// API ROUTE INTEGRATION EXAMPLE
// =============================================================================

/*
// app/api/wallet/connect-external/route.ts

import { SupraWalletIntegration } from '@/lib/supraWalletIntegration';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { wallet_type, address, user_email, telegram_id } = await req.json();

  const connection: WalletConnectionResult = {
    success: true,
    wallet_type: wallet_type,
    address: address,
    onboarding_time_ms: 0
  };

  await SupraWalletIntegration.storeWalletConnection(
    connection,
    user_email,
    telegram_id
  );

  return NextResponse.json({ success: true, address });
}
*/

// Export helper functions for use in other modules
export const detectAvailableWallets = SupraWalletIntegration.detectAvailableWallets;
export const smartConnect = SupraWalletIntegration.smartConnect;
