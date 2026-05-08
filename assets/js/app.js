'use strict';

/* ============================================================
   VFX MODULE — runs immediately
============================================================ */
(function VFX() {

  /* ── LOADER ─────────────────────────────────────────────── */
  const msgs = ['Connecting to markets…', 'Fetching live prices…', 'Loading 250+ assets…', 'Almost ready…'];
  let prog = 0;
  const fill   = document.getElementById('ld-fill');
  const pctEl  = document.getElementById('ld-pct');
  const statEl = document.getElementById('ld-status');

  function tickLoader() {
    prog += Math.random() * 14 + 4;
    if (prog > 92) prog = 92;
    if (fill)   fill.style.width = prog + '%';
    if (pctEl)  pctEl.textContent = Math.round(prog) + '%';
    if (statEl) statEl.textContent = msgs[Math.min(Math.floor(prog / 30), msgs.length - 1)];
    if (prog < 92) setTimeout(tickLoader, 260 + Math.random() * 200);
  }
  setTimeout(tickLoader, 900);

  window._loaderDone = function() {
    if (fill)   fill.style.width = '100%';
    if (pctEl)  pctEl.textContent = '100%';
    if (statEl) statEl.textContent = 'Ready';
    setTimeout(() => {
      const ld = document.getElementById('loader');
      if (ld) { ld.classList.add('exit'); setTimeout(() => ld.remove(), 800); }
    }, 400);
  };

  /* ── CUSTOM CURSOR ───────────────────────────────────────── */
  const $cur = document.getElementById('cur');
  const $dot = document.getElementById('cur-dot');
  if ($cur && window.matchMedia('(hover: hover)').matches) {
    let mx = 0, my = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      $dot.style.transform = `translate(${mx}px,${my}px)`;
    }, { passive: true });

    (function loop() {
      cx += (mx - cx) * .1;
      cy += (my - cy) * .1;
      $cur.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mousedown', () => $cur.classList.add('click'));
    document.addEventListener('mouseup',   () => $cur.classList.remove('click'));

    const SEL = 'button,a,.stat-card,.trend-card,tbody tr,.ai-chip,.ai-fab,.mf-btn,.th-sort,.pg-btn,.pg-num,.ask-ai-btn';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(SEL)) $cur.classList.add('hov');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(SEL)) $cur.classList.remove('hov');
    });
  }

  /* ── CANVAS BACKGROUND ───────────────────────────────────── */
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles, t = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticles() {
    const n = Math.min(Math.floor(W * H / 13000), 90);
    particles = Array.from({ length: n }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - .5) * .22,
      vy: (Math.random() - .5) * .22,
      r:  Math.random() * 1.4 + .4,
      a:  Math.random() * .42 + .08,
      c:  Math.random() > .6 ? '#00f5ff' : Math.random() > .5 ? '#a855f7' : '#f0f4ff',
    }));
  }

  function drawGrid() {
    const cx = W / 2, hy = H * .54, step = (t * .28) % 1;
    ctx.lineWidth = .5;
    for (let i = 0; i < 12; i++) {
      const p = (i + step) / 12;
      const y = hy + (H - hy) * p;
      const hw = (W * .48) * p;
      ctx.strokeStyle = `rgba(0,245,255,${p * .048})`;
      ctx.beginPath();
      ctx.moveTo(cx - hw, y); ctx.lineTo(cx + hw, y); ctx.stroke();
    }
    for (let i = -8; i <= 8; i++) {
      const nx = i / 8;
      const a  = (1 - Math.abs(nx)) * .035;
      ctx.strokeStyle = `rgba(0,245,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(cx + nx * (W / 2), H);
      ctx.lineTo(cx, hy); ctx.stroke();
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.globalAlpha = p.a; ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.lineWidth = .35;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9000) {
          ctx.strokeStyle = `rgba(0,245,255,${.038 * (1 - d2 / 9000)})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
        }
      }
    }
  }

  resize(); mkParticles();
  (function frame() {
    ctx.clearRect(0, 0, W, H);
    t += .007;
    drawGrid(); drawParticles();
    requestAnimationFrame(frame);
  })();
  window.addEventListener('resize', () => { resize(); mkParticles(); }, { passive: true });

  /* ── 3D CARD TILT ────────────────────────────────────────── */
  function initTilt() {
    document.querySelectorAll('.stat-card').forEach(card => {
      // Inject spotlight div
      if (!card.querySelector('.sc-spot')) {
        const spot = document.createElement('div');
        spot.className = 'sc-spot';
        card.prepend(spot);
      }
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const xn = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
        const yn = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
        card.style.transform = `perspective(700px) rotateX(${-yn * 7}deg) rotateY(${xn * 7}deg) translateY(-6px)`;
        const px = ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%';
        const py = ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%';
        card.style.setProperty('--mx', px);
        card.style.setProperty('--my', py);
      }, { passive: true });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }
  // Re-run tilt init after stats render
  window._reinitTilt = initTilt;

  /* ── REVEAL ANIMATIONS ───────────────────────────────────── */
  function initReveal() {
    document.querySelectorAll('.reveal-line').forEach(el => {
      setTimeout(() => el.classList.add('revealed'), 80);
    });
    document.querySelectorAll('.reveal-fade').forEach(el => {
      setTimeout(() => el.classList.add('revealed'), 200);
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }
      });
    }, { threshold: .12 });

    document.querySelectorAll('.stat-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = `opacity .7s ${i * .09}s ease, transform .7s ${i * .09}s cubic-bezier(.16,1,.3,1)`;
      io.observe(el);
    });
  }
  // Run reveal after DOM settled
  setTimeout(initReveal, 50);

})();

