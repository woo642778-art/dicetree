import { useState } from "react";
import { createAccountSnapshotTemplateV49, lookupObservedAccountV49, parseFullAccountSnapshotV49, type FullAccountImportV49, type ObservedAccountV49 } from "../../../account/accountImportV49";
import type { CanonicalGameData } from "../../../game-data/types";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import { DiceIcon } from "../shared/DiceIcon";

export function AccountImportPanelV49({ data, locale, state, deckIds, onObservedImport, onFullImport }: {
  data: CanonicalGameData;
  locale: "ko" | "en";
  state: PlannerStateV3;
  deckIds: string[];
  onObservedImport: (account: ObservedAccountV49) => void;
  onFullImport: (account: FullAccountImportV49) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [observed, setObserved] = useState<ObservedAccountV49>();
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<string>();
  const search = () => {
    const result = lookupObservedAccountV49(identifier);
    setObserved(result);
    setMessage(result ? undefined : (locale === "ko" ? "현재 보존된 2026-08-16 랭킹 스냅샷에서 찾지 못했습니다. PID 원격 조회는 지원하지 않습니다." : "Not found in the preserved 2026-08-16 ranking snapshot. Remote PID lookup is not supported."));
  };
  const importJson = () => {
    const parsed = parseFullAccountSnapshotV49(json, data, state);
    if (!parsed.ok) { setMessage(parsed.error[locale]); return; }
    setMessage(undefined);
    onFullImport(parsed.account);
  };
  return <section className="v49-account-import" data-testid="v49-account-import">
    <header><div><small>ACCOUNT CONNECT · V4.9</small><h2>{locale === "ko" ? "내 계정 가져오기" : "Import my account"}</h2></div><span>{locale === "ko" ? "로컬 처리" : "Local processing"}</span></header>
    <div className="v49-account-columns">
      <article><h3>{locale === "ko" ? "공개 랭킹 닉네임 찾기" : "Find an observed ranking nickname"}</h3><p>{locale === "ko" ? "보존된 랭킹 화면에 등장한 닉네임 또는 #순위를 찾습니다. 덱과 순위만 가져옵니다." : "Searches a nickname or #rank in the preserved ranking capture. Only rank and deck are imported."}</p><div><input aria-label={locale === "ko" ? "닉네임 또는 PID" : "Nickname or PID"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={locale === "ko" ? "예: Asmo 또는 #1" : "Example: Asmo or #1"} /><button type="button" onClick={search}>{locale === "ko" ? "찾기" : "Find"}</button></div>{observed && <div className="v49-observed-account"><b>#{observed.rank} · {observed.nickname}</b><span>{observed.score?.toLocaleString()}</span><div>{observed.diceIds.map((diceId) => <DiceIcon key={diceId} diceId={diceId} label={diceId} />)}</div><button type="button" onClick={() => onObservedImport(observed)}>{locale === "ko" ? "관측 덱만 적용" : "Apply observed deck only"}</button></div>}</article>
      <article><h3>{locale === "ko" ? "전체 계정 스냅샷 가져오기" : "Import a full account snapshot"}</h3><p>{locale === "ko" ? "현재 사이트 입력으로 편집 가능한 JSON을 만든 뒤, PID·레벨을 보완해 검증 적용할 수 있습니다." : "Create an editable JSON from the current site state, add PID or levels, then validate and apply it."}</p><div className="v49-snapshot-actions"><button type="button" onClick={() => { setJson(createAccountSnapshotTemplateV49(state, deckIds)); setMessage(locale === "ko" ? "현재 입력으로 스냅샷 초안을 만들었습니다." : "Created a snapshot draft from the current state."); }}>{locale === "ko" ? "현재 입력으로 초안 만들기" : "Create from current state"}</button></div><textarea aria-label={locale === "ko" ? "계정 스냅샷 JSON" : "Account snapshot JSON"} value={json} onChange={(event) => setJson(event.target.value)} placeholder='{"schemaVersion":1,"nickname":"..."}' /><button type="button" disabled={!json.trim()} onClick={importJson}>{locale === "ko" ? "검증 후 전체 적용" : "Validate and apply"}</button></article>
    </div>
    {message && <p role="status" className="v49-import-message">{message}</p>}
    <footer>{locale === "ko" ? "게임 내부 인증 API를 호출하지 않으며 PID는 공유 링크에 포함하지 않습니다. 공개 랭킹 조회 결과는 전체 계정 스펙이 아닙니다." : "No authenticated in-game API is called, and PID is never included in share links. Observed ranking results are not full account specs."}</footer>
  </section>;
}
