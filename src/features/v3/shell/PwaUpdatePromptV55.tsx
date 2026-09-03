import { useEffect, useState } from "react";
import { applyServiceWorkerUpdateV55, PWA_UPDATE_READY_EVENT_V55 } from "../../../pwa/serviceWorkerV55";

export function PwaUpdatePromptV55({ locale }: { locale: "ko" | "en" }) {
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  useEffect(() => {
    const onReady = () => setReady(true);
    const onControllerChange = () => window.location.reload();
    window.addEventListener(PWA_UPDATE_READY_EVENT_V55, onReady);
    navigator.serviceWorker?.addEventListener?.("controllerchange", onControllerChange);
    return () => {
      window.removeEventListener(PWA_UPDATE_READY_EVENT_V55, onReady);
      navigator.serviceWorker?.removeEventListener?.("controllerchange", onControllerChange);
    };
  }, []);
  if (!ready) return null;
  return <aside className="v55-pwa-update" role="status" aria-live="polite" data-testid="v55-pwa-update"><div><strong>{locale === "ko" ? "새 버전을 적용할 수 있습니다" : "A new version is ready"}</strong><span>{locale === "ko" ? "현재 작업은 유지됩니다. 적용 후 한 번 새로고침됩니다." : "Your current work stays in this browser. Applying refreshes once."}</span></div><button type="button" disabled={applying} onClick={() => { setApplying(true); void applyServiceWorkerUpdateV55().then((applied) => { if (!applied) window.location.reload(); }); }}>{locale === "ko" ? "지금 적용" : "Apply now"}</button><button type="button" aria-label={locale === "ko" ? "업데이트 알림 닫기" : "Dismiss update notice"} onClick={() => setReady(false)}>×</button></aside>;
}