/* ============================================================
   CONFIG
============================================================ */
const CFG = {
  API:        'https://api.coingecko.com/api/v3',
  REFRESH_MS: 30_000,
  PER_PAGE:   50,
  MAX_COINS:  250,
};

/* ============================================================
   STATE
============================================================ */
const S = {
  coins:       [],
  trending:    null,
  global:      null,
  page:        1,
  totalPages:  1,
  sortCol:     null,
  sortDir:     'desc',
  filterMode:  'default',
  prevPrices:  {},
  initialized: false,
  lastUpdate:  null,
};

/* ============================================================
   SPARKLINE
============================================================ */
function drawSparkline(canvas, data, positive) {
  if (!canvas || !data || data.length < 2) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  const color = positive ? '#10b981' : '#f43f5e';
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, positive ? 'rgba(16,185,129,.28)' : 'rgba(244,63,94,.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i-1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[pts.length-1].x, H);
  ctx.lineTo(pts[0].x, H);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i-1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
}

/* ============================================================
   FORMATTERS
============================================================ */
const fmt = {
  price(n) {
    if (n == null) return '—';
    if (n >= 100000) return '$' + n.toLocaleString('en', { maximumFractionDigits: 0 });
    if (n >= 1)      return '$' + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= .01)    return '$' + n.toFixed(4);
    if (n >= .0001)  return '$' + n.toFixed(6);
    return '$' + n.toPrecision(3);
  },
  large(n) {
    if (!n) return '—';
    if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n/1e9 ).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n/1e6 ).toFixed(2) + 'M';
    return '$' + n.toLocaleString('en');
  },
  pct(n)  { if (n == null) return '—'; return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; },
  time(d) { return d.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', second:'2-digit' }); },
};

/* ============================================================
   COUNT-UP ANIMATION
============================================================ */
function countUp(el, targetText) {
  if (!el) return;
  // Animate only the numeric portion
  el.textContent = targetText;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  el.style.transition = 'opacity .5s ease, transform .5s var(--ease)';
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
}

