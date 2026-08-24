import { NextResponse } from 'next/server';
import { sql } from '@/db';
import { hashPassword, verifyPassword, createSession, destroySession, sameOrigin } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
const HANDLE = /^[a-z0-9._-]{3,20}$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, message: 'Bad origin.' }, { status: 403 });
  }
  const form = await req.formData();
  const action = String(form.get('action') || '');

  if (action === 'logout') {
    await destroySession();
    return NextResponse.redirect(new URL('/', req.url), 303);
  }

  const limit = await rateLimit(clientKey(req, 'auth'), 10, 900);
  if (!limit.ok) {
    return NextResponse.redirect(new URL('/login?e=Too+many+attempts.+Try+again+later.', req.url), 303);
  }

  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const fail = (m: string) =>
    NextResponse.redirect(new URL('/login?e=' + encodeURIComponent(m), req.url), 303);

  if (!EMAIL.test(email)) return fail('Enter a valid email address.');
  if (password.length < 12) return fail('Password must be at least 12 characters.');

  if (action === 'signup') {
    const handle = String(form.get('handle') || '').trim().toLowerCase();
    if (!HANDLE.test(handle)) return fail('Handle must be 3-20 characters: a-z, 0-9, dot, dash, underscore.');
    const [clash] = await sql`SELECT 1 FROM users WHERE email = ${email} OR handle = ${handle}`;
    if (clash) return fail('That email or handle is already taken.');
    const [user] = await sql`
      INSERT INTO users (email, handle, password_hash)
      VALUES (${email}, ${handle}, ${await hashPassword(password)})
      RETURNING id
    `;
    await createSession(Number(user.id));
    return NextResponse.redirect(new URL('/', req.url), 303);
  }

  const [user] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
  // Identical message either way, so this cannot enumerate accounts.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return fail('Email or password is incorrect.');
  }
  await createSession(Number(user.id));
  return NextResponse.redirect(new URL('/', req.url), 303);
}
