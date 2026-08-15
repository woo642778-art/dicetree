import type { TreeNodeDefinition } from "../../domain/types";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  node?: TreeNodeDefinition;
  rank: number;
  onIncrement: () => void;
  onDecrement: () => void;
  canIncrement: boolean;
}

export function NodePanel({ node, rank, onIncrement, onDecrement, canIncrement }: Props) {
  const { t } = useI18n();
  if (!node) return <section className="analysis-card"><h2>{t("analysis.title")}</h2><p className="muted">{t("analysis.none")}</p></section>;
  const next = node.levels.find((level) => level.rank === rank + 1);
  const badge = node.verification.status === "verified" ? t("tree.verified") : node.verification.status === "partial" ? t("tree.partial") : t("tree.unverified");
  return <section className="analysis-card" data-testid="node-panel">
    <div className="analysis-heading"><div><span className={`verify-badge ${node.verification.status}`}>{badge}</span><h2>{t(node.localizationKey)}</h2></div><span className="family-mark">{t(`family.${node.family}`)}</span></div>
    <div className="rank-control"><span>{t("analysis.currentRank")}</span><div><button type="button" onClick={onDecrement} disabled={rank <= 0}>−</button><strong>{rank} / {node.maxRank}</strong><button type="button" onClick={onIncrement} disabled={!canIncrement}>+</button></div></div>
    {next && <>
      <div className="detail-row"><span>{t("analysis.nextCost")}</span><strong>{next.costsKnown ? `${(next.costs.gold ?? 0).toLocaleString()} G` : t("tree.unverified")}</strong></div>
      <div className="effect-list"><span className="field-label">{t("analysis.effect")}</span>{next.effects.map((effect, index) => <div className="effect-chip" key={index}>{t(`effect.${effect.kind}`, { amount: effect.amount })}<small>{"verifiedFormula" in effect && !effect.verifiedFormula ? t("recommend.heuristic") : ""}</small></div>)}</div>
    </>}
    {!node.routeKnown && node.verification.status !== "unverified" && <p className="notice">{t("analysis.routeUnknown")}</p>}
    {node.verification.status === "unverified" && <p className="notice warning">{t("analysis.unverifiedDisabled")}</p>}
    <div className="source-box"><span>SOURCE</span><strong>{node.verification.sourceLabel ?? "—"}</strong><p>{node.verification.notes}</p><time>{node.verification.checkedAt}</time></div>
  </section>;
}