/* ============================================================
   API
============================================================ */
const api = {
  async markets() {
    const r = await fetch(`${CFG.API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${CFG.MAX_COINS}&page=1&sparkline=true&price_change_percentage=1h,24h,7d&locale=en`);
    if (!r.ok) throw new Error(`markets ${r.status}`);
    return r.json();
  },
  async global() {
    const r = await fetch(`${CFG.API}/global`);
    if (!r.ok) throw new Error(`global ${r.status}`);
    return r.json();
  },
  async trending() {
    const r = await fetch(`${CFG.API}/search/trending`);
    if (!r.ok) throw new Error(`trending ${r.status}`);
    return r.json();
  },
};

/* ============================================================
   TICKER
============================================================ */
function renderTicker(coins) {
  const el = document.getElementById('ticker-content');
  if (!el) return;
  const items = coins.slice(0, 40).map(c => {
    const chg = c.price_change_percentage_24h || 0;
    return `<span class="t-item">
      <img src="${c.image}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span class="t-sym">${c.symbol.toUpperCase()}</span>
      <span class="t-price">${fmt.price(c.current_price)}</span>
      <span class="t-chg ${chg >= 0 ? 'up' : 'dn'}">${fmt.pct(chg)}</span>
    </span>`;
  }).join('');
  el.innerHTML = items + items;
}

/* ============================================================
   GLOBAL STATS
============================================================ */
function renderGlobal(data) {
  const g = data.data;
  const mcapChg = g.market_cap_change_percentage_24h_usd || 0;

  countUp(document.getElementById('sv-mcap'),    fmt.large(g.total_market_cap?.usd));
  countUp(document.getElementById('sv-vol'),     fmt.large(g.total_volume?.usd));
  countUp(document.getElementById('sv-dom'),     (g.market_cap_percentage?.btc || 0).toFixed(1) + '%');
  countUp(document.getElementById('sv-coins'),   (g.active_cryptocurrencies || 0).toLocaleString('en'));
  setText('sv-markets', (g.markets || '—') + ' Markets');

  const dEl = document.getElementById('sd-mcap');
  if (dEl) { dEl.textContent = fmt.pct(mcapChg) + ' (24h)'; dEl.className = 'sc-delta ' + (mcapChg >= 0 ? 'up' : 'dn'); }

  const bar = document.getElementById('sb-btc');
  if (bar) bar.style.width = Math.min(g.market_cap_percentage?.btc || 0, 100) + '%';

  if (window._reinitTilt) window._reinitTilt();
}

