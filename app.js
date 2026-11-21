/**
 * RythuConnect · app.js
 * All demo logic. No network calls, no APIs, no frameworks.
 * State lives in demoState; every UI action mutates it and re-renders.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   DEMO STATE  (single source of truth for all tabs)
═══════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'rythuconnect_reviews_v1';

// Exactly 6 seed demo reviews (4 vegetable, 2 vendor), each visibly tagged "Demo"
// Seed-2 has 2 stars and "Not fresh", ensuring the Officer list is not empty on load
const SEED_REVIEWS = [
  { id: 'seed-1', type: 'vegetable', target: 'Tomato', rating: 5, tags: ['Fresh'], comment: 'Firm and red', demo: true, timestamp: 1732000000000 },
  { id: 'seed-2', type: 'vegetable', target: 'Spinach', rating: 2, tags: ['Not fresh'], comment: 'Wilted by noon', demo: true, timestamp: 1732001000000 },
  { id: 'seed-3', type: 'vegetable', target: 'Onion', rating: 4, tags: ['Fair price'], comment: 'Good quality and dry', demo: true, timestamp: 1732002000000 },
  { id: 'seed-4', type: 'vegetable', target: 'Chilli', rating: 4, tags: ['Clean'], comment: 'Spicy and fresh batch', demo: true, timestamp: 1732003000000 },
  { id: 'seed-5', type: 'vendor', target: 'R-104', rating: 5, tags: ['Clean', 'Fair price'], comment: 'Weighed accurately', demo: true, timestamp: 1732004000000 },
  { id: 'seed-6', type: 'vendor', target: 'R-211', rating: 4, tags: ['Fresh'], comment: 'Organized stall display', demo: true, timestamp: 1732005000000 },
];

function loadReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.every(r => r && typeof r.id === 'string' && typeof r.type === 'string' && typeof r.target === 'string' && typeof r.rating === 'number');
        if (valid) return parsed;
      }
    }
  } catch (err) {
    // In-memory fallback
  }
  return JSON.parse(JSON.stringify(SEED_REVIEWS));
}

function saveReviews() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState.reviews));
  } catch (err) {
    // In-memory fallback if storage quota exceeded or disabled
  }
}

const demoState = {
  prices: {
    Tomato:  { value: 40,  unit: 'kg' },
    Onion:   { value: 30,  unit: 'kg' },
    Spinach: { value: 20,  unit: 'bunch' },
    Brinjal: { value: 25,  unit: 'kg' },
    Chilli:  { value: 60,  unit: 'kg' },
  },

  // stall quotes (deliberately differ from prices to enable spot-check)
  stallQuotes: {
    Tomato:  45,
    Onion:   30,
    Spinach: 20,
    Brinjal: 30,  // mismatch
    Chilli:  70,  // mismatch
  },

  vendors: [
    { id: 'R-104', name: 'Raju Naidu',      produce: 'Tomatoes & Chilli', registered: true },
    { id: 'R-211', name: 'Laxmi Devi',      produce: 'Spinach & Greens',  registered: true },
    { id: 'R-305', name: 'Venkat Reddy',    produce: 'Onion & Garlic',    registered: true },
    { id: 'R-999', name: 'Unknown Trader',  produce: 'Mixed Vegetables',  registered: false },
  ],

  parking: {
    cars:  { total: 20, free: 7  },
    bikes: { total: 50, free: 18 },
  },

  spotCheckRun: false,
  lastScanned: null,
  reviews: loadReviews(),
};

/* ═══════════════════════════════════════════════════════════════
   TAB SWITCHER
═══════════════════════════════════════════════════════════════ */
function initTabs() {
  const tabs   = document.querySelectorAll('.demo-tab');
  const panels = document.querySelectorAll('.demo-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => {
        t.classList.remove('demo-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => {
        p.classList.add('demo-panel--hidden');
        p.setAttribute('hidden', '');
      });

      tab.classList.add('demo-tab--active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById('tab-' + target);
      if (panel) {
        panel.classList.remove('demo-panel--hidden');
        panel.removeAttribute('hidden');
      }
    });

    // Keyboard: arrow keys navigate tabs
    tab.addEventListener('keydown', e => {
      const tabArray = [...tabs];
      const idx = tabArray.indexOf(e.target);
      if (e.key === 'ArrowRight') {
        const next = tabArray[(idx + 1) % tabArray.length];
        next.focus(); next.click();
      } else if (e.key === 'ArrowLeft') {
        const prev = tabArray[(idx - 1 + tabArray.length) % tabArray.length];
        prev.focus(); prev.click();
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   PRICE BOARD TAB
═══════════════════════════════════════════════════════════════ */
function buildPriceBoard() {
  const inputsEl  = document.getElementById('price-inputs');
  const displayEl = document.getElementById('price-board-display');
  if (!inputsEl || !displayEl) return;

  // Build officer input rows
  inputsEl.innerHTML = Object.entries(demoState.prices).map(([name, data]) => `
    <div class="price-row">
      <label for="price-${name}">${name}</label>
      <input
        id="price-${name}"
        type="number"
        min="1"
        max="999"
        inputmode="numeric"
        value="${data.value}"
        data-item="${name}"
        aria-label="${name} price in rupees per ${data.unit}"
      />
      <span class="price-unit">₹/${data.unit}</span>
    </div>
  `).join('');

  // Listen for officer changes
  inputsEl.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      const item = input.dataset.item;
      const val  = parseInt(input.value, 10);
      if (!isNaN(val) && val > 0) {
        demoState.prices[item].value = val;
        demoState.spotCheckRun = false;    // reset spot-check on edit
        renderPriceDisplay();
        clearSpotCheck();
      }
    });
  });

  renderPriceDisplay();
}

