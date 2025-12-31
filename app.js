// ==========================================================
// SYDNEY HARBOUR POOLS — MAIN APP LOGIC
// ==========================================================

import { loadPools } from './data.js';
import {
  readVisited,
  writeVisited,
  countVisited,
  readSelection,
  writeSelection,
  readStampsPage,
  writeStampsPage
} from './storage.js';

// ----------------------------------------------------------
// APPLICATION STATE
// ----------------------------------------------------------

let pools = [];
let visited = readVisited();
let selectedIndex = readSelection();
let currentStampsPage = readStampsPage();
let onStampsView = false;

let map;
let marker;

// ----------------------------------------------------------
// DOM ELEMENT REFERENCES
// ----------------------------------------------------------

const listView           = document.getElementById('listView');
const stampsView         = document.getElementById('passportView');
const toggleBtn          = document.getElementById('toggleBtn');
const resetBtn           = document.getElementById('resetBtn');
const countBadge         = document.getElementById('countBadge');
const mapToggle          = document.getElementById('mapToggle');
const prevStampsPageBtn  = document.getElementById('prevPassportPage');
const nextStampsPageBtn  = document.getElementById('nextPassportPage');
const openNativeMapBtn   = document.getElementById('openNativeMap');

const btnUp   = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');

// ----------------------------------------------------------
// TREASURE OVERLAYS (Pirate version)
// ----------------------------------------------------------

const PIRATE_RAYMOND_SRC = './assets/raymond-pirate.png';

let overlayStylesInjected = false;

function ensureOverlayStyles() {
  if (overlayStylesInjected) return;
  overlayStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'treasure-overlay-styles';
  style.textContent = `
    .treasure-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.55);
      padding: 18px;
    }
    .treasure-card {
      width: min(420px, 92vw);
      border-radius: 18px;
      background: rgba(255,255,255,0.96);
      box-shadow: 0 20px 70px rgba(0,0,0,0.35);
      padding: 18px 16px 16px;
      text-align: center;
      transform: translateY(8px);
      animation: treasurePop 260ms ease-out forwards;
    }
    @keyframes treasurePop {
      from { transform: translateY(10px) scale(0.98); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    .treasure-card .stamp-img {
      width: 110px;
      height: 110px;
      object-fit: contain;
      border-radius: 18px;
      display: block;
      margin: 0 auto 10px;
    }
    .treasure-card .raymond-img {
      width: 160px;
      height: 160px;
      object-fit: contain;
      display: block;
      margin: 0 auto 8px;
    }
    .treasure-title {
      font-size: 22px;
      font-weight: 800;
      margin: 6px 0 4px;
    }
    .treasure-subtitle {
      font-size: 16px;
      font-weight: 650;
      margin: 0;
      opacity: 0.85;
    }
    .treasure-hint {
      font-size: 13px;
      margin-top: 10px;
      opacity: 0.55;
    }
    .treasure-sparkle {
      font-size: 34px;
      line-height: 1;
      margin-bottom: 6px;
    }
  `;
  document.head.appendChild(style);
}

