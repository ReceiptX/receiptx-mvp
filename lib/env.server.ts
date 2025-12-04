function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

export const envServer = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  ocrWebhookSecret: optionalEnv('RECEIPTX_OCR_WEBHOOK_SECRET'),
  internalApiSecret: optionalEnv('RECEIPTX_INTERNAL_API_SECRET'),

  tenantId: optionalEnv('RECEIPTX_TENANT_ID', optionalEnv('NEXT_PUBLIC_RECEIPTX_TENANT_ID')),
  tenantSalt: requireEnv('RECEIPTX_TENANT_SALT'),
  tenantPepper: requireEnv('RECEIPTX_TENANT_PEPPER'),
  walletEncryptionKey: optionalEnv('RECEIPTX_WALLET_ENC_KEY'), // base64 32 bytes
};

export default envServer;
