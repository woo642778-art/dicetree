import { useMemo, useState } from "react";
import type { DiceFamily, ResourceCostV2 } from "../../domain/types";
import { useI18n } from "../../i18n/I18nContext";
import { treeNodesV2 } from "../../tree-data-v2/nodes";
import { costEvidence, getCostResearchStats } from "../../tree-data-v2/costEvidence";

const FAMILY: Record<DiceFamily | "core", { ko: string; en: string }> = {
  nature: { ko: "자연", en: "Nature" },
  chaos: { ko: "혼돈", en: "Chaos" },
  engineering: { ko: "공학", en: "Engineering" },
  magic: { ko: "마법", en: "Magic" },
  order: { ko: "질서", en: "Order" },
  core: { ko: "코어", en: "Core" },
};

function formatCost(cost: ResourceCostV2, locale: "ko" | "en") {
  const parts: string[] = [];
  if (cost.gold) parts.push(`${cost.gold.toLocaleString()} ${locale === "ko" ? "골드" : "Gold"}`);
  if (cost.blueCard) parts.push(`${locale === "ko" ? "파란 재화" : "Blue resource"} ${cost.blueCard}`);
  if (cost.redCard) parts.push(`${locale === "ko" ? "빨간 재화" : "Red resource"} ${cost.redCard}`);
  if (cost.prismCube) parts.push(`${locale === "ko" ? "보라 큐브형 재화" : "Purple cube resource"} ${cost.prismCube}`);
  return parts.join(" + ");
}

export function CostResearchPanel() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const stats = getCostResearchStats();
  const rows = useMemo(() => costEvidence.map((entry) => {
    const node = treeNodesV2.find((candidate) => candidate.id === entry.nodeId);
    return { entry, family: node?.family ?? "core", node };
  }), []);

  return <>
    <button className="cost-research-launch" type="button" onClick={() => setOpen(true)} data-testid="cost-research-open">
      <span>₲</span><div><b>{locale === "ko" ? "비용 데이터" : "Cost data"}</b><small>{stats.observations}{locale === "ko" ? "개 관측값" : " observations"}</small></div>
    </button>
    {open && <div className="cost-research-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="cost-research-panel" role="dialog" aria-modal="true" aria-label={locale === "ko" ? "비용 데이터" : "Cost data"}>
        <header><div><small>{locale === "ko" ? "CURRENT GAME EVIDENCE" : "CURRENT GAME EVIDENCE"}</small><h2>{locale === "ko" ? "랭크별 재화 조사" : "Rank cost research"}</h2><p>{locale === "ko" ? "현재 게임 스크린샷에서 실제로 확인된 값만 모았습니다." : "Only values actually observed in current-game evidence are listed."}</p></div><button type="button" onClick={() => setOpen(false)} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></header>
        <div className="cost-research-stats">
          <div><strong>{stats.observations}</strong><span>{locale === "ko" ? "비용 관측" : "cost observations"}</span></div>
          <div><strong>{stats.nodesCovered}</strong><span>{locale === "ko" ? "노드 연결" : "nodes covered"}</span></div>
          <div><strong>{stats.nodesWithExactRankContext}</strong><span>{locale === "ko" ? "랭크 구간 확인" : "rank transitions"}</span></div>
          <div><strong>0</strong><span>{locale === "ko" ? "임의 보간" : "invented rows"}</span></div>
        </div>
        <div className="cost-research-warning"><b>{locale === "ko" ? "왜 전체 1→100 표가 아직 없나요?" : "Why isn't there a complete 1→100 table yet?"}</b><p>{locale === "ko" ? "현재 공개 자료에서는 신뢰할 수 있는 전체 비용표를 찾지 못했습니다. 한 랭크에서 본 비용을 다른 랭크에 반복 적용하면 잘못된 총비용이 되므로, 확인된 구간만 계산합니다." : "No trustworthy complete ladder is publicly available yet. Repeating one photographed cost across unseen ranks would create false totals, so only observed transitions are calculated."}</p></div>
        <div className="cost-research-table" data-testid="cost-research-table">
          {rows.map(({ entry, family }) => <article key={entry.id} className={`cost-evidence-row family-${family}`}>
            <div className="cost-evidence-family">{FAMILY[family][locale]}</div>
            <div className="cost-evidence-main"><strong>{entry.fromRank !== undefined ? `${entry.fromRank} → ${entry.toRank}` : (locale === "ko" ? "표시 비용" : "Displayed cost")}</strong><span>{formatCost(entry.cost, locale)}</span><small>{entry.note[locale]}</small></div>
            <em className={entry.confidence}>{entry.confidence === "observed" ? (locale === "ko" ? "확인" : "Observed") : entry.confidence === "verified" ? (locale === "ko" ? "교차확인" : "Verified") : (locale === "ko" ? "추가확인" : "Partial")}</em>
          </article>)}
        </div>
        <footer>{locale === "ko" ? "새로운 현재 게임 캡처나 교차 확인 자료가 확보되면 이 표에 랭크별로 누적됩니다." : "New current-game captures and cross-checks are appended to this table rank by rank."}</footer>
      </section>
    </div>}
  </>;
}
