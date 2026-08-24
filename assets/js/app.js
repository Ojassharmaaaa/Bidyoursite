/* =========================================================
   BidYourSite — core engine
   Client-side auction marketplace for websites & digital assets.
   State lives in localStorage under `bys.v1` so bids, watchlists
   and listings survive a reload.
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'bys.v1';
  var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  /* ---------------- seed catalogue ---------------- */
  var CATS = ['SaaS', 'Newsletter', 'Domain', 'E-commerce', 'Content Site', 'Mobile App', 'Community'];

  var SEED = [
    {
      title: 'InvoiceNinja Clone — Micro SaaS',
      cat: 'SaaS', domain: 'billfast.io', tagline: 'Invoicing tool with 118 paying users on a $9/mo plan.',
      about: 'A lean invoicing SaaS built on Next.js + Supabase. Churn sits under 4%, support load is roughly 20 minutes a week, and everything is documented. Comes with the Stripe account handover, all source code and the Figma file.',
      start: 1, cur: 1420, buyNow: 4200, bids: 34, ends: 6 * HOUR + 42 * MIN,
      seller: 'aditya.dev', verified: true, rating: 4.9, sales: 12,
      mrr: 1062, profit: 940, traffic: 8400, age: '2 yr 4 mo',
      tech: ['Next.js', 'Supabase', 'Stripe', 'Vercel'], hue: 258
    },
    {
      title: 'The Sunday Stack — 24k Newsletter',
      cat: 'Newsletter', domain: 'sundaystack.co', tagline: 'Dev-tools newsletter, 24,100 subs, 46% open rate.',
      about: 'Weekly newsletter for backend engineers. Sponsor slots sell out four weeks ahead at $650 each. List is fully owned (Buttondown export included) with no platform lock-in.',
      start: 1, cur: 2650, buyNow: 7500, bids: 51, ends: 1 * DAY + 3 * HOUR,
      seller: 'mira.writes', verified: true, rating: 5.0, sales: 4,
      mrr: 2600, profit: 2450, traffic: 12000, age: '3 yr 1 mo',
      tech: ['Buttondown', 'Ghost', 'Cloudflare'], hue: 168
    },
    {
      title: 'quietfocus.com — Premium .com',
      cat: 'Domain', domain: 'quietfocus.com', tagline: 'Two-word brandable .com, clean history since 2009.',
      about: 'Aged brandable domain, never parked with ads, no trademark conflicts. Ideal for a focus/productivity or wellness brand. Transfer via authorization code within 24 hours of settlement.',
      start: 1, cur: 780, buyNow: 2400, bids: 19, ends: 3 * HOUR + 11 * MIN,
      seller: 'domainvault', verified: true, rating: 4.7, sales: 88,
      mrr: 0, profit: 0, traffic: 140, age: '16 yr',
      tech: ['Namecheap'], hue: 30
    },
    {
      title: 'Trailhead Gear — Shopify Store',
      cat: 'E-commerce', domain: 'trailheadgear.shop', tagline: 'Hiking accessories store doing $11k/mo at 31% margin.',
      about: 'Three-SKU hero catalogue with a vetted supplier in Vietnam, 9,800 email subscribers and a TikTok account at 41k followers. Inventory can transfer with the business or be liquidated before handover.',
      start: 1, cur: 5300, buyNow: 18000, bids: 67, ends: 2 * DAY + 5 * HOUR,
      seller: 'growthgoods', verified: true, rating: 4.8, sales: 7,
      mrr: 3400, profit: 3100, traffic: 46000, age: '1 yr 8 mo',
      tech: ['Shopify', 'Klaviyo', 'Meta Ads'], hue: 12
    },
    {
      title: 'RegexCheatsheet — 190k/mo Content Site',
      cat: 'Content Site', domain: 'regexcheat.dev', tagline: 'Developer reference site monetised with Carbon Ads.',
      about: 'Static site (Astro) ranking page-one for 340 regex keywords. Zero maintenance for the last eight months. Revenue is display ads plus one affiliate deal.',
      start: 1, cur: 1980, buyNow: 5600, bids: 42, ends: 22 * HOUR + 30 * MIN,
      seller: 'seo.kai', verified: false, rating: 4.4, sales: 3,
      mrr: 610, profit: 590, traffic: 190000, age: '4 yr',
      tech: ['Astro', 'Carbon Ads', 'Netlify'], hue: 288
    },
    {
      title: 'PocketHabit — iOS Habit Tracker',
      cat: 'Mobile App', domain: 'pockethabit.app', tagline: '31k downloads, 4.7 stars, lifetime-unlock model.',
      about: 'SwiftUI habit tracker with a one-time $4.99 unlock. No servers to run — everything is local + iCloud sync, so hosting cost is zero. App Store listing, screenshots and ASO keywords included.',
      start: 1, cur: 940, buyNow: 3200, bids: 26, ends: 47 * MIN,
      seller: 'swiftsam', verified: true, rating: 4.6, sales: 2,
      mrr: 380, profit: 380, traffic: 3100, age: '2 yr',
      tech: ['SwiftUI', 'CloudKit', 'RevenueCat'], hue: 200
    },
    {
      title: 'IndieDesk — Discord Community',
      cat: 'Community', domain: 'indiedesk.chat', tagline: '7,400 member indie-hacker Discord with paid tier.',
      about: 'Active community with 1,100 daily messages, three volunteer moderators staying on after the sale, and 140 members on a $6/mo supporter tier. Job board brings in extra sponsor income.',
      start: 1, cur: 1310, buyNow: 3900, bids: 30, ends: 1 * DAY + 14 * HOUR,
      seller: 'community.jo', verified: true, rating: 4.9, sales: 5,
      mrr: 840, profit: 800, traffic: 5200, age: '2 yr 7 mo',
      tech: ['Discord', 'Whop', 'Zapier'], hue: 320
    },
    {
      title: 'ShipMetrics — Analytics Dashboard',
      cat: 'SaaS', domain: 'shipmetrics.dev', tagline: 'Privacy-first web analytics, 61 paying teams.',
      about: 'Cookieless analytics with a self-host option. Codebase is Go + ClickHouse, tested and dockerised. Two enterprise contracts renew in Q1 and are transferable.',
      start: 1, cur: 3450, buyNow: 12500, bids: 58, ends: 4 * DAY + 2 * HOUR,
      seller: 'aditya.dev', verified: true, rating: 4.9, sales: 12,
      mrr: 2900, profit: 2200, traffic: 15600, age: '1 yr 11 mo',
      tech: ['Go', 'ClickHouse', 'Docker', 'Fly.io'], hue: 224
    },
    {
      title: 'Slow Coffee Journal — Blog + Store',
      cat: 'Content Site', domain: 'slowcoffee.blog', tagline: 'Coffee blog with affiliate income and a small merch line.',
      about: 'Editorial coffee blog, 68k monthly readers, Amazon + specialty-roaster affiliate income. Merch is print-on-demand so there is no stock to move.',
      start: 1, cur: 620, buyNow: 2100, bids: 14, ends: 9 * HOUR + 5 * MIN,
      seller: 'brewnotes', verified: false, rating: 4.2, sales: 1,
      mrr: 290, profit: 260, traffic: 68000, age: '3 yr 5 mo',
      tech: ['WordPress', 'Printful'], hue: 44
    },
    {
      title: 'formkit.tools — Short Tool Domain',
      cat: 'Domain', domain: 'formkit.tools', tagline: 'Exact-match domain for a form builder product.',
      about: 'Short, memorable and pronounceable. Registered in 2021, never used commercially, clean backlink profile. Registrar transfer completes same day.',
      start: 1, cur: 210, buyNow: 900, bids: 8, ends: 2 * HOUR + 26 * MIN,
      seller: 'domainvault', verified: true, rating: 4.7, sales: 88,
      mrr: 0, profit: 0, traffic: 60, age: '4 yr 2 mo',
      tech: ['Porkbun'], hue: 96
    },
    {
      title: 'Deskmat Co. — Print-on-Demand Brand',
      cat: 'E-commerce', domain: 'deskmat.co', tagline: 'Desk accessory brand, zero inventory, 8.2k IG followers.',
      about: 'Fully print-on-demand desk mats and mousepads. Fulfilment is automated end to end, so the weekly workload is customer replies and one Instagram post.',
      start: 1, cur: 1150, buyNow: 4400, bids: 23, ends: 1 * DAY + 8 * HOUR,
      seller: 'growthgoods', verified: true, rating: 4.8, sales: 7,
      mrr: 780, profit: 610, traffic: 21000, age: '1 yr 3 mo',
      tech: ['Shopify', 'Printify', 'Instagram'], hue: 340
    },
    {
      title: 'Cron Cabin — Scheduled Jobs API',
      cat: 'SaaS', domain: 'croncabin.io', tagline: 'Developer cron-as-a-service, 240 free / 38 paid accounts.',
      about: 'Simple API that fires webhooks on a schedule with retries and alerting. Written in Rust, runs on a single $24/mo box. Good candidate to bolt onto an existing dev-tools portfolio.',
      start: 1, cur: 760, buyNow: 3600, bids: 17, ends: 5 * HOUR + 55 * MIN,
      seller: 'rustyrae', verified: false, rating: 4.5, sales: 2,
      mrr: 456, profit: 420, traffic: 4200, age: '1 yr',
      tech: ['Rust', 'Postgres', 'Hetzner'], hue: 14
    }
  ];

  var RIVALS = ['nova_k', 'pixelbroker', 'holdmyseed', 'tinyacq', 'ramenprofit', 'buildship', 'dealscout', 'quietcap', 'zerotoone', 'flipfolio'];

  /* ---------------- state ---------------- */
  var S = null;

  function uid() { return 'a' + Math.random().toString(36).slice(2, 9); }

  function seedState() {
    var now = Date.now();
    var items = SEED.map(function (s, i) {
      var it = Object.assign({}, s);
      it.id = 'lot-' + (101 + i);
      it.endsAt = now + s.ends;
      it.createdAt = now - (3 + i) * DAY;
      it.views = 180 + Math.floor(Math.random() * 2400);
      it.watchers = 3 + Math.floor(Math.random() * 60);
      it.mine = false;
      it.history = buildHistory(it);
      delete it.ends;
      return it;
    });
    return {
      v: 1,
      user: { name: 'you', balance: 25000, joined: now },
      items: items,
      watch: [],
      autobids: {},
      notes: [],
      settled: 40500,
      theme: 'light',
      lastTick: now
    };
  }

  /* Build a plausible ascending bid history ending at the current price. */
  function buildHistory(it) {
    var n = Math.min(it.bids, 14), out = [], price = it.start, now = Date.now();
    var step = (it.cur - it.start) / Math.max(n, 1);
    for (var i = 0; i < n; i++) {
      price = Math.round(it.start + step * (i + 1) + (i < n - 1 ? Math.random() * step * 0.3 : 0));
      if (i === n - 1) price = it.cur;
      out.push({
        by: RIVALS[(i * 3 + it.title.length) % RIVALS.length],
        amt: price,
        at: now - (n - i) * (35 * MIN) - Math.floor(Math.random() * 20 * MIN)
      });
    }
    return out.reverse();
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.v === 1 && Array.isArray(p.items) && p.items.length) return p;
      }
    } catch (e) { /* corrupt or unavailable storage — fall through to a fresh seed */ }
    return seedState();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* quota / private mode */ }
  }

  /* ---------------- formatting ---------------- */
  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function ago(ts) {
    var d = Date.now() - ts;
    if (d < MIN) return 'just now';
    if (d < HOUR) return Math.floor(d / MIN) + 'm ago';
    if (d < DAY) return Math.floor(d / HOUR) + 'h ago';
    return Math.floor(d / DAY) + 'd ago';
  }
  function left(ms) {
    if (ms <= 0) return { done: true, txt: 'Ended', d: 0, h: 0, m: 0, s: 0 };
    var d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / HOUR),
        m = Math.floor(ms % HOUR / MIN), s = Math.floor(ms % MIN / 1000);
    var txt = d > 0 ? d + 'd ' + h + 'h' : h > 0 ? h + 'h ' + pad(m) + 'm' : pad(m) + ':' + pad(s);
    return { done: false, txt: txt, d: d, h: h, m: m, s: s, urgent: ms < HOUR };
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Minimum legal next bid — a sliding increment, like a real auction house. */
  function increment(cur) {
    if (cur < 100) return 5;
    if (cur < 500) return 10;
    if (cur < 2000) return 25;
    if (cur < 10000) return 50;
    return 100;
  }
  function minBid(it) { return it.cur + increment(it.cur); }

  /* Marketplace fee: 5% of the hammer price, floor $1, capped at $500. */
  function fee(amount) {
    return Math.min(500, Math.max(1, Math.round(amount * 0.05)));
  }

  /* ---------------- queries ---------------- */
  function all() { return S.items; }
  function get(id) { return S.items.filter(function (i) { return i.id === id; })[0] || null; }
  function live(it) { return it.endsAt > Date.now(); }
  function liveItems() { return S.items.filter(live); }
  function isWatched(id) { return S.watch.indexOf(id) > -1; }
  function myBids() {
    return S.items.filter(function (it) {
      return it.history.some(function (h) { return h.by === 'you'; });
    });
  }
  function leading(it) { return it.history.length && it.history[0].by === 'you'; }

  function stats() {
    var l = liveItems();
    return {
      liveCount: l.length,
      totalBids: S.items.reduce(function (a, i) { return a + i.history.length; }, 0),
      volume: S.settled + S.items.reduce(function (a, i) { return a + i.cur; }, 0),
      sellers: uniqueSellers().length,
      watchers: S.items.reduce(function (a, i) { return a + i.watchers; }, 0)
    };
  }
  function uniqueSellers() {
    var seen = {};
    S.items.forEach(function (i) { seen[i.seller] = 1; });
    return Object.keys(seen);
  }

  /* ---------------- actions ---------------- */
  function notify(kind, title, body, link) {
    S.notes.unshift({ id: uid(), kind: kind, title: title, body: body, link: link || '', at: Date.now(), read: false });
    S.notes = S.notes.slice(0, 40);
    save();
    paintBell();
  }
  function unread() { return S.notes.filter(function (n) { return !n.read; }).length; }
  function markRead() { S.notes.forEach(function (n) { n.read = true; }); save(); paintBell(); }

  /**
   * Place a bid. Returns {ok, msg, item}.
   * Enforces the increment, extends the clock on late bids (anti-snipe),
   * and triggers any rival auto-bid that is still willing to go higher.
   */
  function bid(id, amount, who) {
    var it = get(id);
    if (!it) return { ok: false, msg: 'That lot no longer exists.' };
    if (!live(it)) return { ok: false, msg: 'This auction has already ended.' };
    amount = Math.round(Number(amount));
    if (!amount || amount <= 0) return { ok: false, msg: 'Enter a valid amount.' };

    var need = minBid(it);
    if (amount < need) return { ok: false, msg: 'Minimum next bid is ' + money(need) + '.' };
    who = who || 'you';
    if (who === 'you') {
      if (it.seller === S.user.name) return { ok: false, msg: 'You cannot bid on your own listing.' };
      if (amount > S.user.balance) return { ok: false, msg: 'That exceeds your bidding limit of ' + money(S.user.balance) + '.' };
      if (leading(it)) return { ok: false, msg: 'You are already the highest bidder.' };
    }

    var outbid = it.history.length ? it.history[0].by : null;
    it.cur = amount;
    it.bids++;
    it.history.unshift({ by: who, amt: amount, at: Date.now() });
    if (it.history.length > 60) it.history.length = 60;

    // Anti-snipe: any bid inside the final two minutes pushes the close out.
    var remaining = it.endsAt - Date.now();
    var extended = false;
    if (remaining < 2 * MIN) { it.endsAt = Date.now() + 2 * MIN; extended = true; }

    if (who === 'you') {
      notify('bid', 'Bid placed', money(amount) + ' on ' + it.title, 'auction.html?id=' + it.id);
    } else if (outbid === 'you') {
      notify('out', 'You were outbid', who + ' bid ' + money(amount) + ' on ' + it.title, 'auction.html?id=' + it.id);
    }
    if (extended) notify('time', 'Auction extended', it.title + ' — 2 minutes added by a late bid', 'auction.html?id=' + it.id);

    save();
    return { ok: true, msg: 'Bid accepted at ' + money(amount) + '.', item: it, extended: extended };
  }

  function setAutoBid(id, max) {
    max = Math.round(Number(max));
    var it = get(id);
    if (!it) return { ok: false, msg: 'Unknown lot.' };
    if (max < minBid(it)) return { ok: false, msg: 'Your maximum must be at least ' + money(minBid(it)) + '.' };
    if (max > S.user.balance) return { ok: false, msg: 'That exceeds your bidding limit.' };
    S.autobids[id] = max;
    save();
    // Take the lead immediately if we are not already on top.
    if (!leading(it)) bid(id, minBid(it), 'you');
    return { ok: true, msg: 'Auto-bid armed up to ' + money(max) + '.' };
  }
  function clearAutoBid(id) { delete S.autobids[id]; save(); }

  function buyNow(id) {
    var it = get(id);
    if (!it) return { ok: false, msg: 'Unknown lot.' };
    if (!it.buyNow) return { ok: false, msg: 'No instant-buy price on this lot.' };
    if (!live(it)) return { ok: false, msg: 'This auction has ended.' };
    if (it.cur >= it.buyNow) return { ok: false, msg: 'Bidding has passed the instant-buy price.' };
    if (it.buyNow > S.user.balance) return { ok: false, msg: 'That exceeds your bidding limit.' };
    it.cur = it.buyNow;
    it.bids++;
    it.history.unshift({ by: 'you', amt: it.buyNow, at: Date.now() });
    it.endsAt = Date.now();
    notify('won', 'Purchased outright', it.title + ' for ' + money(it.buyNow), 'auction.html?id=' + it.id);
    save();
    return { ok: true, msg: 'Yours — ' + money(it.buyNow) + '. Escrow instructions are in your notifications.', item: it };
  }

  function toggleWatch(id) {
    var i = S.watch.indexOf(id), it = get(id);
    if (i > -1) { S.watch.splice(i, 1); if (it) it.watchers = Math.max(0, it.watchers - 1); }
    else { S.watch.push(id); if (it) it.watchers++; }
    save();
    return i === -1;
  }

  function createListing(d) {
    var now = Date.now();
    var it = {
      id: 'lot-' + Math.floor(Math.random() * 9000 + 1000),
      title: d.title, cat: d.cat, domain: d.domain, tagline: d.tagline, about: d.about,
      start: 1, cur: 1, buyNow: Number(d.buyNow) || 0, bids: 0,
      endsAt: now + Number(d.days) * DAY,
      createdAt: now, views: 0, watchers: 0, mine: true,
      seller: S.user.name, verified: false, rating: 0, sales: 0,
      mrr: Number(d.mrr) || 0, profit: Number(d.profit) || 0,
      traffic: Number(d.traffic) || 0, age: d.age || 'new',
      tech: (d.tech || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      hue: Math.floor(Math.random() * 360),
      history: []
    };
    S.items.unshift(it);
    notify('list', 'Listing is live', it.title + ' opened at $1', 'auction.html?id=' + it.id);
    save();
    return it;
  }

  /* ---------------- simulation ----------------
     Rival bidders wake up on a timer. Hotter lots (more bids, less time
     remaining) draw more action, so the board keeps moving while you watch. */
  function tick() {
    var now = Date.now(), changed = false;

    S.items.forEach(function (it) {
      if (!live(it)) return;
      if (it.seller === S.user.name && it.bids === 0 && Math.random() > 0.03) return;

      var remain = it.endsAt - now;
      var heat = (remain < HOUR ? 0.09 : remain < 6 * HOUR ? 0.05 : 0.025) * (1 + it.bids / 60);
      if (Math.random() > heat) return;

      var top = it.history.length ? it.history[0].by : null;
      var rival = RIVALS[Math.floor(Math.random() * RIVALS.length)];
      if (rival === top) return;

      var amt = minBid(it) + Math.round(Math.random() * increment(it.cur) * 2);
      var cap = S.autobids[it.id];

      // Our proxy bid answers first if it still has room.
      if (cap && top !== 'you' && minBid(it) <= cap) {
        bid(it.id, Math.min(cap, minBid(it)), 'you');
        changed = true;
        return;
      }
      bid(it.id, amt, rival);
      if (cap && cap >= minBid(it)) { bid(it.id, minBid(it), 'you'); }
      else if (cap) { clearAutoBid(it.id); notify('out', 'Auto-bid exhausted', 'Bidding passed your maximum on ' + it.title, 'auction.html?id=' + it.id); }
      changed = true;
    });

    // Close out anything whose clock ran out.
    S.items.forEach(function (it) {
      if (it.endsAt <= now && !it.closed) {
        it.closed = true;
        if (it.history.length && it.history[0].by === 'you') {
          notify('won', 'You won', it.title + ' at ' + money(it.cur), 'auction.html?id=' + it.id);
        }
        changed = true;
      }
    });

    if (changed) { save(); document.dispatchEvent(new CustomEvent('bys:update')); }
  }

  function resetAll() { localStorage.removeItem(KEY); location.reload(); }

  /* ---------------- UI helpers ---------------- */
  function toast(kind, title, body) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<b>' + esc(title) + '</b>' + (body ? '<p>' + esc(body) + '</p>' : '');
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s,transform .3s';
      el.style.opacity = '0'; el.style.transform = 'translateX(30px)';
      setTimeout(function () { el.remove(); }, 300);
    }, 3600);
  }

  function art(hue, label) {
    return 'background:linear-gradient(135deg,hsl(' + hue + ' 78% 58%),hsl(' + ((hue + 42) % 360) + ' 80% 46%));';
  }

  function initials(s) {
    return String(s).replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function avHue(s) {
    var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }

  /* Card markup shared by the home page, browse page and dashboard. */
  function cardHTML(it) {
    var t = left(it.endsAt - Date.now());
    var hot = it.bids >= 30, fresh = Date.now() - it.createdAt < 2 * DAY;
    var badge = t.done ? '<span class="badge">Ended</span>'
      : t.urgent ? '<span class="badge end">Ending soon</span>'
      : hot ? '<span class="badge hot">Hot &middot; ' + it.bids + ' bids</span>'
      : fresh ? '<span class="badge new">New</span>' : '';
    return '' +
      '<article class="card" data-id="' + it.id + '">' +
        '<a href="auction.html?id=' + it.id + '" class="card-img" style="' + art(it.hue) + '">' +
          badge +
          '<span>' + esc(initials(it.domain)) + '</span>' +
        '</a>' +
        '<button class="fav' + (isWatched(it.id) ? ' on' : '') + '" data-watch="' + it.id + '" ' +
          'aria-label="Save to watchlist" title="Save to watchlist">&#9733;</button>' +
        '<div class="card-b">' +
          '<div class="card-cat">' + esc(it.cat) + ' &middot; ' + esc(it.domain) + '</div>' +
          '<a href="auction.html?id=' + it.id + '"><h3 class="card-t">' + esc(it.title) + '</h3></a>' +
          '<p class="card-d">' + esc(it.tagline) + '</p>' +
          '<div class="card-meta">' +
            (it.mrr ? '<span>&#128176; ' + money(it.mrr) + '/mo</span>' : '') +
            '<span>&#128200; ' + compact(it.traffic) + ' visits/mo</span>' +
            '<span>&#128100; ' + esc(it.seller) + (it.verified ? ' &#10003;' : '') + '</span>' +
          '</div>' +
          '<div class="card-f">' +
            '<div><div class="bid-l">' + (t.done ? 'Sold for' : 'Current bid') + '</div>' +
              '<div class="bid-v">' + money(it.cur) + '</div></div>' +
            '<div class="timer' + (t.done ? ' done' : t.urgent ? ' urgent' : '') + '" data-ends="' + it.endsAt + '">' + t.txt + '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------------- chrome (header / footer) ---------------- */
  var NAV = [
    ['index.html', 'Home'],
    ['auctions.html', 'Browse'],
    ['sell.html', 'Sell'],
    ['dashboard.html', 'Dashboard'],
    ['rules.html', 'Rules'],
    ['about.html', 'About']
  ];

  function chrome() {
    var page = location.pathname.split('/').pop() || 'index.html';
    var hdr = document.querySelector('[data-chrome="header"]');
    if (hdr) {
      hdr.className = 'hdr';
      hdr.innerHTML = '<div class="wrap hdr-in">' +
        '<a class="logo" href="index.html"><span class="logo-mark">B</span>Bid<em>YourSite</em></a>' +
        '<nav class="nav" id="nav">' + NAV.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[0] === page ? ' class="on"' : '') + '>' + n[1] + '</a>';
        }).join('') + '</nav>' +
        '<div class="hdr-r">' +
          '<button class="icon-btn" id="bell" title="Notifications" aria-label="Notifications">&#128276;</button>' +
          '<button class="icon-btn" id="theme" title="Toggle theme" aria-label="Toggle theme">&#9789;</button>' +
          '<a class="btn btn-p btn-sm" href="sell.html">List for $1</a>' +
          '<button class="icon-btn burger" id="burger" aria-label="Menu">&#9776;</button>' +
        '</div></div>';

      hdr.querySelector('#burger').onclick = function () { document.getElementById('nav').classList.toggle('open'); };
      hdr.querySelector('#theme').onclick = function () {
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', S.theme);
        save();
      };
      hdr.querySelector('#bell').onclick = openNotes;
      paintBell();
    }

    var ft = document.querySelector('[data-chrome="footer"]');
    if (ft) {
      ft.innerHTML = '<div class="wrap"><div class="ft">' +
        '<div><a class="logo" href="index.html"><span class="logo-mark">B</span>Bid<em>YourSite</em></a>' +
          '<p>The $1 starting line for internet businesses. List a site, a domain or an app for a dollar and let the market set the price.</p></div>' +
        '<div><h5>Marketplace</h5><ul>' +
          '<li><a href="auctions.html">Live auctions</a></li>' +
          '<li><a href="auctions.html?cat=Domain">Domains</a></li>' +
          '<li><a href="auctions.html?cat=SaaS">SaaS</a></li>' +
          '<li><a href="sell.html">Sell your site</a></li></ul></div>' +
        '<div><h5>Trust</h5><ul>' +
          '<li><a href="rules.html">Auction rules</a></li>' +
          '<li><a href="rules.html#escrow">Escrow &amp; payouts</a></li>' +
          '<li><a href="rules.html#faq">FAQ</a></li>' +
          '<li><a href="about.html">About us</a></li></ul></div>' +
        '<div><h5>Contact</h5><ul>' +
          '<li><a href="mailto:hello@bidyoursite.com">hello@bidyoursite.com</a></li>' +
          '<li><a href="dashboard.html">Your dashboard</a></li>' +
          '<li><a href="#" id="resetDemo">Reset demo data</a></li></ul></div>' +
        '</div><div class="ft-b">' +
          '<span>&copy; ' + new Date().getFullYear() + ' BidYourSite. Start at a dollar, end at market price.</span>' +
          '<span>Demo build &mdash; bids are simulated in your browser.</span>' +
        '</div></div>';
      var r = ft.querySelector('#resetDemo');
      if (r) r.onclick = function (e) { e.preventDefault(); resetAll(); };
    }

    if (!document.querySelector('.toasts')) {
      var tb = document.createElement('div'); tb.className = 'toasts'; document.body.appendChild(tb);
    }
    buildNotesModal();
  }

  function paintBell() {
    var b = document.getElementById('bell');
    if (!b) return;
    var n = unread();
    b.innerHTML = '&#128276;' + (n ? '<span class="dot">' + (n > 9 ? '9+' : n) + '</span>' : '');
  }

  function buildNotesModal() {
    if (document.getElementById('notesModal')) return;
    var m = document.createElement('div');
    m.className = 'modal'; m.id = 'notesModal';
    m.innerHTML = '<div class="modal-c"><h3>Notifications</h3>' +
      '<div id="notesList" style="max-height:340px;overflow:auto;margin-bottom:16px"></div>' +
      '<button class="btn btn-g btn-block" id="closeNotes">Close</button></div>';
    document.body.appendChild(m);
    m.onclick = function (e) { if (e.target === m || e.target.id === 'closeNotes') m.classList.remove('open'); };
  }

  var ICON = { bid: '&#128176;', out: '&#9888;', won: '&#127942;', time: '&#9201;', list: '&#128228;' };

  function openNotes() {
    var m = document.getElementById('notesModal'), list = document.getElementById('notesList');
    list.innerHTML = S.notes.length ? S.notes.map(function (n) {
      return '<div class="hist-i"><div class="av" style="background:hsl(' + avHue(n.kind) + ' 62% 52%)">' + (ICON[n.kind] || '&#8226;') + '</div>' +
        '<div class="hist-m"><div class="hist-n">' + esc(n.title) + '</div>' +
        '<div class="hist-t">' + esc(n.body) + ' &middot; ' + ago(n.at) + '</div></div>' +
        (n.link ? '<a class="btn btn-g btn-sm" href="' + n.link + '">View</a>' : '') + '</div>';
    }).join('') : '<div class="empty" style="padding:34px"><div class="ic">&#128276;</div><h4>Nothing yet</h4><p>Bid on a lot and updates land here.</p></div>';
    m.classList.add('open');
    markRead();
  }

  /* Repaint every visible countdown once a second. */
  function timers() {
    document.querySelectorAll('[data-ends]').forEach(function (el) {
      var t = left(Number(el.dataset.ends) - Date.now());
      if (el.dataset.mode === 'units') return;
      el.textContent = t.txt;
      el.classList.toggle('urgent', !!t.urgent && !t.done);
      el.classList.toggle('done', !!t.done);
    });
    document.querySelectorAll('[data-cd]').forEach(function (el) {
      var t = left(Number(el.dataset.cd) - Date.now());
      var q = function (k) { var n = el.querySelector('[data-u="' + k + '"]'); if (n) n.textContent = pad(t[k]); };
      q('d'); q('h'); q('m'); q('s');
    });
  }

  /* Wire the star buttons wherever cards are rendered. */
  function bindWatch(root) {
    (root || document).querySelectorAll('[data-watch]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var on = toggleWatch(b.dataset.watch);
        b.classList.toggle('on', on);
        toast(on ? 'ok' : '', on ? 'Added to watchlist' : 'Removed from watchlist',
          on ? 'You will be told when it is close to ending.' : '');
        document.dispatchEvent(new CustomEvent('bys:watch'));
      };
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    S = load();
    document.documentElement.setAttribute('data-theme', S.theme || 'light');
    document.addEventListener('DOMContentLoaded', function () {
      chrome();
      timers();
      setInterval(timers, 1000);
      setInterval(tick, 5000);
      document.dispatchEvent(new CustomEvent('bys:ready'));
    });
  }

  global.BYS = {
    get state() { return S; },
    CATS: CATS, RIVALS: RIVALS,
    all: all, get: get, live: live, liveItems: liveItems, stats: stats, myBids: myBids, leading: leading,
    isWatched: isWatched, toggleWatch: toggleWatch, bindWatch: bindWatch,
    bid: bid, buyNow: buyNow, setAutoBid: setAutoBid, clearAutoBid: clearAutoBid, createListing: createListing,
    minBid: minBid, increment: increment, fee: fee,
    money: money, compact: compact, ago: ago, left: left, esc: esc, pad: pad,
    art: art, initials: initials, avHue: avHue, cardHTML: cardHTML,
    toast: toast, notify: notify, unread: unread, openNotes: openNotes,
    save: save, reset: resetAll, tick: tick, timers: timers
  };

  boot();
})(window);
