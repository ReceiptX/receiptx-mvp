import crypto from 'crypto';
import { envServer } from '../env.server';
import { Wallet } from 'ethers';

export function deriveWalletEntropy(userId: string): Buffer {
  const { tenantSalt, tenantPepper } = envServer as any;

  const baseKey = crypto.pbkdf2Sync(
    userId + tenantPepper,
    tenantSalt,
    100_000,
    32,
    'sha512'
  );

  const prk = crypto.createHmac('sha256', tenantSalt).update(baseKey).digest();
  const okm = crypto.createHmac('sha256', prk).update('wallet').digest();

  return okm;
}

/**
 * Deterministically derive a secp256k1 private key from entropy and produce
 * an EVM-compatible wallet (address/publicKey/privateKey). Prefer using the
 * official Supra SDK if available; otherwise fall back to ethers-based derivation.
 */
export function createSupraKeypairFromEntropy(entropy: Buffer): {
  address: string;
  publicKey: string;
  privateKey: string;
} {
  // Derive a 32-byte private key from entropy with HMAC to ensure uniformity.
  const h = crypto.createHmac('sha256', 'supra-key-derivation').update(entropy).digest();

  // Ensure the private key is 32 bytes and non-zero.
  let privateKey = h;
  if (privateKey.length !== 32) privateKey = Buffer.concat([privateKey]).slice(0, 32);

  const privHex = '0x' + privateKey.toString('hex');

  // Try to use Supra SDK if available to construct the address in their preferred format.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const supra = require('supra-l1-sdk');
    if (supra && typeof supra.generateWalletFromPrivateKey === 'function') {
      // If the SDK exposes a helper, use it. This call is defensive — the SDK
      // shape may differ, so we fall back to ethers if this fails.
      const w = supra.generateWalletFromPrivateKey(privHex);
      if (w && w.address) {
        return {
          address: w.address,
          publicKey: w.publicKey || w.pubKey || '',
          privateKey: privHex,
        };
      }
    }
  } catch (e) {
    // ignore and fallback to ethers
  }

  // Fallback: use ethers to build an EVM wallet (secp256k1)
  const wallet = new Wallet(privHex);

  return {
    address: wallet.address,
    publicKey: (wallet as any).publicKey || '',
    privateKey: wallet.privateKey,
  };
}

export default { deriveWalletEntropy, createSupraKeypairFromEntropy };
