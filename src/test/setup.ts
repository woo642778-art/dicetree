import "@testing-library/jest-dom/vitest";

// Node 26 exposes an undefined experimental global when no storage file is
// configured. Install a deterministic browser-compatible store for tests.
const entries = new Map<string, string>();
const testStorage: Storage = {
  get length() { return entries.size; },
  clear() { entries.clear(); },
  getItem(key) { return entries.get(String(key)) ?? null; },
  key(index) { return [...entries.keys()][index] ?? null; },
  removeItem(key) { entries.delete(String(key)); },
  setItem(key, value) { entries.set(String(key), String(value)); },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testStorage,
});
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: testStorage,
});
