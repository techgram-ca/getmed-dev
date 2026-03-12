import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin login validation endpoint.
 * Auth itself is handled client-side via createBrowserClient so the session
 * is stored where both browser and server Supabase clients can read it.
 * This route only validates that the attempted email matches ADMIN_EMAIL.
 */
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || email !== adminEmail) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
