// storage.js
// ==========
// All functions that talk to localStorage live in this file.
// This keeps read/write logic in one place so both the app and
// the overview map can share it.

// Keys used in localStorage. Keeping them in one object means we
// only have to change them in one place if we ever rename things.
export const LS_KEYS = {
  VISITED: 'harbour_pools_visited_v2_3',
  SELECTION: 'harbour_pools_selected_v2_3',
  STAMPS_PAGE: 'harbour_pools_stamps_page_v1'
};

/**
 * Older versions of the app stored visited pools as booleans (true/false).
 * Newer versions store an object: { done: boolean, date: "YYYY-MM-DD" | null }.
 *
 * This helper converts whatever is in storage into the new safer shape.
 */
function normalizeVisitedMap(raw) {
  const result = {};
  if (!raw || typeof raw !== 'object') return result;

  for (const key in raw) {
    const val = raw[key];
    if (typeof val === 'boolean') {
      result[key] = { done: !!val, date: null };
    } else if (val && typeof val === 'object') {
      result[key] = {
        done: !!val.done,
        date: val.date || null
      };
    }
  }
  return result;
}

/**
 * Read the visited map from localStorage.
 * Returns an object keyed by pool name.
 */
export function readVisited() {
  try {
    const raw = localStorage.getItem(LS_KEYS.VISITED);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeVisitedMap(parsed);
  } catch (e) {
    console.warn('Error reading visited map from localStorage', e);
    return {};
  }
}

/** Save the visited map back to localStorage. */
export function writeVisited(map) {
  try {
    localStorage.setItem(LS_KEYS.VISITED, JSON.stringify(map || {}));
  } catch (e) {
    console.warn('Error writing visited map to localStorage', e);
  }
}

/** Count how many pools are marked as done=true. */
export function countVisited(map) {
  return Object.values(map || {}).filter(v => v && v.done).length;
}

/** Read the selected pool index. Defaults to 0. */
export function readSelection() {
  try {
    const raw = localStorage.getItem(LS_KEYS.SELECTION);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

/** Persist the selected pool index. */
export function writeSelection(index) {
  try {
    localStorage.setItem(LS_KEYS.SELECTION, String(index));
  } catch (e) {
    console.warn('Error writing selection index', e);
  }
}

/** Read the current stamps page index. Defaults to 0. */
export function readStampsPage() {
  try {
    const raw = localStorage.getItem(LS_KEYS.STAMPS_PAGE);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

/** Persist the current stamps page index. */
export function writeStampsPage(pageIndex) {
  try {
    localStorage.setItem(LS_KEYS.STAMPS_PAGE, String(pageIndex));
  } catch (e) {
    console.warn('Error writing stamps page', e);
  }
}
