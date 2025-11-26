
import { createClient } from '@supabase/supabase-js';

// Client-side: safe for browser (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Server-side: only define supabaseAdmin if not running in the browser
let supabaseAdmin: ReturnType<typeof createClient> | undefined = undefined;
if (typeof window === 'undefined') {
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
export { supabaseAdmin };

