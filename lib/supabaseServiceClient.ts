import { createClient } from '@supabase/supabase-js';
import { envServer } from './env.server';

// This client uses the Supabase service role key and MUST only be used on the server.
if (typeof window !== 'undefined') {
  throw new Error('supabaseService must only be imported/used on the server');
}

export const supabaseService = createClient(
  envServer.supabaseUrl,
  envServer.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