function showTreasureOverlay({ title, subtitle, stampSrc, finale = false }) {
  ensureOverlayStyles();

  document.querySelector('.treasure-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'treasure-overlay';

  const card = document.createElement('div');
  card.className = 'treasure-card';

  card.innerHTML = `
    <div class="treasure-sparkle">${finale ? '🎉🏴‍☠️✨' : '✨'}</div>
    ${finale ? `<img class="raymond-img" src="${PIRATE_RAYMOND_SRC}" alt="Raymond pirate">` : ''}
    ${stampSrc ? `<img class="stamp-img" src="${stampSrc}" alt="Treasure stamp">` : ''}
    <div class="treasure-title">${title || ''}</div>
    ${subtitle ? `<div class="treasure-subtitle">${subtitle}</div>` : ''}
    <div class="treasure-hint">tap anywhere</div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => overlay.remove());

  const ms = finale ? 2200 : 1400;
  window.setTimeout(() => {
    if (overlay.isConnected) overlay.remove();
  }, ms);
}

// ----------------------------------------------------------
// DATE HELPERS
// ----------------------------------------------------------

function formatDateAU(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
  return d;
}

function dateKey(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.replace(/-/g, '');
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [day, month, year] = d.split('/');
    return `${year}${month}${day}`;
  }
  return String(d).replace(/\D/g, '');
}

// ----------------------------------------------------------
// HEADER COUNT ("X / Y")
// ----------------------------------------------------------

function updateCount() {
  const done = countVisited(visited);
  countBadge.textContent = `${done} / ${pools.length}`;
}

// ----------------------------------------------------------
// VIEW SWITCHING (List ↔ Stamps)
// ----------------------------------------------------------

function setView(showStamps) {
  onStampsView = showStamps;

  document.body.classList.remove('full-map');
  listView.classList.toggle('active', !showStamps);
  stampsView.classList.toggle('active', showStamps);

  toggleBtn.textContent = showStamps ? 'Back to List' : 'Treasure';

  // ✅ Reset only appears on Treasure view
  if (resetBtn) resetBtn.style.display = showStamps ? '' : 'none';

  if (showStamps) renderStamps();

  if (map) setTimeout(() => map.invalidateSize(), 150);
}

// ----------------------------------------------------------
// OPEN CURRENT POOL IN NATIVE MAPS APP
// ----------------------------------------------------------

function openInNativeMaps() {
  const p = pools[selectedIndex] || pools[0];
  if (!p) return;

  const { lat, lng } = p;

  let url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  try {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      url = `https://maps.apple.com/?q=${lat},${lng}`;
    }
  } catch {}

  window.open(url, '_blank');
}

// ----------------------------------------------------------
// LIST VIEW
// ----------------------------------------------------------

function renderList() {
  const list = document.getElementById('poolList');

  if (!pools.length) {
    list.innerHTML = '<div class="pool-name">No pools loaded.</div>';
    return;
  }

  list.innerHTML = '';

  const p = pools[selectedIndex];
  const v = visited[p.id];
  const stamped   = v?.done === true;
  const stampDate = stamped ? v.date : null;

  const row = document.createElement('div');
  row.className = 'pool-item row-selected';

  row.innerHTML = `
    <div>
      <div class="pool-name">${p.name}</div>
    </div>
    <button class="stamp-chip ${stamped ? 'stamped' : 'cta'}" data-id="${p.id}">
      ${stamped ? `✓ Treasure claimed • ${formatDateAU(stampDate)}` : '🏴‍☠️ Claim Treasure'}
    </button>
  `;

  row.addEventListener('click', (e) => {
    if (e.target.classList.contains('stamp-chip')) return;
    panToSelected();
  });

  row.querySelector('.stamp-chip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStamp(e.currentTarget.dataset.id, true);
  });

  list.appendChild(row);
  updateCount();
}

// ----------------------------------------------------------
// VISITED STATE TOGGLING
// ----------------------------------------------------------

function toggleStamp(poolId, animate = false) {
  if (!poolId) return;

  if (visited[poolId]?.done) return;

  const p = pools.find(x => x.id === poolId);
  if (!p) return;

  const today = new Intl.DateTimeFormat('en-AU').format(new Date());
  visited[poolId] = { done: true, date: today };

  writeVisited(visited);

  try {
    const current = pools[selectedIndex];
    if (map && marker && current && current.id === poolId) {
      marker.setIcon(createDetailIcon(current));
    }
  } catch {}

  renderList();
  renderStamps(animate ? poolId : null);

  showTreasureOverlay({
    title: 'Treasure Found!',
    subtitle: p.name,
    stampSrc: getStampSrc(p),
    finale: false
  });

  const done = countVisited(visited);
  if (pools.length > 0 && done === pools.length) {
    window.setTimeout(() => {
      showTreasureOverlay({
        title: 'ALL TREASURE FOUND!',
        subtitle: 'First Mate — Captain Raymond is proud of you!',
        stampSrc: null,
        finale: true
      });
    }, 900);
  }
}

// ----------------------------------------------------------
// MAP SETUP + MOVEMENT
// ----------------------------------------------------------

function getStampSrc(p) {
  return p.stamp || `stamps/${p.id}.png`;
}

function createDetailIcon(p) {
  const isVisited = !!(visited[p?.id]?.done);
  const url = isVisited ? getStampSrc(p) : './assets/marker-x.png';
  const size = isVisited ? 44 : 36;

  return L.icon({
    iconUrl: url,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 6]
  });
}

