// data.js
// =======
// Loads the pools list from pools.json.
//
// IMPORTANT:
// We keep *all* useful fields (id, name, suburb, stamp, etc.) so every page
// can key storage by a stable pool.id and render the right stamp artwork.

export async function loadPools() {
  const response = await fetch('pools.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load pools.json (status ${response.status})`);
  }

  const raw = await response.json();

  // Be defensive: coerce lat/lng into numbers so Leaflet is happy.
  return (raw || []).map(p => ({
    id: p.id,
    name: p.name,
    suburb: p.suburb,
    location: p.location,
    area: p.area,
    lat: Number(p.lat),
    lng: Number(p.lng),
    stamp: p.stamp
  }));
}
