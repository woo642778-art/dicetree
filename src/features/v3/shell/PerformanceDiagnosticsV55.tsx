import { useEffect, useState } from "react";
import { initialPerformanceSnapshotV55, listPerformanceSnapshotsV55, ratePerformanceMetricV55, savePerformanceSnapshotV55, type PerformanceMetricV55, type PerformanceRatingV55, type PerformanceSnapshotV55 } from "../../../diagnostics/performanceV55";
import { downloadTextFileV55 } from "../../../utils/downloadV55";

function formatMetric(value: number | undefined, unit: "ms" | "score", locale: "ko" | "en") {
  if (value === undefined) return locale === "ko" ? "지원 안 됨" : "Unavailable";
  return unit === "ms" ? `${Math.round(value).toLocaleString()} ms` : value.toFixed(3);
}

function ratingLabel(rating: PerformanceRatingV55, locale: "ko" | "en") {
  return rating === "good" ? (locale === "ko" ? "좋음" : "Good") : rating === "needs-improvement" ? (locale === "ko" ? "개선 필요" : "Needs improvement") : rating === "poor" ? (locale === "ko" ? "느림" : "Poor") : (locale === "ko" ? "지원 안 됨" : "Unavailable");
}

export function PerformanceDiagnosticsV55({ locale, onClose }: { locale: "ko" | "en"; onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshotV55>(() => initialPerformanceSnapshotV55());
  const [historyCount, setHistoryCount] = useState(0);
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    void listPerformanceSnapshotsV55().then((entries) => setHistoryCount(entries.length));
    if (typeof PerformanceObserver === "undefined") return;
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, handle: (entries: PerformanceEntry[]) => void) => {
      try {
        const observer = new PerformanceObserver((list) => handle(list.getEntries()));
        observer.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(observer);
      } catch { /* This browser does not expose this performance entry type. */ }
    };
    observe("largest-contentful-paint", (entries) => {
      const latest = entries.at(-1);
      if (latest) setSnapshot((current) => ({ ...current, lcp: latest.startTime, capturedAt: new Date().toISOString() }));
    });
    observe("layout-shift", (entries) => {
      const added = entries.reduce((total, entry) => {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        return total + (shift.hadRecentInput ? 0 : shift.value ?? 0);
      }, 0);
      if (added) setSnapshot((current) => ({ ...current, cls: (current.cls ?? 0) + added, capturedAt: new Date().toISOString() }));
    });
    observe("event", (entries) => {
      const maximum = Math.max(...entries.map((entry) => entry.duration), 0);
      if (maximum) setSnapshot((current) => ({ ...current, inp: Math.max(current.inp ?? 0, maximum), capturedAt: new Date().toISOString() }));
    });
    observe("longtask", (entries) => {
      const total = entries.reduce((sum, entry) => sum + entry.duration, 0);
      if (total) setSnapshot((current) => ({ ...current, longTaskCount: current.longTaskCount + entries.length, longTaskDuration: current.longTaskDuration + total, capturedAt: new Date().toISOString() }));
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);
  const metrics: Array<{ key: PerformanceMetricV55; label: string; value: number | undefined; unit: "ms" | "score" }> = [
    { key: "lcp", label: "LCP", value: snapshot.lcp, unit: "ms" },
    { key: "cls", label: "CLS", value: snapshot.cls, unit: "score" },
    { key: "inp", label: "INP", value: snapshot.inp, unit: "ms" },
  ];
  const capture = async () => {
    const entry = { ...snapshot, capturedAt: new Date().toISOString() };
    const saved = await savePerformanceSnapshotV55(entry);
    if (saved) setHistoryCount((count) => Math.min(20, count + 1));
    setNotice(saved ? (locale === "ko" ? "이 기기에 진단 기록을 저장했습니다." : "Diagnostic saved on this device.") : (locale === "ko" ? "이 브라우저에서는 로컬 기록 저장을 지원하지 않습니다." : "Local diagnostic storage is unavailable in this browser."));
  };
  return <div className="v53-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="v53-action-sheet v55-performance-sheet" role="dialog" aria-modal="true" aria-labelledby="v55-performance-title"><div className="v53-sheet-handle" /><header><div><small>{locale === "ko" ? "로컬 성능 진단" : "LOCAL PERFORMANCE DIAGNOSTICS"}</small><h2 id="v55-performance-title">{locale === "ko" ? "이 기기에서만 성능 확인" : "Check performance on this device"}</h2></div><button autoFocus type="button" aria-label={locale === "ko" ? "성능 진단 닫기" : "Close performance diagnostics"} onClick={onClose}>×</button></header><p>{locale === "ko" ? "LCP·CLS·INP와 긴 작업을 브라우저에서만 측정합니다. 이 정보는 외부로 전송되지 않으며, 저장을 누를 때에만 이 기기의 IndexedDB에 남습니다." : "LCP, CLS, INP, and long tasks are measured only in this browser. Nothing is sent externally, and a snapshot is kept in this device's IndexedDB only when you save it."}</p><div className="v55-performance-metrics">{metrics.map((metric) => { const rating = ratePerformanceMetricV55(metric.key, metric.value); return <article key={metric.key} className={`is-${rating}`}><span>{metric.label}</span><strong>{formatMetric(metric.value, metric.unit, locale)}</strong><small>{ratingLabel(rating, locale)}</small></article>; })}</div><div className="v55-performance-extra"><span>{locale === "ko" ? "긴 작업" : "Long tasks"}<b>{snapshot.longTaskCount}</b></span><span>{locale === "ko" ? "긴 작업 시간" : "Long-task time"}<b>{Math.round(snapshot.longTaskDuration)} ms</b></span><span>{locale === "ko" ? "페이지 로드" : "Page load"}<b>{formatMetric(snapshot.navigationDuration, "ms", locale)}</b></span><span>{locale === "ko" ? "저장된 기록" : "Saved snapshots"}<b>{historyCount}</b></span></div><footer><button type="button" onClick={() => void capture()}>{locale === "ko" ? "현재 기록 저장" : "Save current snapshot"}</button><button type="button" onClick={() => downloadTextFileV55(`dicetree-performance-${snapshot.capturedAt.slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2))}>{locale === "ko" ? "JSON 내보내기" : "Export JSON"}</button></footer>{notice && <p role="status">{notice}</p>}</section></div>;
}