function renderPriceDisplay() {
  const displayEl = document.getElementById('price-board-display');
  if (!displayEl) return;

  displayEl.innerHTML = Object.entries(demoState.prices).map(([name, data]) => {
    const isMismatch = demoState.spotCheckRun &&
      demoState.stallQuotes[name] !== data.value;
    return `
      <div class="pb-row${isMismatch ? ' pb-row--mismatch' : ''}">
        <span class="pb-row__name">${name}</span>
        <span class="pb-row__price">
          ₹${data.value}<small>/${data.unit}</small>
          ${isMismatch
            ? `<span class="pb-row__mismatch-tag" aria-label="Price mismatch detected">⚑ Mismatch</span>`
            : ''}
        </span>
      </div>
    `;
  }).join('');
}

function clearSpotCheck() {
  const el = document.getElementById('spotcheck-result');
  if (el) { el.hidden = true; el.textContent = ''; }
}

function initSpotCheck() {
  const btn = document.getElementById('btn-spotcheck');
  if (!btn) return;

  btn.addEventListener('click', () => {
    demoState.spotCheckRun = true;
    renderPriceDisplay();

    const mismatches = Object.entries(demoState.prices).filter(([name, data]) =>
      demoState.stallQuotes[name] !== data.value
    );

    const el = document.getElementById('spotcheck-result');
    if (!el) return;

    if (mismatches.length === 0) {
      el.textContent = '✓ No mismatches found. All stall prices match the board.';
      el.style.background = 'rgba(61,158,68,0.15)';
      el.style.borderColor = 'rgba(61,158,68,0.4)';
      el.style.color = 'var(--leaf-light)';
    } else {
      el.innerHTML = `
        <strong>⚑ ${mismatches.length} mismatch${mismatches.length > 1 ? 'es' : ''} detected</strong>
        <ul style="margin-top:8px; padding-left:16px; list-style:disc;">
          ${mismatches.map(([name, data]) =>
            `<li>${name}: Board ₹${data.value} · Stall quote ₹${demoState.stallQuotes[name]}</li>`
          ).join('')}
        </ul>
        <small style="display:block; margin-top:8px; opacity:0.7;">Demo data — stall quotes are simulated</small>
      `;
      el.style.background = '';
      el.style.borderColor = '';
      el.style.color = '';
    }
    el.hidden = false;
    el.focus();
  });
}

/* ═══════════════════════════════════════════════════════════════
   VENDOR QR TAB
═══════════════════════════════════════════════════════════════ */

