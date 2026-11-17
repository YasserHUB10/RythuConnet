/**
 * RythuConnect · app.js
 * All demo logic. No network calls, no APIs, no frameworks.
 * State lives in demoState; every UI action mutates it and re-renders.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   DEMO STATE  (single source of truth for all tabs)
═══════════════════════════════════════════════════════════════ */
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
  const slot   = demoState.parking[type];
  const pct    = slot.free / slot.total;

  const freeEl   = document.getElementById(`${type}-free`);
  const barEl    = document.getElementById(`${type}-bar`);
  const statusEl = document.getElementById(`${type}-status`);

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

  return `RythuConnect: Unknown command. Try PRICE TOMATO, PARK, or VERIFY R-104.`;
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
});
