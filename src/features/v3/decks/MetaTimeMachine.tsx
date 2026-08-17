import { useMemo, useState } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import { BUILT_IN_META_SNAPSHOTS_V47, metaUsageTimelineV47, parseMetaSnapshotV47, type MetaSnapshotV47 } from "../../../deck-lab/metaSnapshots";
import { summarizeDiceUsage } from "../../../deck-lab/coOpRankingSnapshot";
import { DiceIcon } from "../shared/DiceIcon";

const STORAGE_KEY = "rd2:v47:meta-snapshots";

function nameOf(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

function initialSnapshots() {
  if (typeof window === "undefined") return [...BUILT_IN_META_SNAPSHOTS_V47];
  try {
    const values = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown[];
    const imported = values.map((value) => parseMetaSnapshotV47(JSON.stringify(value)));
    const byDate = new Map([...BUILT_IN_META_SNAPSHOTS_V47, ...imported].map((snapshot) => [snapshot.date, snapshot]));
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  } catch { return [...BUILT_IN_META_SNAPSHOTS_V47]; }
}

export function MetaTimeMachine({ data, locale }: { data: CanonicalGameData; locale: "ko" | "en" }) {
  const [snapshots, setSnapshots] = useState<MetaSnapshotV47[]>(initialSnapshots);
  const [diceId, setDiceId] = useState("adjust");
  const [error, setError] = useState<string>();
  const timeline = useMemo(() => metaUsageTimelineV47(snapshots, diceId), [diceId, snapshots]);
  const latest = snapshots.at(-1);
  const top = latest ? summarizeDiceUsage(latest.decks).slice(0, 8) : [];
  const maxShare = Math.max(0.01, ...timeline.map((point) => point.share));

  const importSnapshot = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseMetaSnapshotV47(await file.text());
      const next = [...new Map([...snapshots, parsed].map((snapshot) => [snapshot.date, snapshot])).values()].sort((a, b) => a.date.localeCompare(b.date));
      setSnapshots(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((snapshot) => snapshot.source === "imported-json")));
      setError(undefined);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  };

  return <section className="v47-meta-time" data-testid="v47-meta-time-machine">
    <header><div><small>{locale === "ko" ? "누적 스냅샷" : "ACCUMULATED SNAPSHOTS"}</small><h2>{locale === "ko" ? "메타 타임머신" : "Meta Time Machine"}</h2><p>{locale === "ko" ? "새 랭킹을 기존 자료 위에 날짜별로 누적하고 사용률과 평균 순위 변화를 비교합니다." : "Accumulates dated ranking snapshots and compares usage and average rank over time."}</p></div><label>{locale === "ko" ? "랭킹 JSON 추가" : "Add ranking JSON"}<input type="file" accept="application/json,.json" onChange={(event) => void importSnapshot(event.target.files?.[0])} /></label></header>
    {error && <p role="alert" className="v47-import-error">{error}</p>}
    <div className="v47-meta-core">{top.map((entry) => <button key={entry.diceId} type="button" className={diceId === entry.diceId ? "is-active" : ""} onClick={() => setDiceId(entry.diceId)}><DiceIcon diceId={entry.diceId} label={nameOf(data, entry.diceId, locale)} /><span>{nameOf(data, entry.diceId, locale)}</span><strong>{Math.round(entry.share * 100)}%</strong></button>)}</div>
    <div className="v47-meta-chart"><header><strong>{nameOf(data, diceId, locale)}</strong><span>{snapshots.length} {locale === "ko" ? "개 스냅샷" : "snapshots"}</span></header>{timeline.map((point) => <div key={point.date}><time>{point.date}</time><span><i style={{ width: `${(point.share / maxShare) * 100}%` }} /></span><strong>{(point.share * 100).toFixed(1)}%</strong><small>{point.averageRank === null ? "-" : `#${point.averageRank.toFixed(1)}`}</small></div>)}</div>
    {snapshots.length < 2 && <footer><strong>{locale === "ko" ? "추세 계산 대기" : "Waiting for trend data"}</strong><p>{locale === "ko" ? "현재는 2026-08-16 스냅샷 1개뿐입니다. 두 번째 날짜 자료를 추가하면 급상승·급하락과 평균 순위 변화를 계산할 수 있습니다." : "Only the 2026-08-16 snapshot exists. Add a second date to calculate rises, falls, and average-rank changes."}</p></footer>}
  </section>;
}
