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

/**
 * Overview marker icon:
 * - NOT visited → red X
 * - Visited → pool's treasure stamp
 */
function createOverviewIcon(pool, isVisited) {
  const size = isVisited ? 46 : 36;

  return L.icon({
    iconUrl: isVisited
      ? pool.stamp                     // e.g. assets/stamp-compass.png
      : './assets/marker-x.png',       // red X icon
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 6],
    className: isVisited ? 'marker-stamp' : 'marker-x'
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
        ? 'No locations charted yet.'
        : `Treasure found at ${visitedCount} of ${total} locations.`;
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
    mapEl.textContent = 'Error loading locations.';
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
      { icon: createOverviewIcon(pool, isVisited) }
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
