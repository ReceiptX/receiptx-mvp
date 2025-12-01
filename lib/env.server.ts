function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const envServer = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  ocrWebhookSecret: requireEnv('RECEIPTX_OCR_WEBHOOK_SECRET'),
  internalApiSecret: requireEnv('RECEIPTX_INTERNAL_API_SECRET'),

  tenantId: requireEnv('RECEIPTX_TENANT_ID'),
  tenantSalt: requireEnv('RECEIPTX_TENANT_SALT'),
  tenantPepper: requireEnv('RECEIPTX_TENANT_PEPPER'),
  walletEncryptionKey: requireEnv('RECEIPTX_WALLET_ENC_KEY'), // base64 32 bytes
};

export default envServer;