// Deterministic fake QR pattern from a string seed
function qrPattern(seed) {
  const bits = [];
  for (let i = 0; i < 49; i++) {
    const h = (seed.charCodeAt(i % seed.length) * (i + 7) * 31) & 0xff;
    bits.push(h > 100 ? 1 : 0);
  }
  // Always fill corners (finder pattern feel)
  [0,1,2,7,14,21,28,35,42,43,44,45,46,47,48].forEach(i => bits[i] = 1);
  return bits;
}

function buildVendorCards() {
  const container = document.getElementById('vendor-cards');
  if (!container) return;

  container.innerHTML = demoState.vendors.map(v => {
    const bits = qrPattern(v.id + v.name);
    const cells = bits.map(b =>
      `<div class="qr-cell${b ? '' : ' qr-cell--empty'}"></div>`
    ).join('');

    return `
      <div class="vendor-card${v.registered ? ' vendor-card--verified' : ' vendor-card--unverified'}"
           role="listitem">
        <div class="vendor-card__id">${v.id}</div>
        <div class="vendor-card__name">${v.name}</div>
        <div class="vendor-card__produce">🌿 ${v.produce}</div>
        <div class="vendor-card__qr" aria-hidden="true">${cells}</div>
        <button class="scan-btn" data-vendor-id="${v.id}" aria-label="Scan QR for ${v.name}">
          📷 Scan QR
        </button>
      </div>
    `;
  }).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.scan-btn');
    if (!btn) return;
    const vid = btn.dataset.vendorId;
    simulateScan(vid);
  });
}

function simulateScan(vendorId) {
  const resultEl = document.getElementById('scan-result');
  if (!resultEl) return;

  const vendor = demoState.vendors.find(v => v.id === vendorId);
  if (!vendor) return;

  // Scanning animation
  resultEl.className = 'scan-result';
  resultEl.innerHTML = `<span style="color:var(--chalk-dim)">🔍 Scanning ${vendorId}…</span>`;

  const delay = prefersReducedMotion() ? 0 : 800;

  setTimeout(() => {
    if (vendor.registered) {
      resultEl.className = 'scan-result scan-result--verified';
      resultEl.innerHTML = `
        ✅ <strong>${vendor.id} · ${vendor.name}</strong><br>
        <span style="font-size:0.85rem; font-weight:400;">Registered farmer-vendor · ${vendor.produce}</span>
        <small style="display:block;font-size:0.7rem;opacity:0.6;margin-top:4px;">Demo data</small>
      `;
    } else {
      resultEl.className = 'scan-result scan-result--fail';
      resultEl.innerHTML = `
        ❌ <strong>${vendor.id} — Not registered</strong><br>
        <span style="font-size:0.85rem; font-weight:400;">No matching farmer ID in the system. Report to Estate Officer.</span>
        <small style="display:block;font-size:0.7rem;opacity:0.6;margin-top:4px;">Demo data</small>
      `;
    }
    demoState.lastScanned = vendorId;
    resultEl.setAttribute('tabindex', '-1');
    resultEl.focus();
  }, delay);
}

/* ═══════════════════════════════════════════════════════════════
   PARKING TAB
═══════════════════════════════════════════════════════════════ */
function renderParking(type) {
  // type is the demoState key ('cars' / 'bikes')
  // DOM element IDs use the singular prefix ('car-free' / 'bike-free')
  const domPrefix = type.replace(/s$/, '');   // 'cars'→'car', 'bikes'→'bike'
  const slot   = demoState.parking[type];
  const pct    = slot.free / slot.total;

  const freeEl   = document.getElementById(`${domPrefix}-free`);
  const barEl    = document.getElementById(`${domPrefix}-bar`);
  const statusEl = document.getElementById(`${domPrefix}-status`);

  if (!freeEl || !barEl || !statusEl) return;

  freeEl.textContent = slot.free;

  const barPct = Math.round(pct * 100);
  barEl.style.width = barPct + '%';

  // Colour thresholds
  if (pct >= 0.4) {
    barEl.className   = 'slot-bar';
    freeEl.className  = 'slot-free';
    statusEl.className= 'slot-status';
    statusEl.textContent = 'Available';
  } else if (pct >= 0.2) {
    barEl.className   = 'slot-bar slot-bar--warn';
    freeEl.className  = 'slot-free slot-free--warn';
    statusEl.className= 'slot-status slot-status--warn';
    statusEl.textContent = 'Filling up';
  } else {
    barEl.className   = 'slot-bar slot-bar--alert';
    freeEl.className  = 'slot-free slot-free--alert';
    statusEl.className= 'slot-status slot-status--alert';
    statusEl.textContent = slot.free === 0 ? 'Full' : 'Nearly full';
  }
}

