'use strict';

/* ============================================================
   CONFIG
============================================================ */
const CFG = {
  API:          'https://api.coingecko.com/api/v3',
  REFRESH_MS:   30_000,
  PER_PAGE:     50,
  MAX_COINS:    250,
};

/* ============================================================
   STATE
============================================================ */
const S = {
  coins:        [],
  trending:     [],
  global:       null,
  page:         1,
  totalPages:   1,
  sortCol:      null,
  sortDir:      'desc',
  filterMode:   'default',
  prevPrices:   {},
  initialized:  false,
  lastUpdate:   null,
};

/* ============================================================
   CANVAS BACKGROUND — Perspective Grid + Particles
============================================================ */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles, raf;
  let t = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticles() {
    const n = Math.min(Math.floor(W * H / 14000), 80);
    particles = Array.from({ length: n }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25,
      r:  Math.random() * 1.4 + .4,
      a:  Math.random() * .45 + .08,
      c:  Math.random() > .65 ? '#00f5ff' : Math.random() > .5 ? '#8b5cf6' : '#ffffff',
    }));
  }

  function drawGrid() {
    const cx = W / 2;
    const hy = H * .55;
    const step = (t * .3) % 1;

    ctx.lineWidth = .6;

    // Horizontal lines — perspective scroll
    for (let i = 0; i < 14; i++) {
      const p = (i + step) / 14;
      const y = hy + (H - hy) * p;
      const halfW = (W / 2) * p;
      const a = p * .055;
      ctx.strokeStyle = `rgba(0,245,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(cx - halfW, y);
      ctx.lineTo(cx + halfW, y);
      ctx.stroke();
    }

    // Vertical lines
    const vLines = 14;
    for (let i = -vLines / 2; i <= vLines / 2; i++) {
      const nx = i / (vLines / 2);
      const xBottom = cx + nx * (W / 2);
      const a = (1 - Math.abs(nx)) * .04;
      ctx.strokeStyle = `rgba(0,245,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(xBottom, H);
      ctx.lineTo(cx, hy);
      ctx.stroke();
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = p.a;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Connections
    ctx.lineWidth = .4;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = dx * dx + dy * dy;
        if (d < 8000) {
          ctx.strokeStyle = `rgba(0,245,255,${.04 * (1 - d / 8000)})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    t += .008;
    drawGrid();
    drawParticles();
    raf = requestAnimationFrame(frame);
  }

  resize();
  makeParticles();
  frame();
  window.addEventListener('resize', () => { resize(); makeParticles(); });
})();

/* ============================================================
   SPARKLINE
============================================================ */
function drawSparkline(canvas, data, positive) {
  if (!canvas || !data || data.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, W, H);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  const color = positive ? '#00e887' : '#ff365b';

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, positive ? 'rgba(0,232,135,0.28)' : 'rgba(255,54,91,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  // Path
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i-1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  // Fill
  ctx.lineTo(pts[pts.length-1].x, H);
  ctx.lineTo(pts[0].x, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Stroke
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cx, pts[i-1].y, cx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* ============================================================
   FORMAT HELPERS
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
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n / 1e9 ).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n / 1e6 ).toFixed(2) + 'M';
    return '$' + n.toLocaleString('en');
  },
  pct(n) {
    if (n == null) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  },
  time(d) {
    return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },
};

/* ============================================================
   API
============================================================ */
const api = {
  async markets() {
    const url = `${CFG.API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${CFG.MAX_COINS}&page=1&sparkline=true&price_change_percentage=1h,24h,7d&locale=en`;
    const r = await fetch(url);
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
  // Duplicate for seamless loop
  el.innerHTML = items + items;
}

/* ============================================================
   GLOBAL STATS
============================================================ */
function renderGlobal(data) {
  const g = data.data;
  const mcapChg = g.market_cap_change_percentage_24h_usd || 0;

  setText('sv-mcap', fmt.large(g.total_market_cap?.usd));
  setText('sv-vol',  fmt.large(g.total_volume?.usd));
  setText('sv-dom',  g.market_cap_percentage?.btc?.toFixed(1) + '%');
  setText('sv-coins', g.active_cryptocurrencies?.toLocaleString('en'));
  setText('sv-markets', (g.markets || '—') + ' Markets');

  const dEl = document.getElementById('sd-mcap');
  if (dEl) {
    dEl.textContent = fmt.pct(mcapChg) + ' (24h)';
    dEl.className = 'sc-delta ' + (mcapChg >= 0 ? 'up' : 'dn');
  }

  const bar = document.getElementById('sb-btc');
  if (bar) bar.style.width = Math.min(g.market_cap_percentage?.btc || 0, 100) + '%';
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
    const chg = c.data?.price_change_percentage_24h?.usd || 0;
    const price = c.data?.price || '—';
    return `<div class="trend-card" onclick="jumpTo('${c.id}')">
      <div class="tc-rank">#${idx + 1} Trending</div>
      <div class="tc-head">
        <img src="${c.small}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 36 36%22><circle cx=%2218%22 cy=%2218%22 r=%2218%22 fill=%22%23111%22/></svg>'">
        <div>
          <div class="tc-name">${c.name}</div>
          <div class="tc-sym">${c.symbol}</div>
        </div>
      </div>
      <div class="tc-price">${price}</div>
      <div class="tc-chg ${chg >= 0 ? 'up' : 'dn'}">${fmt.pct(chg)}</div>
      <div class="tc-spark"><canvas id="ts-${idx}" width="158" height="44"></canvas></div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    coins.forEach((item, idx) => {
      const spark = item.item.data?.sparkline?.price || [];
      const chg = item.item.data?.price_change_percentage_24h?.usd || 0;
      drawSparkline(document.getElementById(`ts-${idx}`), spark, chg >= 0);
    });
  });

  const ts = document.getElementById('trending-ts');
  if (ts) ts.textContent = 'Updated ' + fmt.time(new Date());
}

/* ============================================================
   MARKET TABLE
============================================================ */
function skeletonRows(n = 20) {
  const tbody = document.getElementById('mkt-tbody');
  tbody.innerHTML = Array.from({ length: n }, () => `
    <tr class="sk-row">
      <td><div class="sk" style="width:22px;height:13px;margin:auto;"></div></td>
      <td><div style="display:flex;align-items:center;gap:10px;">
        <div class="sk" style="width:30px;height:30px;border-radius:50%;"></div>
        <div><div class="sk" style="width:90px;height:13px;margin-bottom:5px;"></div>
        <div class="sk" style="width:44px;height:10px;"></div></div>
      </div></td>
      <td><div class="sk" style="width:76px;height:13px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:60px;height:22px;border-radius:6px;float:right;"></div></td>
      <td><div class="sk" style="width:88px;height:13px;float:right;"></div></td>
      <td><div class="sk" style="width:88px;height:13px;float:right;"></div></td>
      <td><div class="sk" style="width:100px;height:38px;border-radius:4px;margin:auto;"></div></td>
    </tr>`).join('');
}

function coinRow(c) {
  const h1  = c.price_change_percentage_1h_in_currency  || 0;
  const h24 = c.price_change_percentage_24h              || 0;
  const d7  = c.price_change_percentage_7d_in_currency  || 0;
  return `<tr data-id="${c.id}" onclick="jumpTo('${c.id}')">
    <td class="td-rank">${c.market_cap_rank || '—'}</td>
    <td><div class="td-asset">
      <img class="asset-logo" src="${c.image}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 30 30%22><circle cx=%2215%22 cy=%2215%22 r=%2215%22 fill=%22%23111%22/></svg>'">
      <div><div class="asset-name">${c.name}</div><div class="asset-sym">${c.symbol.toUpperCase()}</div></div>
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

  if (S.filterMode === 'gainers') list = [...list].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
  else if (S.filterMode === 'losers') list = [...list].sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
  else if (S.filterMode === 'volume') list = [...list].sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));

  if (S.sortCol) {
    const getVal = {
      price: c => c.current_price || 0,
      h1:    c => c.price_change_percentage_1h_in_currency  || 0,
      h24:   c => c.price_change_percentage_24h              || 0,
      d7:    c => c.price_change_percentage_7d_in_currency  || 0,
      mcap:  c => c.market_cap   || 0,
      vol:   c => c.total_volume || 0,
    }[S.sortCol];
    if (getVal) list.sort((a, b) => S.sortDir === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b));
  }

  return list;
}

/* ============================================================
   PAGINATION
============================================================ */
function renderPagination(total) {
  S.totalPages = Math.ceil(total / CFG.PER_PAGE);
  const prev = document.getElementById('pg-prev');
  const next = document.getElementById('pg-next');
  const pages = document.getElementById('pg-pages');

  if (prev) prev.disabled = S.page <= 1;
  if (next) next.disabled = S.page >= S.totalPages;

  if (!pages) return;

  const max = 7;
  let nums = [];

  if (S.totalPages <= max) {
    nums = Array.from({ length: S.totalPages }, (_, i) => i + 1);
  } else {
    nums = [1];
    if (S.page > 3) nums.push('…');
    const lo = Math.max(2, S.page - 1);
    const hi = Math.min(S.totalPages - 1, S.page + 1);
    for (let i = lo; i <= hi; i++) nums.push(i);
    if (S.page < S.totalPages - 2) nums.push('…');
    nums.push(S.totalPages);
  }

  pages.innerHTML = nums.map(n =>
    n === '…'
      ? `<span class="pg-ellipsis">…</span>`
      : `<button class="pg-num ${n === S.page ? 'active' : ''}" data-p="${n}">${n}</button>`
  ).join('');

  pages.querySelectorAll('.pg-num').forEach(btn => {
    btn.addEventListener('click', () => {
      S.page = +btn.dataset.p;
      renderPage();
      scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   PRICE FLASH UPDATE
============================================================ */
function flashPrices() {
  S.coins.forEach(c => {
    const el = document.getElementById(`p-${c.id}`);
    if (!el) return;
    const prev = S.prevPrices[c.id];
    el.textContent = fmt.price(c.current_price);
    if (prev != null && c.current_price !== prev) {
      el.classList.remove('flash-up', 'flash-dn');
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

      const hits = S.coins.filter(c =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      ).slice(0, 8);

      if (!hits.length) {
        dd.innerHTML = `<div class="sd-empty">No results for "${input.value}"</div>`;
      } else {
        dd.innerHTML = hits.map(c => `
          <div class="sd-item" data-id="${c.id}">
            <img src="${c.image}" alt="" loading="lazy" onerror="this.style.display='none'">
            <div><div class="sd-name">${c.name}</div><div class="sd-sym">${c.symbol.toUpperCase()}</div></div>
            <div class="sd-price">${fmt.price(c.current_price)}</div>
          </div>`).join('');

        dd.querySelectorAll('.sd-item').forEach(el => {
          el.addEventListener('click', () => {
            jumpTo(el.dataset.id);
            input.value = '';
            close();
          });
        });
      }
      dd.classList.add('open');
    }, 180);
  });

  // Keyboard nav
  input.addEventListener('keydown', e => {
    const items = dd.querySelectorAll('.sd-item');
    if (e.key === 'ArrowDown') { selIdx = Math.min(selIdx + 1, items.length - 1); highlight(items); e.preventDefault(); }
    if (e.key === 'ArrowUp')   { selIdx = Math.max(selIdx - 1, 0);                highlight(items); e.preventDefault(); }
    if (e.key === 'Enter' && selIdx >= 0) { items[selIdx]?.click(); }
    if (e.key === 'Escape') { close(); input.blur(); }
  });

  // ⌘K shortcut
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.focus(); }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dd.contains(e.target)) close();
  });

  function highlight(items) {
    items.forEach((el, i) => el.classList.toggle('selected', i === selIdx));
  }
}

/* ============================================================
   SORT HEADERS
============================================================ */
function initSort() {
  document.querySelectorAll('.th-sort').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (S.sortCol === col) S.sortDir = S.sortDir === 'desc' ? 'asc' : 'desc';
      else { S.sortCol = col; S.sortDir = 'desc'; }
      document.querySelectorAll('.th-sort').forEach(t => t.classList.toggle('active', t.dataset.col === col));
      S.page = 1;
      renderPage();
    });
  });
}

/* ============================================================
   FILTER BUTTONS
============================================================ */
function initFilters() {
  document.querySelectorAll('.mf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      S.filterMode = btn.dataset.sort;
      S.page = 1;
      document.querySelectorAll('.mf-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderPage();
    });
  });
}

/* ============================================================
   PAGINATION BUTTONS
============================================================ */
function initPagination() {
  document.getElementById('pg-prev')?.addEventListener('click', () => {
    if (S.page > 1) { S.page--; renderPage(); scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' }); }
  });
  document.getElementById('pg-next')?.addEventListener('click', () => {
    if (S.page < S.totalPages) { S.page++; renderPage(); scrollTo({ top: document.getElementById('markets').offsetTop - 80, behavior: 'smooth' }); }
  });
}

/* ============================================================
   NAV ACTIVE + SCROLL
============================================================ */
function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 30);

    const sections = ['hero', 'trending', 'markets'];
    let active = 'hero';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) active = id;
    });
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.section === active);
    });
  }, { passive: true });
}

/* ============================================================
   JUMP TO COIN
============================================================ */
window.jumpTo = function(coinId) {
  const marketsSection = document.getElementById('markets');
  if (!marketsSection) return;

  // Find what page the coin is on
  const list = filteredCoins();
  const idx = list.findIndex(c => c.id === coinId);
  if (idx === -1) return;

  S.page = Math.floor(idx / CFG.PER_PAGE) + 1;
  renderPage();

  scrollTo({ top: marketsSection.offsetTop - 80, behavior: 'smooth' });

  setTimeout(() => {
    const row = document.querySelector(`tr[data-id="${coinId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('highlighted');
      setTimeout(() => row.classList.remove('highlighted'), 2200);
    }
  }, 400);
};