/* ============================================================
   TRENDING
============================================================ */
function renderTrending(data) {
  const track = document.getElementById('trending-track');
  if (!track) return;
  const coins = (data.coins || []).slice(0, 10);

  track.innerHTML = coins.map((item, idx) => {
    const c = item.item;
    const chg   = c.data?.price_change_percentage_24h?.usd || 0;
    const price = c.data?.price || '—';
    return `<div class="trend-card" role="listitem" onclick="jumpTo('${c.id}')" tabindex="0" aria-label="${c.name}">
      <div class="tc-rank">#${idx + 1} Trending</div>
      <div class="tc-head">
        <img src="${c.small}" alt="${c.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 36 36%22><circle cx=%2218%22 cy=%2218%22 r=%2218%22 fill=%22%23111%22/></svg>'">
        <div><div class="tc-name">${c.name}</div><div class="tc-sym">${c.symbol}</div></div>
      </div>
      <div class="tc-price">${price}</div>
      <div class="tc-chg ${chg >= 0 ? 'up' : 'dn'}">${fmt.pct(chg)}</div>
      <div class="tc-spark"><canvas id="ts-${idx}" width="156" height="44"></canvas></div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    coins.forEach((item, idx) => {
      const spark = item.item.data?.sparkline?.price || [];
      const chg   = item.item.data?.price_change_percentage_24h?.usd || 0;
      drawSparkline(document.getElementById(`ts-${idx}`), spark, chg >= 0);
    });
  });

  const ts = document.getElementById('trending-ts');
  if (ts) ts.textContent = 'Updated ' + fmt.time(new Date());
}

/* ============================================================
   MARKET TABLE
============================================================ */
function skeletonRows(n = 18) {
  document.getElementById('mkt-tbody').innerHTML = Array.from({ length: n }, () => `
    <tr class="sk-row">
      <td><div class="sk" style="width:20px;height:12px;margin:auto;"></div></td>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <div class="sk" style="width:30px;height:30px;border-radius:50%;"></div>
        <div><div class="sk" style="width:88px;height:12px;margin-bottom:5px;"></div>
        <div class="sk" style="width:42px;height:10px;"></div></div>
      </div></td>
      <td><div class="sk" style="width:74px;height:12px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:88px;height:12px;float:right;"></div></td>
      <td><div class="sk" style="width:88px;height:12px;float:right;"></div></td>
      <td><div class="sk" style="width:104px;height:38px;border-radius:4px;margin:auto;"></div></td>
    </tr>`).join('');
}

function coinRow(c) {
  const h1  = c.price_change_percentage_1h_in_currency  || 0;
  const h24 = c.price_change_percentage_24h              || 0;
  const d7  = c.price_change_percentage_7d_in_currency  || 0;
  const q   = `Analyze ${c.name.replace(/'/g,"\\'")} (${c.symbol.toUpperCase()}) — Price: ${fmt.price(c.current_price)}, 1h: ${fmt.pct(h1)}, 24h: ${fmt.pct(h24)}, 7d: ${fmt.pct(d7)}, Mkt Cap: ${fmt.large(c.market_cap)}`;
  return `<tr data-id="${c.id}" onclick="jumpTo('${c.id}')">
    <td class="td-rank">${c.market_cap_rank || '—'}</td>
    <td><div class="td-asset">
      <img class="asset-logo" src="${c.image}" alt="${c.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 30 30%22><circle cx=%2215%22 cy=%2215%22 r=%2215%22 fill=%22%23111%22/></svg>'">
      <div><div class="asset-name">${c.name}</div><div class="asset-sym">${c.symbol.toUpperCase()}</div></div>
      <button class="ask-ai-btn" onclick="event.stopPropagation();AI.open();AI.send('${q}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/></svg>
        Ask AI
      </button>
    </div></td>
    <td class="td-price" id="p-${c.id}">${fmt.price(c.current_price)}</td>
    <td class="td-chg"><span class="pill ${h1  >= 0 ? 'up' : 'dn'}">${fmt.pct(h1)}</span></td>
    <td class="td-chg"><span class="pill ${h24 >= 0 ? 'up' : 'dn'}">${fmt.pct(h24)}</span></td>
    <td class="td-chg"><span class="pill ${d7  >= 0 ? 'up' : 'dn'}">${fmt.pct(d7)}</span></td>
    <td class="td-num">${fmt.large(c.market_cap)}</td>
    <td class="td-num">${fmt.large(c.total_volume)}</td>
    <td class="td-spark"><canvas id="sp-${c.id}" width="110" height="40"></canvas></td>
  </tr>`;
}

function renderPage() {
  const coins = filteredCoins();
  const start = (S.page - 1) * CFG.PER_PAGE;
  const slice = coins.slice(start, start + CFG.PER_PAGE);
  const tbody = document.getElementById('mkt-tbody');
  tbody.innerHTML = slice.map(coinRow).join('');

  // Stagger row animations
  tbody.querySelectorAll('tr').forEach((row, i) => {
    row.style.animationDelay = `${i * 18}ms`;
    row.classList.add('row-in');
  });

  requestAnimationFrame(() => {
    slice.forEach(c => {
      const d7 = c.price_change_percentage_7d_in_currency || 0;
      drawSparkline(document.getElementById(`sp-${c.id}`), c.sparkline_in_7d?.price || [], d7 >= 0);
    });
  });

  renderPagination(coins.length);
}

function filteredCoins() {
  let list = [...S.coins];
  if (S.filterMode === 'gainers') list.sort((a,b) => (b.price_change_percentage_24h||0) - (a.price_change_percentage_24h||0));
  else if (S.filterMode === 'losers') list.sort((a,b) => (a.price_change_percentage_24h||0) - (b.price_change_percentage_24h||0));
  else if (S.filterMode === 'volume') list.sort((a,b) => (b.total_volume||0) - (a.total_volume||0));

  if (S.sortCol) {
    const fn = { price:c=>c.current_price||0, h1:c=>c.price_change_percentage_1h_in_currency||0, h24:c=>c.price_change_percentage_24h||0, d7:c=>c.price_change_percentage_7d_in_currency||0, mcap:c=>c.market_cap||0, vol:c=>c.total_volume||0 }[S.sortCol];
    if (fn) list.sort((a,b) => S.sortDir === 'desc' ? fn(b)-fn(a) : fn(a)-fn(b));
  }
  return list;
}

/* ── Pagination ─────────────────────────────────────────────── */
function renderPagination(total) {
  S.totalPages = Math.ceil(total / CFG.PER_PAGE);
  const prev  = document.getElementById('pg-prev');
  const next  = document.getElementById('pg-next');
  const pages = document.getElementById('pg-pages');

  if (prev) prev.disabled = S.page <= 1;
  if (next) next.disabled = S.page >= S.totalPages;
  if (!pages) return;

  let nums = [];
  if (S.totalPages <= 7) { nums = Array.from({length:S.totalPages},(_,i)=>i+1); }
  else {
    nums = [1];
    if (S.page > 3) nums.push('…');
    const lo = Math.max(2, S.page-1), hi = Math.min(S.totalPages-1, S.page+1);
    for (let i = lo; i <= hi; i++) nums.push(i);
    if (S.page < S.totalPages-2) nums.push('…');
    nums.push(S.totalPages);
  }

  pages.innerHTML = nums.map(n => n === '…'
    ? `<span class="pg-ellipsis">…</span>`
    : `<button class="pg-num ${n===S.page?'active':''}" data-p="${n}" role="listitem">${n}</button>`
  ).join('');

  pages.querySelectorAll('.pg-num').forEach(btn => {
    btn.addEventListener('click', () => {
      S.page = +btn.dataset.p; renderPage();
      scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' });
    });
  });
}

/* ── Flash prices ────────────────────────────────────────────── */
function flashPrices() {
  S.coins.forEach(c => {
    const el = document.getElementById(`p-${c.id}`);
    if (!el) return;
    const prev = S.prevPrices[c.id];
    el.textContent = fmt.price(c.current_price);
    if (prev != null && c.current_price !== prev) {
      el.classList.remove('flash-up','flash-dn');
      void el.offsetWidth;
      el.classList.add(c.current_price > prev ? 'flash-up' : 'flash-dn');
    }
    S.prevPrices[c.id] = c.current_price;
  });
}

/* ============================================================
   SEARCH
============================================================ */
function initSearch() {
  const input = document.getElementById('search-input');
  const dd    = document.getElementById('search-dropdown');
  if (!input || !dd) return;
  let timer, selIdx = -1;

  function close() { dd.classList.remove('open'); selIdx = -1; }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      if (!q) { close(); return; }
      const hits = S.coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)).slice(0, 8);
      dd.innerHTML = hits.length
        ? hits.map(c => `<div class="sd-item" data-id="${c.id}"><img src="${c.image}" alt="" loading="lazy" onerror="this.style.display='none'"><div><div class="sd-name">${c.name}</div><div class="sd-sym">${c.symbol.toUpperCase()}</div></div><div class="sd-price">${fmt.price(c.current_price)}</div></div>`).join('')
        : `<div class="sd-empty">No results for "${esc(input.value)}"</div>`;
      dd.querySelectorAll('.sd-item').forEach(el => {
        el.addEventListener('click', () => { jumpTo(el.dataset.id); input.value = ''; close(); });
      });
      dd.classList.add('open');
    }, 180);
  });

  input.addEventListener('keydown', e => {
    const items = dd.querySelectorAll('.sd-item');
    if (e.key === 'ArrowDown') { selIdx = Math.min(selIdx+1, items.length-1); items.forEach((el,i)=>el.classList.toggle('sel',i===selIdx)); e.preventDefault(); }
    if (e.key === 'ArrowUp')   { selIdx = Math.max(selIdx-1, 0);              items.forEach((el,i)=>el.classList.toggle('sel',i===selIdx)); e.preventDefault(); }
    if (e.key === 'Enter' && selIdx >= 0) items[selIdx]?.click();
    if (e.key === 'Escape') { close(); input.blur(); }
  });

  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); input.focus(); }
  });
  document.addEventListener('click', e => { if (!input.contains(e.target) && !dd.contains(e.target)) close(); });
}

