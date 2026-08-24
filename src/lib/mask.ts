/**
 * Bidder handles are shown masked, the way auction houses list underbidders:
 * enough identity to follow a duel between two bidders, not enough to dox one.
 * `novaklein` becomes `n****n`.
 */
export function maskHandle(h: string): string {
  if (!h) return '***';
  if (h.length <= 2) return h[0] + '*';
  return h[0] + '*'.repeat(Math.min(4, h.length - 2)) + h[h.length - 1];
}
