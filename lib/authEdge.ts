import { createClient } from '@supabase/supabase-js';
import { envServer } from './env.server';

export async function getUserFromRequest(req: Request) {
  const authHeader = (req.headers.get('authorization') || '').trim();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;

  if (!token) return null;

  // Quick sanity check: a Compact JWS should have two '.' separators (header.payload.signature).
  // Protect downstream libraries (jose) from throwing on malformed input by returning null early.
  const compactJwsLike = typeof token === 'string' && token.split('.').length === 3;
  if (!compactJwsLike) return null;

  const supabase = createClient(envServer.supabaseUrl, envServer.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    return null;
  }
}

export default getUserFromRequest;