function initParking() {
  ['car', 'bike'].forEach(type => {
    const plural = type === 'car' ? 'cars' : 'bikes';

    renderParking(plural);

    const enterBtn = document.getElementById(`${type}-enter`);
    const leaveBtn = document.getElementById(`${type}-leave`);
    if (!enterBtn || !leaveBtn) return;

    enterBtn.addEventListener('click', () => {
      const slot = demoState.parking[plural];
      if (slot.free > 0) {
        slot.free--;
        renderParking(plural);
        // Sync SMS
        announceParkingChange(plural, 'enter');
      } else {
        // Provide accessible feedback
        enterBtn.setAttribute('aria-label', `${plural} parking full`);
        setTimeout(() => enterBtn.setAttribute('aria-label', `Enter ${plural}`), 1500);
      }
    });

    leaveBtn.addEventListener('click', () => {
      const slot = demoState.parking[plural];
      if (slot.free < slot.total) {
        slot.free++;
        renderParking(plural);
        announceParkingChange(plural, 'leave');
      }
    });
  });
}

function announceParkingChange(type, dir) {
  // Politely announce change for screen readers via aria-live on parking meter
  const meterId = type === 'cars' ? 'car-meter' : 'bike-meter';
  const meter   = document.getElementById(meterId);
  if (meter) {
    const slot = demoState.parking[type];
    meter.setAttribute('aria-label',
      `${type === 'cars' ? 'Car' : 'Bike'} parking: ${slot.free} of ${slot.total} slots free. ${dir === 'enter' ? 'Vehicle entered.' : 'Vehicle left.'}`
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   SMS / USSD TAB
═══════════════════════════════════════════════════════════════ */
function initSMS() {
  const thread = document.getElementById('sms-thread');
  const keys   = document.querySelectorAll('.phone-key');
  if (!thread || !keys.length) return;

  keys.forEach(key => {
    key.addEventListener('click', () => {
      const cmd = key.dataset.cmd;
      appendSMSOut(thread, cmd);

      const delay = prefersReducedMotion() ? 0 : 500;
      setTimeout(() => {
        const reply = handleSMSCommand(cmd);
        appendSMSReply(thread, reply);
      }, delay);
    });
  });
}

function handleSMSCommand(cmd) {
  const upper = cmd.toUpperCase().trim();

  // PRICE <item>
  if (upper.startsWith('PRICE ')) {
    const item = cmd.slice(6).trim();
    const key  = Object.keys(demoState.prices).find(
      k => k.toLowerCase() === item.toLowerCase()
    );
    if (key) {
      const p = demoState.prices[key];
      return `RythuConnect: ${key} today ₹${p.value}/${p.unit} (Officer-verified price)\n[Demo data]`;
    }
    return `RythuConnect: Item "${item}" not found. Try PRICE TOMATO, PRICE ONION.`;
  }

  // PARK
  if (upper === 'PARK') {
    const c = demoState.parking.cars;
    const b = demoState.parking.bikes;
    return (
      `RythuConnect Parking — Mehdipatnam\n` +
      `🚗 Cars:  ${c.free}/${c.total} free\n` +
      `🏍 Bikes: ${b.free}/${b.total} free\n` +
      `[Demo data]`
    );
  }

  // VERIFY <id>
  if (upper.startsWith('VERIFY ')) {
    const id     = cmd.slice(7).trim().toUpperCase();
    const vendor = demoState.vendors.find(v => v.id === id);
    if (!vendor) {
      return `RythuConnect: ID "${id}" not found in registry. Report to Estate Officer.\n[Demo data]`;
    }
    if (vendor.registered) {
      return `✅ ${vendor.id} VERIFIED\n${vendor.name} — ${vendor.produce}\nRegistered farmer-vendor\n[Demo data]`;
    }
    return `❌ ${vendor.id} NOT REGISTERED\n${vendor.name} is not in the farmer registry.\n[Demo data]`;
  }

  // RATE <item> <1-5>
  if (upper.startsWith('RATE')) {
    const parts = cmd.trim().split(/\s+/);
    if (parts.length < 3) {
      return `RythuConnect: Use RATE <item> <1-5>. Items: Tomato, Onion, Spinach, Brinjal, Chilli.\n[Demo data]`;
    }
    const itemInput = parts[1];
    const ratingInput = parseInt(parts[2], 10);

    const matchedKey = Object.keys(demoState.prices).find(
      k => k.toLowerCase() === itemInput.toLowerCase()
    );

    if (!matchedKey || isNaN(ratingInput) || ratingInput < 1 || ratingInput > 5) {
      return `RythuConnect: Use RATE <item> <1-5>. Items: Tomato, Onion, Spinach, Brinjal, Chilli.\n[Demo data]`;
    }

    const newReview = {
      id: 'sms-' + Date.now(),
      type: 'vegetable',
      target: matchedKey,
      rating: ratingInput,
      tags: ratingInput <= 2 ? ['Not fresh'] : ['Fresh'],
      comment: 'via SMS',
      demo: true,
      timestamp: Date.now(),
    };

    demoState.reviews.unshift(newReview);
    saveReviews();
    renderReviewsUI();

    const vegReviews = demoState.reviews.filter(r => r.type === 'vegetable' && r.target === matchedKey);
    const avg = (vegReviews.reduce((sum, r) => sum + r.rating, 0) / vegReviews.length).toFixed(1);
    const count = vegReviews.length;

    return `RythuConnect: Rated ${matchedKey} ${ratingInput}★ via SMS. New average: ${avg}★ (${count} review${count > 1 ? 's' : ''})\n[Demo data]`;
  }

  return `RythuConnect: Unknown command. Try PRICE TOMATO, PARK, VERIFY R-104, or RATE TOMATO 4.`;
}

/* ═══════════════════════════════════════════════════════════════
   REVIEWS TAB
═══════════════════════════════════════════════════════════════ */
let currentReviewMode = 'vegetable';
let selectedStar = 0;
const selectedTags = new Set();

function renderReviewsUI() {
  renderReviewsSummary();
  renderLatestReviews();
  renderFlaggedReviews();
}

function renderReviewsSummary() {
  const listEl = document.getElementById('reviews-summary-list');
  const titleEl = document.getElementById('reviews-board-title');
  const hintEl = document.getElementById('reviews-board-hint');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (currentReviewMode === 'vegetable') {
    if (titleEl) titleEl.textContent = '🛒 Produce Ratings';
    if (hintEl) hintEl.textContent = 'Average ratings from shoppers at Rythu Bazaar, Mehdipatnam.';

    Object.keys(demoState.prices).forEach(vegName => {
      const vegReviews = demoState.reviews.filter(r => r.type === 'vegetable' && r.target === vegName);
      const row = document.createElement('div');
      row.className = 'pb-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'pb-row__name';
      nameSpan.textContent = vegName;
      row.appendChild(nameSpan);

      const ratingSpan = document.createElement('span');
      if (vegReviews.length > 0) {
        const avg = (vegReviews.reduce((sum, r) => sum + r.rating, 0) / vegReviews.length).toFixed(1);
        ratingSpan.className = 'review-row__rating';
        ratingSpan.textContent = `★ ${avg} `;

        const countSpan = document.createElement('span');
        countSpan.className = 'review-row__count';
        countSpan.textContent = `(${vegReviews.length} review${vegReviews.length > 1 ? 's' : ''})`;
        ratingSpan.appendChild(countSpan);
      } else {
        ratingSpan.className = 'review-row__empty';
        ratingSpan.textContent = 'No reviews yet';
      }
      row.appendChild(ratingSpan);
      listEl.appendChild(row);
    });
  } else {
    // vendor mode
    if (titleEl) titleEl.textContent = '👨‍🌾 Verified Farmer Ratings';
    if (hintEl) hintEl.textContent = 'Ratings for official QR-verified vendors at Mehdipatnam.';

    const verifiedVendors = demoState.vendors.filter(v => v.registered);
    verifiedVendors.forEach(vendor => {
      const vendorReviews = demoState.reviews.filter(r => r.type === 'vendor' && r.target === vendor.id);
      const row = document.createElement('div');
      row.className = 'pb-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'pb-row__name';
      nameSpan.textContent = `${vendor.id} · ${vendor.name}`;
      row.appendChild(nameSpan);

      const ratingSpan = document.createElement('span');
      if (vendorReviews.length > 0) {
        const avg = (vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length).toFixed(1);
        ratingSpan.className = 'review-row__rating';
        ratingSpan.textContent = `★ ${avg} `;

        const countSpan = document.createElement('span');
        countSpan.className = 'review-row__count';
        countSpan.textContent = `(${vendorReviews.length} review${vendorReviews.length > 1 ? 's' : ''})`;
        ratingSpan.appendChild(countSpan);
      } else {
        ratingSpan.className = 'review-row__empty';
        ratingSpan.textContent = 'No reviews yet';
      }
      row.appendChild(ratingSpan);
      listEl.appendChild(row);
    });
  }
}

function populateTargetSelect() {
  const selectEl = document.getElementById('review-target-select');
  const labelEl = document.getElementById('review-target-label');
  const noteEl = document.getElementById('vendor-mode-note');
  if (!selectEl) return;

  selectEl.innerHTML = '';

  if (currentReviewMode === 'vegetable') {
    if (labelEl) labelEl.textContent = 'Select Vegetable';
    if (noteEl) noteEl.hidden = true;

    Object.keys(demoState.prices).forEach(veg => {
      const opt = document.createElement('option');
      opt.value = veg;
      opt.textContent = veg;
      selectEl.appendChild(opt);
    });
  } else {
    if (labelEl) labelEl.textContent = 'Select Vendor (QR-Verified)';
    if (noteEl) noteEl.hidden = false;

    demoState.vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      if (v.registered) {
        opt.textContent = `${v.id} · ${v.name}`;
      } else {
        opt.textContent = `${v.id} · not verified`;
        opt.disabled = true;
      }
      selectEl.appendChild(opt);
    });
  }
}

function renderLatestReviews() {
  const container = document.getElementById('latest-reviews-list');
  if (!container) return;

  container.innerHTML = '';

  const latest = demoState.reviews.slice(0, 4);
  if (latest.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'flagged-empty';
    empty.textContent = 'No reviews recorded yet.';
    container.appendChild(empty);
    return;
  }

  latest.forEach(r => {
    const card = document.createElement('div');
    card.className = 'latest-review-card';

    // Header: Target & Stars
    const header = document.createElement('div');
    header.className = 'latest-review-card__header';

    const targetSpan = document.createElement('span');
    targetSpan.className = 'latest-review-card__target';
    if (r.type === 'vendor') {
      const vendorObj = demoState.vendors.find(v => v.id === r.target);
      targetSpan.textContent = vendorObj ? `${r.target} (${vendorObj.name})` : r.target;
    } else {
      targetSpan.textContent = r.target;
    }
    header.appendChild(targetSpan);

    const starsSpan = document.createElement('span');
    starsSpan.className = 'latest-review-card__stars';
    starsSpan.setAttribute('aria-label', `${r.rating} stars`);
    starsSpan.textContent = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    header.appendChild(starsSpan);
    card.appendChild(header);

    // Tags
    if (Array.isArray(r.tags) && r.tags.length > 0) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'latest-review-card__tags';
      r.tags.forEach(t => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'latest-review-card__tag';
        if (t === 'Not fresh' || t === 'Overpriced') {
          tagSpan.classList.add('latest-review-card__tag--neg');
        }
        tagSpan.textContent = t;
        tagsWrap.appendChild(tagSpan);
      });
      card.appendChild(tagsWrap);
    }

    // Comment (strictly safe via textContent)
    if (r.comment && r.comment.trim()) {
      const commentP = document.createElement('p');
      commentP.className = 'latest-review-card__comment';
      commentP.textContent = r.comment;
      card.appendChild(commentP);
    }

    // Meta
    const meta = document.createElement('div');
    meta.className = 'latest-review-card__meta';

    const demoSpan = document.createElement('span');
    demoSpan.textContent = r.demo ? 'Demo review' : 'Verified review';
    meta.appendChild(demoSpan);

    const typeSpan = document.createElement('span');
    typeSpan.textContent = r.type === 'vendor' ? 'Vendor review' : 'Produce review';
    meta.appendChild(typeSpan);

    card.appendChild(meta);
    container.appendChild(card);
  });
}

