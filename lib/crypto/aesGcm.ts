import crypto from 'crypto';
import { envServer } from '../env.server';

const ALGO = 'aes-256-gcm';
const ensureWalletKey = () => {
  if (!envServer.walletEncryptionKey) {
    throw new Error('Missing RECEIPTX_WALLET_ENC_KEY for wallet encryption.');
  }
};

export function encryptPrivateKey(plain: Buffer | string) {
  ensureWalletKey();
  const key = Buffer.from(envServer.walletEncryptionKey, 'base64');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.isBuffer(plain) ? plain : Buffer.from(plain, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptPrivateKey(enc: { iv: string; tag: string; ciphertext: string }): Buffer {
  ensureWalletKey();
  const key = Buffer.from(envServer.walletEncryptionKey, 'base64');
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const ciphertext = Buffer.from(enc.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain;
}

export default { encryptPrivateKey, decryptPrivateKey };