function setupMap() {
  if (!pools.length) return;

  map = L.map('map').setView([pools[0].lat, pools[0].lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  marker = L.marker([pools[0].lat, pools[0].lng], { icon: createDetailIcon(pools[0]) }).addTo(map);
}

function panToSelected() {
  if (!map || !marker) return;

  const p = pools[selectedIndex];
  marker.setIcon(createDetailIcon(p));
  marker.setLatLng([p.lat, p.lng]).bindPopup(p.name);
  map.setView([p.lat, p.lng], 15, { animate: true });
}

// ----------------------------------------------------------
// PASSPORT (STAMPS) VIEW
// ----------------------------------------------------------

function renderStamps(popId = null) {
  const grid = document.getElementById('passportGrid');
  if (!grid) return;

  const stampsPerPage = 2;

  const visitedPools = pools
    .filter(p => visited[p.id]?.done)
    .sort((a, b) => dateKey(visited[a.id].date).localeCompare(dateKey(visited[b.id].date)));

  const totalPages = Math.max(1, Math.ceil(visitedPools.length / stampsPerPage));
  currentStampsPage = Math.min(currentStampsPage, totalPages - 1);
  writeStampsPage(currentStampsPage);

  const labelEl = document.getElementById('passportPageLabel');
  if (labelEl) labelEl.textContent = `Page ${currentStampsPage + 1} of ${totalPages}`;

  if (prevStampsPageBtn) prevStampsPageBtn.disabled = currentStampsPage <= 0;
  if (nextStampsPageBtn) nextStampsPageBtn.disabled = currentStampsPage >= totalPages - 1;

  const pagePools = visitedPools.slice(
    currentStampsPage * stampsPerPage,
    currentStampsPage * stampsPerPage + stampsPerPage
  );

  grid.innerHTML = '';

  pagePools.forEach(p => {
    const v = visited[p.id];

    const card = document.createElement('div');
    card.className = 'passport';

    card.innerHTML = `
      <div class="title">${p.name}</div>
      ${p.suburb ? '<div class="subtitle">' + p.suburb + '</div>' : ''}
      <div class="stamp ${popId === p.id ? 'pop' : ''}">
        <img src="${getStampSrc(p)}" alt="stamp">
      </div>
      <div class="stamp-date">${formatDateAU(v.date)}</div>
    `;

    grid.appendChild(card);
  });
}

// ----------------------------------------------------------
// INITIALISATION
// ----------------------------------------------------------

async function init() {
  pools = await loadPools();

  if (selectedIndex < 0) selectedIndex = 0;
  if (selectedIndex >= pools.length) selectedIndex = Math.max(0, pools.length - 1);

  if (toggleBtn) toggleBtn.addEventListener('click', () => setView(!onStampsView));

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const ok = confirm('First Mate, reset ALL treasure on this device?');
      if (!ok) return;

      visited = {};
      writeVisited(visited);

      currentStampsPage = 0;
      writeStampsPage(currentStampsPage);

      renderList();
      renderStamps();
      updateCount();
    });
  }

  if (btnUp) {
    btnUp.addEventListener('click', () => {
      if (!pools.length) return;
      selectedIndex = (selectedIndex + 1) % pools.length;
      writeSelection(selectedIndex);
      renderList();
      panToSelected();
    });
  }

  if (btnDown) {
    btnDown.addEventListener('click', () => {
      if (!pools.length) return;
      selectedIndex = (selectedIndex - 1 + pools.length) % pools.length;
      writeSelection(selectedIndex);
      renderList();
      panToSelected();
    });
  }

  if (openNativeMapBtn) openNativeMapBtn.addEventListener('click', openInNativeMaps);

  if (mapToggle) {
    mapToggle.addEventListener('click', () => {
      document.body.classList.toggle('full-map');
      if (map) setTimeout(() => map.invalidateSize(), 150);
    });
  }

  if (prevStampsPageBtn) {
    prevStampsPageBtn.addEventListener('click', () => {
      currentStampsPage = Math.max(0, currentStampsPage - 1);
      writeStampsPage(currentStampsPage);
      renderStamps();
    });
  }

  if (nextStampsPageBtn) {
    nextStampsPageBtn.addEventListener('click', () => {
      currentStampsPage = currentStampsPage + 1;
      writeStampsPage(currentStampsPage);
      renderStamps();
    });
  }

  setupMap();
  renderList();
  panToSelected();
  updateCount();

  // ✅ Start with correct visibility (List view first)
  setView(false);
}

document.addEventListener('DOMContentLoaded', init);

