import { NextResponse } from 'next/server';
import { placeBid } from '@/lib/bidding';
import { currentUser, sameOrigin } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, message: 'Bad origin.' }, { status: 403 });
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in to bid.' }, { status: 401 });
  }

  const ip = await rateLimit(clientKey(req, 'bid'), 30, 60);
  const per = await rateLimit('bid:user:' + user.id, 20, 60);
  if (!ip.ok || !per.ok) {
    return NextResponse.json(
      { ok: false, message: 'Slow down for a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(ip.retryAfter, per.retryAfter)) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const b = body as { auctionId?: unknown; maxDollars?: unknown } | null;
  const auctionId = Number(b?.auctionId);
  const dollars = Number(b?.maxDollars);
  if (!Number.isSafeInteger(auctionId) || auctionId <= 0) {
    return NextResponse.json({ ok: false, message: 'Unknown lot.' }, { status: 400 });
  }
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 1000000) {
    return NextResponse.json({ ok: false, message: 'Enter a valid amount.' }, { status: 400 });
  }

  const result = await placeBid(auctionId, user.id, Math.round(dollars * 100));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