function renderFlaggedReviews() {
  const listEl = document.getElementById('flagged-reviews-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const flagged = demoState.reviews.filter(r =>
    r.rating <= 2 ||
    (Array.isArray(r.tags) && (r.tags.includes('Not fresh') || r.tags.includes('Overpriced')))
  );

  if (flagged.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'flagged-empty';
    empty.textContent = 'No issues flagged yet. System clean.';
    listEl.appendChild(empty);
    return;
  }

  flagged.slice(0, 4).forEach(r => {
    const item = document.createElement('div');
    item.className = 'flagged-item';

    const top = document.createElement('div');
    top.className = 'flagged-item__top';

    const target = document.createElement('span');
    target.className = 'flagged-item__target';
    if (r.type === 'vendor') {
      const vendorObj = demoState.vendors.find(v => v.id === r.target);
      target.textContent = vendorObj ? `${r.target} · ${vendorObj.name}` : r.target;
    } else {
      target.textContent = r.target;
    }
    top.appendChild(target);

    const stars = document.createElement('span');
    stars.className = 'flagged-item__stars';
    stars.textContent = `${r.rating}★`;
    top.appendChild(stars);
    item.appendChild(top);

    if (Array.isArray(r.tags) && r.tags.length > 0) {
      const tagsSpan = document.createElement('div');
      tagsSpan.className = 'flagged-item__tags';
      tagsSpan.textContent = `Flags: ${r.tags.join(', ')}`;
      item.appendChild(tagsSpan);
    }

    if (r.comment && r.comment.trim()) {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'flagged-item__comment';
      commentDiv.textContent = `"${r.comment}"`;
      item.appendChild(commentDiv);
    }

    listEl.appendChild(item);
  });
}

