# BidYourSite

An auction marketplace for small internet businesses. Every lot — website, domain,
newsletter, app, store or community — opens at **$1** and the market decides the rest.

Static site: plain HTML, CSS and vanilla JS. No build step, no dependencies, no backend.
All auction state (bids, watchlist, listings, notifications) persists in `localStorage`.

---

## Pages

| File | Contents |
|---|---|
| `index.html` | Hero, live stat counters, price ticker, ending-soon and hot grids, category tiles, how-it-works, fee calculator |
| `auctions.html` | Browse: search, category chips, 6 sort modes, status filters (watchlist / verified / revenue-generating), budget bands |
| `auction.html` | Lot detail: countdown, bid box, quick-bid, auto-bid, buy-now, bid history, metrics, seller card, similar lots |
| `sell.html` | 3-step listing wizard with live card preview, valuation guide, payout breakdown |
| `dashboard.html` | Active bids, watchlist, my listings, won & lost, activity feed |
| `rules.html` | Increments, anti-snipe, escrow timeline, fees, prohibited listings, FAQ |
| `about.html` | Story, principles, track record, caveats |

## Auction engine — `assets/js/app.js`

- **Sliding bid increments** — $5 under $100, scaling to $100 above $10k.
- **Proxy / auto-bidding** — arm a ceiling; the engine bids the minimum needed and stops at your max.
- **Anti-snipe clock** — a bid inside the final 2 minutes extends the auction by 2 minutes, repeatably.
- **Simulated rival bidders** — a 5-second tick moves prices, weighted by bid count and time remaining.
- **Notifications** — outbid, extended, won, listed; unread badge in the header.
- **Watchlist**, buy-now, toasts, dark/light theme, responsive nav.

Reset the demo data any time via the **Reset demo data** link in the footer.

## Fees modelled

Three fixed listing tiers, charged once at publish. **No commission on the sale.**

| Tier | Price | What it buys |
|---|---|---|
| Basic | $1 | Browse listing, 7-day auction |
| Featured | $5 | Homepage placement, badge, 14 days, weekly buyer email |
| Spotlight | $10 | Top of Browse, homepage hero, social post, priority verification |
| Buyer's premium | $0 | — |
| Commission | **0%** | We take none of the hammer price |

Fixed prices mean the three products map to three static Dodo product IDs — no
variable-amount checkout, and nothing to invoice after a sale closes.

## Analytics

Every page carries the framework-free Vercel Web Analytics snippet:

```html
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>
<script defer src="/_vercel/insights/script.js"></script>
```

`/_vercel/insights/script.js` only resolves once deployed on Vercel, and Web Analytics
must be enabled in the project dashboard before data is collected.

## Running locally

```bash
python -m http.server 8777
```

Then open <http://127.0.0.1:8777>. Any static server works — there is nothing to compile.

## Deploying

Import the repo on Vercel and deploy as a static site (no framework preset, no build
command, output directory `.`). Then enable Analytics in the project settings.

---

## Note on originality

The concept — a marketplace where listings open at a single dollar — was inspired by
firstbid.lol. Everything here was written from scratch and deliberately diverges:

- **Different asset class.** Websites, domains, newsletters, apps, stores and communities
  rather than generic products, with revenue, profit, traffic and stack shown per lot.
- **A working auction engine** rather than a static landing page — real bids, increments,
  history, proxy bidding, anti-snipe extensions and closing logic.
- **Seven pages** including browse, lot detail, a listing wizard and a bidder dashboard.
- **Its own copy, palette, layout and identity**, including the pricing model ($1/$5/$10
  listing tiers with zero commission), escrow terms, verification tiers and valuation
  guidance.
