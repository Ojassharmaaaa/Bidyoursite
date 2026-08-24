import { NextResponse } from 'next/server';
import { closeDueAuctions } from '@/lib/bidding';
import { promoteNextDrop } from '@/lib/drops';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron hits this every minute. It closes anything past its clock and
 * hands the stage to the next lot in the queue. Auctions must resolve whether
 * or not a browser is open, so this is the authority — never a client timer.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && secret !== 'change-me' && auth !== 'Bearer ' + secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const closed = await closeDueAuctions();
  const promoted = await promoteNextDrop();
  return NextResponse.json({ ok: true, closed, promoted });
}