/* ============================================================
   SORT + FILTERS + PAGINATION
============================================================ */
function initSort() {
  document.querySelectorAll('.th-sort').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (S.sortCol === col) S.sortDir = S.sortDir === 'desc' ? 'asc' : 'desc';
      else { S.sortCol = col; S.sortDir = 'desc'; }
      document.querySelectorAll('.th-sort').forEach(t => t.classList.toggle('active', t.dataset.col === col));
      S.page = 1; renderPage();
    });
  });
}

function initFilters() {
  document.querySelectorAll('.mf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      S.filterMode = btn.dataset.sort; S.page = 1;
      document.querySelectorAll('.mf-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderPage();
    });
  });
}

function initPagination() {
  document.getElementById('pg-prev')?.addEventListener('click', () => {
    if (S.page > 1) { S.page--; renderPage(); scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' }); }
  });
  document.getElementById('pg-next')?.addEventListener('click', () => {
    if (S.page < S.totalPages) { S.page++; renderPage(); scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' }); }
  });
}

/* ============================================================
   NAV SCROLL + ACTIVE SECTION
============================================================ */
function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 30);
    const sections = ['hero','trending','markets'];
    let active = 'hero';
    sections.forEach(id => { const el = document.getElementById(id); if (el && window.scrollY >= el.offsetTop - 140) active = id; });
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.section === active));
  }, { passive: true });
}

