import { ethers } from 'ethers';

// RWT Token ABI (minimal interface)
const RWT_ABI = [
  "function mintFromReceipt(address user, uint256 receiptAmount, string brand, bytes32 receiptHash) returns (uint256)",
  "function calculateReward(uint256 receiptAmount, string brand) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function isReceiptProcessed(bytes32 receiptHash) view returns (bool)"
];

export class TokenService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer: ethers.Wallet | null = null;

  constructor() {
    const rpcUrl = process.env.SUPRA_TESTNET_RPC || 'https://rpc-testnet.supra.com';
    const contractAddress = process.env.RWT_CONTRACT_ADDRESS;

    if (!contractAddress) {
      throw new Error('RWT_CONTRACT_ADDRESS not set in environment');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, RWT_ABI, this.provider);

    // Initialize signer if private key available (for minting)
    const privateKey = process.env.RWT_MINTER_PRIVATE_KEY;
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = this.contract.connect(this.signer) as ethers.Contract;
    }
  }

  /**
   * Mint RWT tokens from receipt scan
   */
  async mintFromReceipt(
    userWalletAddress: string,
    receiptAmount: number,
    brand: string,
    receiptHash: string
  ): Promise<{ success: boolean; txHash?: string; tokens?: string; error?: string }> {
    try {
      if (!this.signer) {
        throw new Error('Minting requires RWT_MINTER_PRIVATE_KEY');
      }

      // Convert receipt hash to bytes32
      const hashBytes = ethers.id(receiptHash); // keccak256 hash

      // Check if already processed
      const isProcessed = await this.contract.isReceiptProcessed(hashBytes);
      if (isProcessed) {
        return {
          success: false,
          error: 'Receipt already processed on blockchain'
        };
      }

      // Mint tokens
      console.log(`🪙 Minting RWT for ${userWalletAddress}: $${receiptAmount} from ${brand}`);
      
      const tx = await this.contract.mintFromReceipt(
        userWalletAddress,
        receiptAmount,
        brand,
        hashBytes
      );

      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      // Get minted amount from return value
      const reward = await this.calculateReward(receiptAmount, brand);

      return {
        success: true,
        txHash: receipt.hash,
        tokens: ethers.formatEther(reward)
      };

    } catch (error: any) {
      console.error('Token minting error:', error);
      return {
        success: false,
        error: error.message || 'Token minting failed'
      };
    }
  }

  /**
   * Calculate reward without minting (preview)
   */
  async calculateReward(receiptAmount: number, brand: string): Promise<bigint> {
    return await this.contract.calculateReward(receiptAmount, brand);
  }

  /**
   * Get user's RWT balance
   */
  async getBalance(walletAddress: string): Promise<string> {
    const balance = await this.contract.balanceOf(walletAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get total RWT supply
   */
  async getTotalSupply(): Promise<string> {
    const supply = await this.contract.totalSupply();
    return ethers.formatEther(supply);
  }

  /**
   * Check if receipt already processed
   */
  async isReceiptProcessed(receiptHash: string): Promise<boolean> {
    const hashBytes = ethers.id(receiptHash);
    return await this.contract.isReceiptProcessed(hashBytes);
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contract.target as string;
  }
}

// Singleton instance
let tokenService: TokenService | null = null;

export function getTokenService(): TokenService {
  if (!tokenService) {
    tokenService = new TokenService();
  }
  return tokenService;
}
