import { useEffect, useMemo, useState } from "react";
import type { CanonicalGameData, DiceFamilyV3 } from "../../../game-data/types";
import { playableDiceV3 } from "../../../game-data/playableDice";
import { DiceIcon } from "../shared/DiceIcon";

interface TierRowV50 { id: string; name: string; color: string }
interface TierDraftV50 { tiers: TierRowV50[]; assigned: Record<string, string> }

const STORAGE_KEY = "dicetree:v50:tier-maker";
const DEFAULT_TIERS: TierRowV50[] = [
  { id: "s", name: "S", color: "#ef5a67" },
  { id: "a", name: "A", color: "#f4a84d" },
  { id: "b", name: "B", color: "#f1d65b" },
  { id: "c", name: "C", color: "#65c98a" },
  { id: "d", name: "D", color: "#6ca8e9" },
];

function cleanDraft(value: unknown): TierDraftV50 {
  if (!value || typeof value !== "object") return { tiers: DEFAULT_TIERS, assigned: {} };
  const candidate = value as Partial<TierDraftV50>;
  const tiers = Array.isArray(candidate.tiers)
    ? candidate.tiers.filter((tier): tier is TierRowV50 => Boolean(tier && typeof tier.id === "string" && typeof tier.name === "string" && typeof tier.color === "string")).slice(0, 12)
    : [];
  return { tiers: tiers.length >= 2 ? tiers : DEFAULT_TIERS, assigned: candidate.assigned && typeof candidate.assigned === "object" ? candidate.assigned : {} };
}

