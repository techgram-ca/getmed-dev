import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  }

  return { error: null, user };
}
