import { createClient } from '@supabase/supabase-js';

// Server-only Supabase admin client
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
