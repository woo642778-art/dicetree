import { useMemo, useState } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import { OFFICIAL_PATCH_HISTORY_V47 } from "../../../updates/patchHistory";
import { parseClientDiffV47, summarizePatchImpactV47, type ClientDiffV47 } from "../../../updates/patchImpact";
import { DiceIcon } from "../shared/DiceIcon";

function nameOf(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((entry) => entry.id === diceId);
  return dice?.nameKey ? data.localization[locale][dice.nameKey] ?? diceId : diceId;
}

export function UpdateCenterView({ data, locale, activeDeckIds }: { data: CanonicalGameData; locale: "ko" | "en"; activeDeckIds: string[] }) {
  const [diff, setDiff] = useState<ClientDiffV47>();
  const [error, setError] = useState<string>();
  const impact = useMemo(() => diff ? summarizePatchImpactV47(diff, activeDeckIds) : undefined, [activeDeckIds, diff]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    try { setDiff(parseClientDiffV47(await file.text())); setError(undefined); }
    catch (caught) { setDiff(undefined); setError(caught instanceof Error ? caught.message : String(caught)); }
  };

  return <main className="v47-update-center" data-testid="v47-update-center">
    <header className="v47-update-hero"><div><small>PATCH INTELLIGENCE</small><h1>{locale === "ko" ? "랜덤 다이스 2 업데이트" : "Random Dice 2 updates"}</h1><p>{locale === "ko" ? "공식 스토어 공지와 클라이언트 데이터 차이를 분리해서 보여줍니다." : "Separates official store announcements from measured client-data differences."}</p></div><aside><span>{locale === "ko" ? "사이트 데이터" : "Site data"}</span><strong>v{data.manifest.clientVersion}</strong><small>{locale === "ko" ? `추출일 ${data.manifest.extractedAt.slice(0, 10)}` : `Extracted ${data.manifest.extractedAt.slice(0, 10)}`}</small></aside></header>

    <section className="v47-official-patches">
      <header><div><small>{locale === "ko" ? "공식 확인" : "OFFICIALLY VERIFIED"}</small><h2>{locale === "ko" ? "버전 기록" : "Version history"}</h2></div><p>{locale === "ko" ? "스토어가 구체적인 수치를 공개하지 않은 경우 임의로 상향·하향을 추정하지 않습니다." : "No buff or nerf is inferred when store notes omit concrete values."}</p></header>
      <div>{OFFICIAL_PATCH_HISTORY_V47.map((patch, index) => <article key={patch.version} className={index === 0 ? "is-current" : ""}><header><span>v{patch.version}</span><time>{patch.releasedOn}</time><b>{patch.specificity === "generic" ? (locale === "ko" ? "일반 공지" : "Generic note") : (locale === "ko" ? "구체 공지" : "Specific note")}</b></header><h3>{patch.title[locale]}</h3>{patch.notes[locale].map((note) => <p key={note}>{note}</p>)}<footer>{patch.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} · {source.checkedOn}</a>)}</footer></article>)}</div>
    </section>

    <section className="v47-patch-impact" data-testid="v47-patch-impact">
      <header><div><small>{locale === "ko" ? "실측 데이터" : "MEASURED DATA"}</small><h2>{locale === "ko" ? "패치 영향 분석기" : "Patch impact analyzer"}</h2><p>{locale === "ko" ? "새 클라이언트 추출 후 diff_clients.py가 만든 JSON을 불러오면 변경 주사위·트리와 현재 덱 영향을 계산합니다." : "Import JSON from diff_clients.py to calculate changed dice, tree nodes, and active-deck impact."}</p></div><label>{locale === "ko" ? "클라이언트 diff 불러오기" : "Import client diff"}<input type="file" accept="application/json,.json" onChange={(event) => void readFile(event.target.files?.[0])} /></label></header>
      {error && <p className="v47-import-error" role="alert">{error}</p>}
      {!impact ? <div className="v47-impact-empty"><strong>{locale === "ko" ? "최신 v1.0.3 공식 공지를 반영했습니다." : "The latest official v1.0.3 notice is reflected."}</strong><p>{locale === "ko" ? "사이트의 계산 데이터는 아직 검증된 v1.0.1 스냅샷입니다. v1.0.2·v1.0.3의 새 클라이언트 diff가 들어오기 전에는 협동·전술 효과의 수치 변화를 추정하지 않습니다." : "The site's calculation data remains the verified v1.0.1 snapshot. Numerical co-op or tactical-effect changes are not inferred until a v1.0.2 or v1.0.3 client diff is imported."}</p></div> : <div className="v47-impact-grid">
        <article><span>{locale === "ko" ? "변경 주사위" : "Changed dice"}</span><strong>{impact.changedDiceIds.length}</strong><small>{impact.changedDiceIds.join(" · ") || (locale === "ko" ? "없음" : "None")}</small></article>
        <article><span>{locale === "ko" ? "트리 변경" : "Tree changes"}</span><strong>{impact.changedTreeNodeIds.length}</strong><small>{(impact.counts.treeCosts ?? 0)} {locale === "ko" ? "비용" : "cost"} · {(impact.counts.treeTopology ?? 0)} {locale === "ko" ? "구조" : "topology"}</small></article>
        <article><span>{locale === "ko" ? "내 덱 영향" : "My deck affected"}</span><strong>{impact.affectedActiveDiceIds.length}</strong><div>{impact.affectedActiveDiceIds.map((id) => <span key={id}><DiceIcon diceId={id} label={nameOf(data, id, locale)} />{nameOf(data, id, locale)}</span>)}</div></article>
        <article><span>{locale === "ko" ? "기본 DPS 변화" : "Basic DPS deltas"}</span><strong>{impact.basicDpsDeltas.length}</strong><small>{impact.basicDpsDeltas.map((entry) => `${nameOf(data, entry.diceId, locale)} ${entry.percent >= 0 ? "+" : ""}${entry.percent.toFixed(1)}%`).join(" · ") || (locale === "ko" ? "계산 가능한 변경 없음" : "No calculable changes")}</small></article>
      </div>}
      <footer>{locale === "ko" ? "기본 DPS 변화는 diff에 공격력과 공격 간격의 전후 값이 모두 있을 때만 표시합니다. 특수 기믹과 전체 덱 DPS는 새·이전 정규 데이터셋이 모두 있어야 계산할 수 있습니다." : "Basic DPS is shown only when the diff contains both attack and interval before and after. Special mechanics and whole-deck DPS require both canonical datasets."}</footer>
    </section>
  </main>;
}
