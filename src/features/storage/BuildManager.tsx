import { useEffect, useState } from "react";
import type { PlannerStateV1 } from "../../domain/types";
import { deleteNamedBuild, listNamedBuilds, saveNamedBuild, type StoredBuild } from "../../storage/buildStorage";
import { useI18n } from "../../i18n/I18nContext";

export function BuildManager({ state, onLoad }: { state: PlannerStateV1; onLoad: (state: PlannerStateV1) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [builds, setBuilds] = useState<StoredBuild[]>([]);
  const refresh = () => setBuilds(listNamedBuilds());
  useEffect(() => { if (open) refresh(); }, [open]);
  const save = () => { saveNamedBuild(name, state); setName(""); refresh(); };
  return <div className="build-manager">
    <button type="button" className="top-action" onClick={() => setOpen((v) => !v)}>{t("save.title")}</button>
    {open && <div className="build-popover">
      <div className="popover-head"><strong>{t("save.title")}</strong><button type="button" onClick={() => setOpen(false)}>×</button></div>
      <div className="save-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("save.name")} /><button type="button" onClick={save}>{t("action.save")}</button></div>
      {!builds.length && <p className="muted">{t("save.empty")}</p>}
      {builds.map((build) => <div className="saved-build" key={build.id}><div><strong>{build.name}</strong><time>{new Date(build.modifiedAt).toLocaleString()}</time></div><button type="button" onClick={() => { onLoad(build.state); setOpen(false); }}>{t("action.load")}</button><button type="button" className="danger" onClick={() => { deleteNamedBuild(build.id); refresh(); }}>{t("action.delete")}</button></div>)}
    </div>}
  </div>;
}
