import type { CanonicalGameData } from "../../../game-data/types";
import type { V3RecommendationSet } from "../../../optimizer/recommendV3";

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
  return <section className="v3-recommendation-strip" data-testid="v3-recommendation-strip">
    <div className="v3-recommendation-title">
      <small>{locale === "ko" ? "선택 주사위 기준" : "For selected dice"}</small>
      <strong>{locale === "ko" ? "다음 투자 분석" : "Next investment"}</strong>
    </div>
    {recommendations.verified.length > 0 ? <div className="v3-recommendation-list">
      {recommendations.verified.map((entry, index) => <button key={entry.nodeId} type="button" onClick={() => onSelectNode(entry.nodeId)}>
        <span>{index + 1}</span>
        <div><strong>{localizedNodeName(data, entry.nodeId, locale)}</strong><small>{costText(entry.totalRouteCost.gold, entry.totalRouteCost.stone, locale)}</small></div>
        <em>+{entry.percentGain!.toFixed(2)}%</em>
      </button>)}
    </div> : <div className="v3-recommendation-partial">
      <strong>{locale === "ko" ? "정확한 DPS 순위 보류" : "Exact DPS ranking withheld"}</strong>
      <span>{locale === "ko"
        ? `현재 공식에서 ${recommendations.partial.length.toLocaleString()}개 후보가 부분 검증 상태입니다. 추정값으로 순위를 만들지 않습니다.`
        : `${recommendations.partial.length.toLocaleString()} candidates are partial under current formula evidence. No guessed ranking is shown.`}</span>
    </div>}
  </section>;
}
