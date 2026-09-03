export type PerformanceMetricV55 = "lcp" | "cls" | "inp";
export type PerformanceRatingV55 = "good" | "needs-improvement" | "poor" | "unavailable";

export interface PerformanceSnapshotV55 {
  capturedAt: string;
  navigationDuration?: number;
  transferSize?: number;
  lcp?: number;
  cls?: number;
  inp?: number;
  longTaskCount: number;
  longTaskDuration: number;
}

export function ratePerformanceMetricV55(metric: PerformanceMetricV55, value: number | undefined): PerformanceRatingV55 {
  if (value === undefined || !Number.isFinite(value)) return "unavailable";
  const limits = metric === "lcp" ? [2500, 4000] : metric === "cls" ? [0.1, 0.25] : [200, 500];
  return value <= limits[0] ? "good" : value <= limits[1] ? "needs-improvement" : "poor";
}

export function initialPerformanceSnapshotV55(): PerformanceSnapshotV55 {
  const navigation = typeof performance === "undefined" ? undefined : performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return {
    capturedAt: new Date().toISOString(),
    ...(navigation ? { navigationDuration: navigation.duration, transferSize: navigation.transferSize } : {}),
    longTaskCount: 0,
    longTaskDuration: 0,
  };
}

const DB_NAME = "dicetree-v55-local-diagnostics";
const STORE_NAME = "snapshots";

function openDiagnosticsDbV55(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(DB_NAME, 1); }
    catch { resolve(undefined); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "capturedAt" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}

/** Stores only user-visible browser performance diagnostics on this device. */
export async function savePerformanceSnapshotV55(snapshot: PerformanceSnapshotV55) {
  const database = await openDiagnosticsDbV55();
  if (!database) return false;
  return new Promise<boolean>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(snapshot);
    transaction.oncomplete = () => { database.close(); resolve(true); };
    transaction.onerror = () => { database.close(); resolve(false); };
  });
}

export async function listPerformanceSnapshotsV55(): Promise<PerformanceSnapshotV55[]> {
  const database = await openDiagnosticsDbV55();
  if (!database) return [];
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      database.close();
      resolve((request.result as PerformanceSnapshotV55[]).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 20));
    };
    request.onerror = () => { database.close(); resolve([]); };
  });
}
