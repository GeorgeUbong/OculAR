/**
 * Small LRU cache with a size budget and pinning.
 *
 * - Raw GLB bytes:   size = byteLength, budget = bytes
 * - Parsed models:   size = 1,          budget = max model count
 *
 * Pinned keys (e.g. the model currently on screen) are never evicted.
 * onEvict(key, value) fires on eviction/delete so GPU resources can be freed.
 */
export class MemoryBuffer {
  constructor({ maxSize = 256 * 1024 * 1024, onEvict = null } = {}) {
    this.maxSize = maxSize;
    this.onEvict = onEvict;
    this.size = 0;
    this.map = new Map(); // insertion order = recency (oldest first)
    this.pins = new Set();
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Mark as most recently used
    this.map.delete(key);
    this.map.set(key, entry);

    return entry.value;
  }

  set(key, value, size = 1) {
    if (this.map.has(key)) this.delete(key);

    // Never cache something bigger than the whole budget
    if (size > this.maxSize) return false;

    this.map.set(key, { value, size });
    this.size += size;
    this.trim();

    return true;
  }

  delete(key) {
    const entry = this.map.get(key);
    if (!entry) return false;

    this.map.delete(key);
    this.pins.delete(key);
    this.size -= entry.size;
    this.onEvict?.(key, entry.value);

    return true;
  }

  pin(key) {
    this.pins.add(key);
  }

  unpin(key) {
    this.pins.delete(key);
  }

  trim() {
    for (const key of this.map.keys()) {
      if (this.size <= this.maxSize) break;
      if (this.pins.has(key)) continue;
      this.delete(key);
    }
  }

  clear() {
    for (const key of [...this.map.keys()]) this.delete(key);
  }
}