/* ============================================================
   ENTRY ANIMATIONS
============================================================ */
function initEntryAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: .1 });

  document.querySelectorAll('.stat-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity .7s ${i * .09}s ease, transform .7s ${i * .09}s cubic-bezier(.16,1,.3,1)`;
    observer.observe(el);
  });
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
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(80px)';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

/* ============================================================
   LAST UPDATE FOOTER
============================================================ */
function updateFooterTime() {
  if (S.lastUpdate) {
    const el = document.getElementById('last-update-footer');
    if (el) el.textContent = 'Updated ' + fmt.time(S.lastUpdate);
  }
}

/* ============================================================
   HELPERS
============================================================ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================================
   DATA LOAD
============================================================ */
async function loadData() {
  try {
    const [mkt, glb, trnd] = await Promise.allSettled([
      api.markets(),
      api.global(),
      api.trending(),
    ]);

    if (mkt.status === 'fulfilled') {
      S.coins = mkt.value;
      S.lastUpdate = new Date();

      renderTicker(S.coins);

      if (S.initialized) {
        // Only flash prices, don't re-render whole table
        flashPrices();
      } else {
        S.coins.forEach(c => { S.prevPrices[c.id] = c.current_price; });
        renderPage();
        initSearch();
        S.initialized = true;
      }
      updateFooterTime();
    }

    if (glb.status === 'fulfilled') renderGlobal(glb.value);
    if (trnd.status === 'fulfilled') renderTrending(trnd.value);

  } catch (err) {
    console.error(err);
    toast('Connection issue — retrying…', true);
  }
}

/* ============================================================
   BOOT
============================================================ */
async function boot() {
  initNav();
  initEntryAnimations();
  initSort();
  initFilters();
  initPagination();
  skeletonRows(20);

  await loadData();

  setInterval(loadData, CFG.REFRESH_MS);
  setInterval(updateFooterTime, 1000);

  toast('Live data connected ✓');
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