/* ============================================================
   JUMP TO COIN
============================================================ */
window.jumpTo = function(coinId) {
  const list = filteredCoins();
  const idx  = list.findIndex(c => c.id === coinId);
  if (idx === -1) return;
  S.page = Math.floor(idx / CFG.PER_PAGE) + 1;
  renderPage();
  scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' });
  setTimeout(() => {
    const row = document.querySelector(`tr[data-id="${coinId}"]`);
    if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('highlighted'); setTimeout(() => row.classList.remove('highlighted'), 2500); }
  }, 400);
};

/* ============================================================
   FOOTER TIME
============================================================ */
function updateTime() {
  if (S.lastUpdate) { const el = document.getElementById('last-update-footer'); if (el) el.textContent = 'Updated ' + fmt.time(S.lastUpdate); }
}

/* ============================================================
   TOAST
============================================================ */
function toast(msg, err = false) {
  const c = document.getElementById('toasts');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateX(80px)'; setTimeout(()=>el.remove(), 320); }, 3200);
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

/* ============================================================
   DATA LOAD
============================================================ */
async function loadData() {
  try {
    const [mkt, glb, trnd] = await Promise.allSettled([api.markets(), api.global(), api.trending()]);

    if (mkt.status === 'fulfilled') {
      S.coins = mkt.value;
      S.lastUpdate = new Date();
      renderTicker(S.coins);

      if (S.initialized) {
        flashPrices();
      } else {
        S.coins.forEach(c => { S.prevPrices[c.id] = c.current_price; });
        renderPage();
        initSearch();
        S.initialized = true;
        if (window._loaderDone) window._loaderDone();
      }
      updateTime();
    }

    if (glb.status  === 'fulfilled') { S.global   = glb.value;  renderGlobal(glb.value); }
    if (trnd.status === 'fulfilled') { S.trending  = trnd.value; renderTrending(trnd.value); }

  } catch (err) {
    console.error(err);
    toast('Connection issue — retrying…', true);
    if (window._loaderDone) window._loaderDone();
  }
}

/* ============================================================
   BOOT
============================================================ */
async function boot() {
  initNav();
  initSort();
  initFilters();
  initPagination();
  skeletonRows(18);
  AI.init();

  await loadData();

  setInterval(loadData, CFG.REFRESH_MS);
  setInterval(updateTime, 1000);

  toast('Live data connected ✓');
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();

/* ============================================================
   AI MODULE
============================================================ */
const AI = {
  history:   [],
  streaming: false,

  get panel()   { return document.getElementById('ai-panel'); },
  get overlay() { return document.getElementById('ai-overlay'); },
  get fab()     { return document.getElementById('ai-fab'); },
  get msgs()    { return document.getElementById('aip-msgs'); },
  get textarea(){ return document.getElementById('aip-textarea'); },
  get sendBtn() { return document.getElementById('aip-send'); },

  open() {
    this.panel.classList.add('open');
    this.panel.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('open');
    this.fab?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.textarea?.focus(), 450);
  },

  close() {
    this.panel.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.overlay.classList.remove('open');
    this.fab?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  },

  clear() {
    this.history = [];
    const m = this.msgs; if (!m) return;
    m.innerHTML = ''; m.appendChild(this._makeWelcome());
  },

  _makeWelcome() {
    const d = document.createElement('div');
    d.id = 'ai-welcome'; d.className = 'ai-welcome';
    d.innerHTML = `
      <div class="aiw-icon" aria-hidden="true">◈</div>
      <h3>YODA AI Analyst</h3>
      <p>Ask me anything about the market. I have live data on 250+ assets, global stats, and trending coins.</p>
      <div class="ai-chips" role="list">
        <button class="ai-chip" data-q="What's trending in the crypto market right now?" role="listitem">🔥 What's trending right now?</button>
        <button class="ai-chip" data-q="Analyze the top 10 cryptocurrencies by market cap" role="listitem">📊 Analyze the top 10 coins</button>
        <button class="ai-chip" data-q="Which coins are the biggest gainers and losers today?" role="listitem">💹 Biggest gainers &amp; losers</button>
        <button class="ai-chip" data-q="What is the overall crypto market sentiment today?" role="listitem">🌐 Overall market sentiment</button>
      </div>`;
    d.querySelectorAll('.ai-chip').forEach(btn =>
      btn.addEventListener('click', () => { this.open(); this.send(btn.dataset.q); })
    );
    return d;
  },

  snapshot() {
    const top20 = S.coins.slice(0, 20).map(c => ({
      name: c.name, symbol: c.symbol,
      price: fmt.price(c.current_price),
      h1:   (c.price_change_percentage_1h_in_currency  || 0).toFixed(2),
      h24:  (c.price_change_percentage_24h              || 0).toFixed(2),
      d7:   (c.price_change_percentage_7d_in_currency  || 0).toFixed(2),
      mcap: fmt.large(c.market_cap),
    }));
    const trending = ((S.trending?.coins) || []).slice(0,7).map(t => ({
      name: t.item.name, symbol: t.item.symbol,
      change24h: (t.item.data?.price_change_percentage_24h?.usd || 0).toFixed(2),
    }));
    const g = S.global?.data;
    const globalStats = g ? {
      marketCap:    fmt.large(g.total_market_cap?.usd),
      volume:       fmt.large(g.total_volume?.usd),
      btcDom:       (g.market_cap_percentage?.btc || 0).toFixed(1) + '%',
      mcapChange:   (g.market_cap_change_percentage_24h_usd || 0).toFixed(2) + '%',
      activeAssets: (g.active_cryptocurrencies || '—').toString(),
    } : {};
    return { top20, trending, globalStats };
  },

  async send(text) {
    text = (text || '').trim();
    if (!text || this.streaming) return;
    if (this.textarea) { this.textarea.value = ''; this.textarea.style.height = 'auto'; }
    if (this.sendBtn) this.sendBtn.disabled = true;
    document.getElementById('ai-welcome')?.remove();

    this._addBubble('user', text);
    this.history.push({ role: 'user', content: text });
    const thinkEl = this._addThinking();
    this.streaming = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.history.slice(-12), marketSnapshot: this.snapshot() }),
      });

      if (!res.ok) throw new Error(`Server ${res.status}`);
      thinkEl.remove();

      const aiBubble = this._addBubble('ai', '');
      const inner = aiBubble.querySelector('.msg-bubble');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '', buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const { t, error } = JSON.parse(raw);
            if (error) throw new Error(error);
            if (t) { full += t; inner.innerHTML = md(full) + '<span class="stream-cursor"></span>'; this.msgs.scrollTop = this.msgs.scrollHeight; }
          } catch { /* partial */ }
        }
      }
      inner.innerHTML = md(full);
      this.history.push({ role: 'assistant', content: full });

    } catch (err) {
      thinkEl?.remove();
      const errEl = document.createElement('div');
      errEl.className = 'msg ai';
      errEl.innerHTML = `<div class="msg-bubble" style="border-color:rgba(244,63,94,.22);color:#f43f5e">
        AI unavailable. To enable: run <code>ANTHROPIC_API_KEY=sk-ant-… npm start</code> locally.
      </div>`;
      this.msgs.appendChild(errEl);
    } finally {
      this.streaming = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.msgs.scrollTop = this.msgs.scrollHeight;
    }
  },

  _addBubble(role, content) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.innerHTML = role === 'user'
      ? `<div class="msg-bubble">${esc(content)}</div>`
      : `<div class="msg-bubble">${md(content)}</div>`;
    this.msgs.appendChild(el);
    this.msgs.scrollTop = this.msgs.scrollHeight;
    return el;
  },

  _addThinking() {
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.innerHTML = `<div class="msg-bubble"><div class="thinking-dots"><span></span><span></span><span></span></div></div>`;
    this.msgs.appendChild(el);
    this.msgs.scrollTop = this.msgs.scrollHeight;
    return el;
  },

  init() {
    this.fab?.addEventListener('click', () => this.open());
    this.overlay?.addEventListener('click', () => this.close());
    document.getElementById('aip-close')?.addEventListener('click', () => this.close());
    document.getElementById('aip-clear')?.addEventListener('click', () => this.clear());
    this.sendBtn?.addEventListener('click', () => { const t = this.textarea?.value; if (t?.trim()) this.send(t); });
    this.textarea?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const t = this.textarea.value; if (t.trim()) this.send(t); }
    });
    this.textarea?.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 120) + 'px';
      if (this.sendBtn) this.sendBtn.disabled = !this.textarea.value.trim();
    });
    document.addEventListener('keydown', e => { if (e.key==='Escape' && this.panel?.classList.contains('open')) this.close(); });
    document.getElementById('ai-welcome')?.querySelectorAll('.ai-chip').forEach(btn =>
      btn.addEventListener('click', () => { this.open(); this.send(btn.dataset.q); })
    );
  },
};

/* ── Markdown renderer ──────────────────────────────────────── */
function md(raw) {
  if (!raw) return '';
  const blocks = [];
  let s = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push(`<pre><code>${esc(code.trim())}</code></pre>`);
    return `\x00B${blocks.length-1}\x00`;
  });
  s = esc(s);
  s = s.replace(/\x00B(\d+)\x00/g, (_, i) => blocks[i]);
  s = s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g,     '<em>$1</em>')
    .replace(/^###\s(.+)$/gm, '<h4>$1</h4>')
    .replace(/^##\s(.+)$/gm,  '<h3>$1</h3>')
    .replace(/^#\s(.+)$/gm,   '<h3>$1</h3>');
  s = s.replace(/((?:^[-•*]\s.+(?:\n|$))+)/gm, match => {
    const items = match.trim().split('\n').map(l=>`<li>${l.replace(/^[-•*]\s/,'')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  s = s.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>');
  return `<p>${s}</p>`.replace(/<p><\/p>/g,'').replace(/<p>(<[hup])/g,'$1').replace(/(<\/[hup][^>]*>)<\/p>/g,'$1');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