function loadDraft() {
  try { return cleanDraft(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")); }
  catch { return { tiers: DEFAULT_TIERS, assigned: {} }; }
}

const FAMILY_LABELS: Record<DiceFamilyV3, { ko: string; en: string }> = {
  nature: { ko: "자연", en: "Nature" }, chaos: { ko: "혼돈", en: "Chaos" }, magic: { ko: "마법", en: "Magic" },
  engineering: { ko: "공학", en: "Engineering" }, order: { ko: "질서", en: "Order" },
};

export function TierMakerView({ data, locale }: { data: CanonicalGameData; locale: "ko" | "en" }) {
  const [draft, setDraft] = useState<TierDraftV50>(loadDraft);
  const [activeTierId, setActiveTierId] = useState(draft.tiers[0]?.id ?? "s");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<"all" | DiceFamilyV3>("all");
  const [notice, setNotice] = useState("");
  const dice = useMemo(() => playableDiceV3(data), [data]);
  const validIds = useMemo(() => new Set(dice.map((entry) => entry.id)), [dice]);
  const nameOf = (diceId: string) => {
    const entry = dice.find((candidate) => candidate.id === diceId);
    if (!entry) return diceId;
    return (entry.nameKey && (data.localization[locale][entry.nameKey] ?? data.localization.ko[entry.nameKey] ?? data.localization.en[entry.nameKey])) || diceId;
  };
  const visiblePool = dice.filter((entry) => {
    const search = query.trim().toLocaleLowerCase();
    return !draft.assigned[entry.id]
      && (family === "all" || entry.family === family)
      && (!search || `${entry.id} ${nameOf(entry.id)}`.toLocaleLowerCase().includes(search));
  });

  useEffect(() => {
    const assigned = Object.fromEntries(Object.entries(draft.assigned).filter(([diceId, tierId]) => validIds.has(diceId) && draft.tiers.some((tier) => tier.id === tierId)));
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, assigned })); } catch { /* local drafts remain optional */ }
  }, [draft, validIds]);

  const assign = (diceId: string, tierId = activeTierId) => setDraft((current) => ({ ...current, assigned: { ...current.assigned, [diceId]: tierId } }));
  const unassign = (diceId: string) => setDraft((current) => {
    const assigned = { ...current.assigned }; delete assigned[diceId]; return { ...current, assigned };
  });
  const updateTier = (id: string, patch: Partial<TierRowV50>) => setDraft((current) => ({ ...current, tiers: current.tiers.map((tier) => tier.id === id ? { ...tier, ...patch } : tier) }));
  const moveTier = (index: number, offset: number) => setDraft((current) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= current.tiers.length) return current;
    const tiers = [...current.tiers]; [tiers[index], tiers[nextIndex]] = [tiers[nextIndex], tiers[index]]; return { ...current, tiers };
  });
  const removeTier = (id: string) => {
    const fallback = draft.tiers.find((tier) => tier.id !== id)?.id;
    if (draft.tiers.length <= 2 || !fallback) return;
    if (activeTierId === id) setActiveTierId(fallback);
    setDraft((current) => ({
      tiers: current.tiers.filter((tier) => tier.id !== id),
      assigned: Object.fromEntries(Object.entries(current.assigned).map(([diceId, tierId]) => [diceId, tierId === id ? fallback : tierId])),
    }));
  };
  const addTier = () => {
    if (draft.tiers.length >= 12) return;
    const id = `tier-${Date.now()}`;
    setDraft((current) => ({ ...current, tiers: [...current.tiers, { id, name: `T${current.tiers.length + 1}`, color: "#8f7cd8" }] }));
    setActiveTierId(id);
  };
  const share = async () => {
    const lines = draft.tiers.map((tier) => `${tier.name}: ${dice.filter((entry) => draft.assigned[entry.id] === tier.id).map((entry) => nameOf(entry.id)).join(", ") || "-"}`);
    try { await navigator.clipboard.writeText(lines.join("\n")); setNotice(locale === "ko" ? "티어표를 클립보드에 복사했습니다." : "Copied tier list."); }
    catch { setNotice(locale === "ko" ? "클립보드를 사용할 수 없습니다." : "Clipboard is unavailable."); }
  };

  return <main className="v50-tier-maker" data-testid="v50-tier-maker">
    <header><div><small>{locale === "ko" ? "41개 플레이 가능 주사위" : "41 PLAYABLE DICE"}</small><h1>{locale === "ko" ? "티어 메이커" : "Tier List Maker"}</h1><p>{locale === "ko" ? "티어를 선택한 뒤 주사위를 누르거나 끌어 놓으세요. 결과는 이 브라우저에 자동 저장됩니다." : "Select a tier, then tap or drag dice into it. Your draft is saved locally."}</p></div><div><button type="button" onClick={share}>{locale === "ko" ? "텍스트 공유" : "Copy list"}</button><button type="button" onClick={() => { setDraft({ tiers: DEFAULT_TIERS, assigned: {} }); setActiveTierId("s"); }}>{locale === "ko" ? "초기화" : "Reset"}</button></div></header>
    {notice && <p className="v50-tier-notice" role="status">{notice}</p>}
    <section className="v50-tier-board" aria-label={locale === "ko" ? "티어 보드" : "Tier board"}>
      {draft.tiers.map((tier, index) => <article key={tier.id} className={activeTierId === tier.id ? "is-active" : ""} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const diceId = event.dataTransfer.getData("text/dice-id"); if (validIds.has(diceId)) assign(diceId, tier.id); }}>
        <div className="v50-tier-label" style={{ background: tier.color }} onClick={() => setActiveTierId(tier.id)}>
          <input aria-label={locale === "ko" ? `${tier.name} 티어 이름` : `${tier.name} tier name`} value={tier.name} onChange={(event) => updateTier(tier.id, { name: event.target.value.slice(0, 12) })} />
          <input aria-label={locale === "ko" ? `${tier.name} 티어 색상` : `${tier.name} tier color`} type="color" value={tier.color} onChange={(event) => updateTier(tier.id, { color: event.target.value })} />
          <span><button type="button" aria-label={locale === "ko" ? "위로" : "Move up"} disabled={index === 0} onClick={() => moveTier(index, -1)}>↑</button><button type="button" aria-label={locale === "ko" ? "아래로" : "Move down"} disabled={index === draft.tiers.length - 1} onClick={() => moveTier(index, 1)}>↓</button><button type="button" aria-label={locale === "ko" ? "티어 삭제" : "Delete tier"} disabled={draft.tiers.length <= 2} onClick={() => removeTier(tier.id)}>×</button></span>
        </div>
        <div className="v50-tier-dice">{dice.filter((entry) => draft.assigned[entry.id] === tier.id).map((entry) => <button key={entry.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/dice-id", entry.id)} onClick={() => unassign(entry.id)} title={locale === "ko" ? `${nameOf(entry.id)} 제거` : `Remove ${nameOf(entry.id)}`}><DiceIcon diceId={entry.id} label={nameOf(entry.id)} /><span>{nameOf(entry.id)}</span></button>)}</div>
      </article>)}
    </section>
    <button className="v50-add-tier" type="button" disabled={draft.tiers.length >= 12} onClick={addTier}>{locale === "ko" ? "+ 티어 추가" : "+ Add tier"}</button>
    <section className="v50-tier-pool"><header><div><strong>{locale === "ko" ? "미배치 주사위" : "Unassigned dice"}</strong><small>{visiblePool.length} / {dice.length}</small></div><input aria-label={locale === "ko" ? "티어 주사위 검색" : "Search tier dice"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ko" ? "이름 또는 ID 검색" : "Search name or ID"} /><select aria-label={locale === "ko" ? "티어 계열 필터" : "Tier family filter"} value={family} onChange={(event) => setFamily(event.target.value as "all" | DiceFamilyV3)}><option value="all">{locale === "ko" ? "전체 계열" : "All families"}</option>{Object.entries(FAMILY_LABELS).map(([id, labels]) => <option key={id} value={id}>{labels[locale]}</option>)}</select></header><div>{visiblePool.map((entry) => <button key={entry.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/dice-id", entry.id)} onClick={() => assign(entry.id)}><DiceIcon diceId={entry.id} label={nameOf(entry.id)} /><span>{nameOf(entry.id)}</span></button>)}</div></section>
  </main>;
}
