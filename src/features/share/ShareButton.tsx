import { useState } from "react";
import type { PlannerStateV1 } from "../../domain/types";
import { encodePlannerState } from "../../share/codec";
import { useI18n } from "../../i18n/I18nContext";

export function ShareButton({ state }: { state: PlannerStateV1 }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#b=${encodeURIComponent(encodePlannerState(state))}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy build URL", url);
    }
  };
  return <button type="button" className="top-action primary" onClick={share} data-testid="share-button">{copied ? t("action.copied") : t("action.share")}</button>;
}