function updateStarButtons(starButtons, starCount) {
  starButtons.forEach(btn => {
    const s = parseInt(btn.dataset.star, 10);
    const active = s <= starCount;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (active) {
      btn.classList.add('star-btn--active');
    } else {
      btn.classList.remove('star-btn--active');
    }
  });
}

function clearReviewValidation() {
  const valMsg = document.getElementById('review-validation-msg');
  if (valMsg) {
    valMsg.textContent = '';
    valMsg.className = 'review-validation-msg';
  }
}

function initReviews() {
  populateTargetSelect();
  renderReviewsUI();

  // Mode chip switching
  const chipVeg = document.getElementById('chip-mode-veg');
  const chipVendor = document.getElementById('chip-mode-vendor');

  if (chipVeg && chipVendor) {
    chipVeg.addEventListener('click', () => {
      currentReviewMode = 'vegetable';
      chipVeg.classList.add('review-chip--active');
      chipVeg.setAttribute('aria-pressed', 'true');
      chipVendor.classList.remove('review-chip--active');
      chipVendor.setAttribute('aria-pressed', 'false');
      populateTargetSelect();
      renderReviewsSummary();
      clearReviewValidation();
    });

    chipVendor.addEventListener('click', () => {
      currentReviewMode = 'vendor';
      chipVendor.classList.add('review-chip--active');
      chipVendor.setAttribute('aria-pressed', 'true');
      chipVeg.classList.remove('review-chip--active');
      chipVeg.setAttribute('aria-pressed', 'false');
      populateTargetSelect();
      renderReviewsSummary();
      clearReviewValidation();
    });
  }

  // Star rating buttons with keyboard accessibility
  const starButtons = document.querySelectorAll('.star-btn');
  starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const star = parseInt(btn.dataset.star, 10);
      selectedStar = star;
      updateStarButtons(starButtons, selectedStar);
      clearReviewValidation();
    });

    btn.addEventListener('keydown', e => {
      let nextStar = selectedStar;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        nextStar = Math.min(5, selectedStar + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        nextStar = Math.max(1, selectedStar - 1);
      } else if (e.key === 'Home') {
        nextStar = 1;
      } else if (e.key === 'End') {
        nextStar = 5;
      }
      if (nextStar !== selectedStar) {
        e.preventDefault();
        selectedStar = nextStar;
        updateStarButtons(starButtons, selectedStar);
        const targetBtn = document.querySelector(`.star-btn[data-star="${selectedStar}"]`);
        if (targetBtn) targetBtn.focus();
        clearReviewValidation();
      }
    });
  });

  // Quick tags
  const tagChips = document.querySelectorAll('.tag-chip');
  tagChips.forEach(chip => {
    const tag = chip.dataset.tag;
    if (tag === 'Not fresh' || tag === 'Overpriced') {
      chip.classList.add('tag-chip--negative');
    }
    chip.addEventListener('click', () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        chip.setAttribute('aria-pressed', 'false');
        chip.classList.remove('tag-chip--active');
      } else {
        selectedTags.add(tag);
        chip.setAttribute('aria-pressed', 'true');
        chip.classList.add('tag-chip--active');
      }
    });
  });

  // Comment input counter
  const commentInput = document.getElementById('review-comment-input');
  const charCounter = document.getElementById('review-char-count');
  if (commentInput && charCounter) {
    commentInput.addEventListener('input', () => {
      charCounter.textContent = `${commentInput.value.length} / 100`;
    });
  }

  // Review form submit
  const form = document.getElementById('review-form');
  const valMsg = document.getElementById('review-validation-msg');
  const targetSelect = document.getElementById('review-target-select');

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      if (selectedStar === 0) {
        if (valMsg) {
          valMsg.textContent = 'Please select a star rating (1–5) before submitting.';
          valMsg.className = 'review-validation-msg';
        }
        return;
      }

      const targetVal = targetSelect ? targetSelect.value : '';
      if (!targetVal || targetVal === 'R-999') {
        if (valMsg) {
          valMsg.textContent = 'Only QR-verified vendors can be rated.';
          valMsg.className = 'review-validation-msg';
        }
        return;
      }

      const commentVal = commentInput ? commentInput.value.trim().slice(0, 100) : '';

      const review = {
        id: 'rev-' + Date.now(),
        type: currentReviewMode,
        target: targetVal,
        rating: selectedStar,
        tags: Array.from(selectedTags),
        comment: commentVal,
        demo: true,
        timestamp: Date.now(),
      };

      demoState.reviews.unshift(review);
      saveReviews();

      // Reset form controls
      selectedStar = 0;
      updateStarButtons(starButtons, 0);
      selectedTags.clear();
      tagChips.forEach(c => {
        c.setAttribute('aria-pressed', 'false');
        c.classList.remove('tag-chip--active');
      });
      if (commentInput) commentInput.value = '';
      if (charCounter) charCounter.textContent = '0 / 100';

      if (valMsg) {
        valMsg.textContent = `✓ Review submitted for ${targetVal}!`;
        valMsg.className = 'review-validation-msg review-validation-msg--success';
      }

      renderReviewsUI();
    });
  }

  // Reset demo reviews button
  const resetBtn = document.getElementById('btn-reset-reviews');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      demoState.reviews = JSON.parse(JSON.stringify(SEED_REVIEWS));
      saveReviews();
      selectedStar = 0;
      updateStarButtons(starButtons, 0);
      selectedTags.clear();
      tagChips.forEach(c => {
        c.setAttribute('aria-pressed', 'false');
        c.classList.remove('tag-chip--active');
      });
      if (commentInput) commentInput.value = '';
      if (charCounter) charCounter.textContent = '0 / 100';
      if (valMsg) {
        valMsg.textContent = 'Demo reviews reset to initial state.';
        valMsg.className = 'review-validation-msg review-validation-msg--success';
      }
      renderReviewsUI();
    });
  }
}

function appendSMSOut(thread, text) {
  const bubble = document.createElement('div');
  bubble.className = 'sms-bubble sms-bubble--out';
  bubble.textContent = text;
  thread.appendChild(bubble);
  thread.scrollTop = thread.scrollHeight;
}

function appendSMSReply(thread, text) {
  const bubble = document.createElement('div');
  bubble.className = 'sms-bubble sms-bubble--reply';
  // Preserve newlines
  bubble.innerHTML = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  thread.appendChild(bubble);
  thread.scrollTop = thread.scrollHeight;
}

/* ═══════════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════════ */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  buildPriceBoard();
  initSpotCheck();
  buildVendorCards();
  initParking();
  initSMS();
  initReviews();
});
