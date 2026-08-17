import { useState } from "react";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import type { UserDigitalTwinV48 } from "../../../account/digitalTwinV48";
import { deleteProfileV3, listProfilesV3, saveProfileV3, type StoredDeckGoalV3, type StoredProfileV3, type StoredSpendProfileV3 } from "../../../storage/profileStorageV3";

export function ProfileManagerV3({ locale, state, activeDeckIds, deckGoal, spendProfile, digitalTwin, onLoad, onClose }: {
  locale: "ko" | "en";
  state: PlannerStateV3;
  activeDeckIds: string[];
  deckGoal: StoredDeckGoalV3;
  spendProfile: StoredSpendProfileV3;
  digitalTwin?: UserDigitalTwinV48;
  onLoad: (profile: StoredProfileV3) => void;
  onClose: () => void;
}) {
  const [profiles, setProfiles] = useState(() => listProfilesV3());
  const [name, setName] = useState("");
  const save = () => {
    saveProfileV3({ name, state, activeDeckIds, deckGoal, spendProfile, digitalTwin });
    setProfiles(listProfilesV3());
    setName("");
  };
  return <aside className="v47-profile-panel" data-testid="v47-profile-panel">
    <header><div><small>{locale === "ko" ? "브라우저 로컬 저장" : "LOCAL BROWSER STORAGE"}</small><h2>{locale === "ko" ? "내 프로필" : "My Profiles"}</h2></div><button type="button" onClick={onClose} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></header>
    <p>{locale === "ko" ? "주사위 레벨, 보유 재화, 트리, 덱과 선호 역할을 한 세트로 저장합니다." : "Stores levels, resources, tree, deck, and role preferences as one local profile."}</p>
    <div className="v47-profile-create"><input aria-label={locale === "ko" ? "프로필 이름" : "Profile name"} value={name} onChange={(event) => setName(event.target.value)} placeholder={locale === "ko" ? "예: 본계정" : "Example: Main account"} /><button type="button" onClick={save} disabled={!name.trim()}>{locale === "ko" ? "현재 상태 저장" : "Save current"}</button></div>
    <div className="v47-profile-list">{profiles.length ? profiles.map((profile) => <article key={profile.id}>
      <div><strong>{profile.name}</strong><small>{new Date(profile.modifiedAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")} · {profile.activeDeckIds.length}{locale === "ko" ? "개 덱" : " dice"}</small></div>
      <button type="button" onClick={() => onLoad(profile)}>{locale === "ko" ? "불러오기" : "Load"}</button>
      <button type="button" onClick={() => { deleteProfileV3(profile.id); setProfiles(listProfilesV3()); }}>{locale === "ko" ? "삭제" : "Delete"}</button>
    </article>) : <p>{locale === "ko" ? "저장된 프로필이 없습니다." : "No saved profiles."}</p>}</div>
    <footer>{locale === "ko" ? "로그인 없이 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 삭제됩니다." : "Saved only in this browser without login. Clearing browser data removes profiles."}</footer>
  </aside>;
}
