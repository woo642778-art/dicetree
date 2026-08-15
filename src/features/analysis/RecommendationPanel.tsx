import type { Recommendation, TreeNodeDefinition } from "../../domain/types";
import { useI18n } from "../../i18n/I18nContext";

export function RecommendationPanel({ recommendations, nodes, onApply }: { recommendations: Recommendation[]; nodes: TreeNodeDefinition[]; onApply: (r: Recommendation) => void }) {
  const { t } = useI18n();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return <section className="recommend-card">
    <div className="panel-title"><span>{t("recommend.title")}</span><span className="panel-index">02</span></div>
    <p className="recommend-note">{t("recommend.warning")}</p>
    {!recommendations.length && <p className="muted">{t("recommend.empty")}</p>}
    <div className="recommend-list">
      {recommendations.map((item, index) => {
        const node = byId.get(item.nodeId);
        if (!node) return null;
        return <article key={item.nodeId} className="recommend-item">
          <div className="recommend-rank">0{index + 1}</div>
          <div className="recommend-main"><div><strong>{t(node.localizationKey)}</strong><span>{item.mode === "exact" ? t("recommend.exact") : t("recommend.heuristic")}</span></div><div className="score-line"><b>{item.score.toFixed(2)}</b><span>EFF SCORE</span><em>{item.incrementalCosts.gold.toLocaleString()} G</em></div><ul>{item.reasons.slice(0, 4).map((reason) => <li key={reason}>{t(reason)}</li>)}</ul><button type="button" className="apply-button" onClick={() => onApply(item)}>{t("action.apply")}</button></div>
        </article>;
      })}
    </div>
  </section>;
}
