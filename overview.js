// overview.js
// ===========

import { loadPools } from './data.js';
import { readVisited, countVisited } from './storage.js';

function scheduleOverviewInvalidate(map) {
  if (!map) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try { map.invalidateSize(true); } catch (e) {}
    });
  });

  setTimeout(() => { try { map.invalidateSize(true); } catch (e) {} }, 250);
  setTimeout(() => { try { map.invalidateSize(true); } catch (e) {} }, 600);
}

function createRaymondIcon(isVisited) {
  const size = 56; // retina-friendly, still kid-sized

  return L.icon({
    iconUrl: isVisited
      ? './assets/Raymond-head-red.png'
      : './assets/Raymond-head-green.png',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],   // true centre
    popupAnchor: [0, -size / 2 - 6]     // popup above head
  });
}


function updateOverviewText(pools, visitedMap) {
  const badgeEl = document.getElementById('overviewBadge');
  const textEl  = document.getElementById('overviewText');

  const visitedCount = countVisited(visitedMap);
  const total = pools.length;

  if (badgeEl) badgeEl.textContent = `${visitedCount} / ${total}`;

  if (textEl) {
    textEl.textContent =
      total === 0
        ? 'No pools configured.'
        : `You’ve visited ${visitedCount} of ${total} harbour pools.`;
  }
}

async function initOverviewMap() {
  const mapEl = document.getElementById('overviewMap');
  if (!mapEl) return;

  const map = L.map(mapEl, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([-33.8688, 151.2093], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  map.whenReady(() => scheduleOverviewInvalidate(map));

  let pools = [];
  try {
    pools = await loadPools();
  } catch (err) {
    console.error(err);
    mapEl.textContent = 'Error loading pools list.';
    return;
  }

  const visitedMap = readVisited();
  updateOverviewText(pools, visitedMap);

  for (const pool of pools) {
    if (!Number.isFinite(pool.lat) || !Number.isFinite(pool.lng)) continue;

    const info = visitedMap[pool.id];
    const isVisited = !!(info && info.done);

    const marker = L.marker(
      [pool.lat, pool.lng],
      { icon: createRaymondIcon(isVisited) }
    ).addTo(map);

    marker.bindPopup(`<strong>${pool.name}</strong>`);
  }

  // Final iOS-safe settle
  setTimeout(() => {
    scheduleOverviewInvalidate(map);
    map.setView([-33.8688, 151.2093], 11, { animate: false });
  }, 900);
}

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('openAppBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      window.location.href = 'app.html';
    });
  }

  initOverviewMap().catch(err =>
    console.error('Error during overview init', err)
  );
});
