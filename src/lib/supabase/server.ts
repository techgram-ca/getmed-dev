import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Regular server client — uses session cookies for auth.
 * RLS applies based on the logged-in user's JWT.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — handled by middleware
          }
        },
      },
    }
  );
}

/**
 * Admin client — uses the secret key directly with NO cookie-based auth.
 * This is the only way to guarantee the service role key bypasses RLS.
 * Using createServerClient (SSR) with cookies would let the user's session JWT
 * override the secret key, causing RLS to apply and filtering out pending rows.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY environment variable. ' +
      'The admin client requires the secret key to bypass Row Level Security.'
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
