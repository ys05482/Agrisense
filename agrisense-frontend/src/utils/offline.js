const PREFIX = "agrisense_cache_";
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

export function saveToCache(key, value) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ value, ts: Date.now() }),
    );
  } catch {
    /* storage full — fail silently */
  }
}

export function getFromCache(key, ttl = DEFAULT_TTL) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function clearCache(key) {
  localStorage.removeItem(PREFIX + key);
}
