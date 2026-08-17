import { useState } from "react";
import type { CanonicalGameData } from "../../../game-data/types";
import type { V3RecommendationSet, V3TreeRecommendation } from "../../../optimizer/recommendV3";

export interface RecommendationStripProps {
  data: CanonicalGameData;
  recommendations: V3RecommendationSet;
  locale: "ko" | "en";
  onSelectNode: (nodeId: string) => void;
}

function localizedNodeName(data: CanonicalGameData, nodeId: string, locale: "ko" | "en") {
  const node = data.tree.find((candidate) => candidate.id === nodeId);
  const key = node?.nameKey;
  if (!key) return nodeId;
  return data.localization[locale][key] ?? data.localization.ko[key] ?? data.localization.en[key] ?? nodeId;
}

function costText(gold: number, stone: number, locale: "ko" | "en") {
  const parts: string[] = [];
  if (gold) parts.push(`${gold.toLocaleString()} ${locale === "ko" ? "골드" : "Gold"}`);
  if (stone) parts.push(`${stone.toLocaleString()} ${locale === "ko" ? "코어" : "Core"}`);
  return parts.join(" · ") || (locale === "ko" ? "비용 없음" : "No cost");
}

export function RecommendationStrip({ data, recommendations, locale, onSelectNode }: RecommendationStripProps) {
  const [expandedNodeId, setExpandedNodeId] = useState<string>();
  const trace = (entry: V3TreeRecommendation) => <div className="v47-recommendation-trace" data-testid={`recommendation-trace-${entry.nodeId}`}>
    <header><strong>{locale === "ko" ? "이 추천의 계산 근거" : "Why this is recommended"}</strong><span className={`is-${entry.confidence}`}>{entry.confidence === "verified" ? (locale === "ko" ? "확정" : "Verified") : (locale === "ko" ? "부분 검증" : "Partial")}</span></header>
    <dl>
      <div><dt>{locale === "ko" ? "현재 DPS" : "Current DPS"}</dt><dd>{entry.beforeDps?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}</dd></div>
      <div><dt>{locale === "ko" ? "투자 후 DPS" : "After investment"}</dt><dd>{entry.afterDps?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}</dd></div>
      <div><dt>{locale === "ko" ? "순증가" : "Net gain"}</dt><dd>{entry.absoluteGain === undefined ? "—" : `+${entry.absoluteGain.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${entry.percentGain?.toFixed(2)}%)`}</dd></div>
      <div><dt>{locale === "ko" ? "이 노드 비용" : "Node cost"}</dt><dd>{costText(entry.cost.gold, entry.cost.stone, locale)}</dd></div>
      <div><dt>{locale === "ko" ? "선행 비용" : "Prerequisite cost"}</dt><dd>{costText(entry.prerequisiteCost.gold, entry.prerequisiteCost.stone, locale)}</dd></div>
      <div><dt>{locale === "ko" ? "경로 포함 총비용" : "Total route cost"}</dt><dd>{costText(entry.totalRouteCost.gold, entry.totalRouteCost.stone, locale)}</dd></div>
      <div><dt>{locale === "ko" ? "골드 효율" : "Gold efficiency"}</dt><dd>{entry.gainPerGold === undefined ? "—" : `${(entry.gainPerGold * 10_000).toFixed(2)} DPS / 1만`}</dd></div>
      <div><dt>{locale === "ko" ? "코어 효율" : "Core efficiency"}</dt><dd>{entry.gainPerStone === undefined ? "—" : `${entry.gainPerStone.toFixed(2)} DPS / 1`}</dd></div>
    </dl>
    <p>{entry.confidence === "verified"
      ? (locale === "ko" ? "기본 공격과 적용 가능한 고유 효과, 선행 노드 경로를 같은 계산 엔진에서 전후 비교했습니다." : "Compared before and after using the same engine, including supported mechanics and prerequisite route.")
      : (locale === "ko" ? "미검증 고유 효과 또는 트리 공식이 있어 추정 순위에는 사용하지 않습니다." : "Unverified mechanics or tree formulas prevent this entry from being ranked.")}</p>
  </div>;
  return <section className="v3-recommendation-strip" data-testid="v3-recommendation-strip">
    <div className="v3-recommendation-title">
      <small>{locale === "ko" ? "선택 주사위 기준" : "For selected dice"}</small>
      <strong>{locale === "ko" ? "다음 투자 분석" : "Next investment"}</strong>
    </div>
    {recommendations.verified.length > 0 ? <div className="v3-recommendation-list">
      {recommendations.verified.map((entry, index) => <article key={entry.nodeId} className={expandedNodeId === entry.nodeId ? "is-expanded" : ""}>
        <button className="v47-recommendation-main" type="button" onClick={() => onSelectNode(entry.nodeId)}>
          <span>{index + 1}</span>
          <div><strong>{localizedNodeName(data, entry.nodeId, locale)}</strong><small>{costText(entry.totalRouteCost.gold, entry.totalRouteCost.stone, locale)} · {locale === "ko" ? `${entry.routeNodeIds?.length ?? 1}개 노드 경로` : `${entry.routeNodeIds?.length ?? 1}-node route`}</small></div>
          <em>+{entry.percentGain!.toFixed(2)}%</em>
        </button>
        <button className="v47-recommendation-why" type="button" aria-expanded={expandedNodeId === entry.nodeId} onClick={() => setExpandedNodeId((current) => current === entry.nodeId ? undefined : entry.nodeId)}>{locale === "ko" ? "왜?" : "Why?"}</button>
        {expandedNodeId === entry.nodeId && trace(entry)}
      </article>)}
    </div> : <div className="v3-recommendation-partial">
      <strong>{locale === "ko" ? "정확한 DPS 순위 보류" : "Exact DPS ranking withheld"}</strong>
      <span>{locale === "ko"
        ? `현재 공식에서 ${recommendations.partial.length.toLocaleString()}개 후보가 부분 검증 상태입니다. 추정값으로 순위를 만들지 않습니다.`
        : `${recommendations.partial.length.toLocaleString()} candidates are partial under current formula evidence. No guessed ranking is shown.`}</span>
    </div>}
  </section>;
}
