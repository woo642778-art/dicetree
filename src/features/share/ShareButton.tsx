import { useState } from "react";
import type { PlannerStateV1 } from "../../domain/types";
import { encodePlannerState } from "../../share/codec";
import { useI18n } from "../../i18n/I18nContext";

export function ShareButton({ state }: { state: PlannerStateV1 }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const copyUrl = async (url: string) => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#b=${encodeURIComponent(encodePlannerState(state))}`;
    setShareUrl(url);
    await copyUrl(url);
  };

  return <div className="build-manager share-manager">
    <button type="button" className="top-action primary" onClick={share} data-testid="share-button">{copied ? t("action.copied") : t("action.share")}</button>
    {shareUrl && <div className="build-popover" data-testid="share-popover">
      <div className="popover-head"><strong>{t("action.share")}</strong><button type="button" onClick={() => setShareUrl("")} aria-label={t("action.close")}>×</button></div>
      <p className="muted">{copied ? t("action.copied") : t("share.ready")}</p>
      <div className="save-row"><input readOnly value={shareUrl} data-testid="share-url" aria-label={t("share.url")} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => copyUrl(shareUrl)}>{t("action.copy")}</button></div>
      <p className="muted">{t("share.warning")}</p>
    </div>}
  </div>;
}
