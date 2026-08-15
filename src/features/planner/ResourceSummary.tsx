import type { ResourceTotals } from "../../domain/types";
import { useI18n } from "../../i18n/I18nContext";

export function ResourceSummary({ totals, investedCount }: { totals: ResourceTotals; investedCount: number }) {
  const { t } = useI18n();
  return <div className="resource-summary" data-testid="resource-summary">
    <span className="resource-kicker">{t("resource.spent")} · {investedCount}</span>
    <strong>{totals.gold.toLocaleString()}</strong><span>{t("resource.gold")}</span>
    <i />
    <strong>{totals.core}</strong><span>{t("resource.core")}</span>
    <i />
    <strong>{totals.token}</strong><span>{t("resource.token")}</span>
  </div>;
}
