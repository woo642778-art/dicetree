const WATCH_KEY = "dicetree.update-watch.v55";

interface UpdateWatchV55 {
  latestSeenVersion?: string;
}

function loadWatch(): UpdateWatchV55 {
  try {
    const value = JSON.parse(localStorage.getItem(WATCH_KEY) ?? "{}") as UpdateWatchV55;
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}

export function hasUnreadUpdateV55(latestVersion: string): boolean {
  return loadWatch().latestSeenVersion !== latestVersion;
}

export function markUpdateSeenV55(version: string) {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify({ latestSeenVersion: version } satisfies UpdateWatchV55)); }
  catch { /* Reading the update remains useful when storage is unavailable. */ }
}
