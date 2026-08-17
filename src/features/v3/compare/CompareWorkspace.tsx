import { useMemo, useState } from "react";
import { playableDiceV3 } from "../../../game-data/playableDice";
import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { mechanicConditionDefinitionsV3 } from "../../../simulation/mechanics/registry";
import { DiceIcon } from "../shared/DiceIcon";
import { ConditionControls } from "../simulator/ConditionControls";
import { CompareView } from "./CompareView";

type TreeMode = "current" | "none";

interface SideState {
  diceId: string;
  diceProgressionLevel: number;
  battleUpgradeLevel: number;
  treeMode: TreeMode;
  conditionValues: Record<string, number | boolean | string>;
}

export interface CompareWorkspaceProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  baseInput: SimulationInputV3;
}

function diceName(data: CanonicalGameData, diceId: string, locale: "ko" | "en") {
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  const key = dice?.nameKey;
  return key ? data.localization[locale][key] ?? data.localization.ko[key] ?? diceId : diceId;
}

function conditionDefaults(data: CanonicalGameData, diceId: string, treeRanks: Record<string, number>) {
  return Object.fromEntries(
    mechanicConditionDefinitionsV3(diceId, data, treeRanks).map((definition) => [definition.key, definition.defaultValue]),
  );
}

function initialSide(base: SimulationInputV3, treeMode: TreeMode): SideState {
  return {
    diceId: base.diceId,
    diceProgressionLevel: base.diceProgressionLevel,
    battleUpgradeLevel: base.battleUpgradeLevel,
    treeMode,
    conditionValues: { ...base.conditionValues },
  };
}

function SideEditor({
  id,
  side,
  data,
  locale,
  baseTreeRanks,
  onChange,
}: {
  id: "A" | "B";
  side: SideState;
  data: CanonicalGameData;
  locale: "ko" | "en";
  baseTreeRanks: Record<string, number>;
  onChange: (next: SideState) => void;
}) {
  const treeRanks = side.treeMode === "current" ? baseTreeRanks : {};
  const definitions = useMemo(
    () => mechanicConditionDefinitionsV3(side.diceId, data, treeRanks),
    [data, side.diceId, treeRanks],
  );
  const name = diceName(data, side.diceId, locale);

  return <section className="v45-compare-editor" data-testid={`compare-editor-${id.toLowerCase()}`}>
    <header><span>{id}</span><DiceIcon diceId={side.diceId} label={name} /><strong>{name}</strong></header>
    <div className="v45-compare-fields">
      <label>{locale === "ko" ? "주사위" : "Dice"}<select aria-label={`${id} ${locale === "ko" ? "주사위" : "dice"}`} value={side.diceId} onChange={(event) => {
        const diceId = event.target.value;
        onChange({ ...side, diceId, conditionValues: conditionDefaults(data, diceId, treeRanks) });
      }}>{playableDiceV3(data).map((dice) => <option key={dice.id} value={dice.id}>{diceName(data, dice.id, locale)}</option>)}</select></label>
      <label>{locale === "ko" ? "트리" : "Tree"}<select aria-label={`${id} ${locale === "ko" ? "트리" : "tree"}`} value={side.treeMode} onChange={(event) => {
        const treeMode = event.target.value as TreeMode;
        const nextRanks = treeMode === "current" ? baseTreeRanks : {};
        onChange({ ...side, treeMode, conditionValues: conditionDefaults(data, side.diceId, nextRanks) });
      }}><option value="current">{locale === "ko" ? "현재 가상 트리" : "Current simulated tree"}</option><option value="none">{locale === "ko" ? "트리 없음" : "No tree"}</option></select></label>
      <label>{locale === "ko" ? "영구 레벨" : "Permanent level"}<input aria-label={`${id} ${locale === "ko" ? "영구 레벨" : "permanent level"}`} type="number" min="1" value={side.diceProgressionLevel} onChange={(event) => {
        const value = Number(event.target.value);
        if (Number.isInteger(value) && value >= 1) onChange({ ...side, diceProgressionLevel: value });
      }} /></label>
      <label>{locale === "ko" ? "전투 파워업" : "Battle upgrade"}<input aria-label={`${id} ${locale === "ko" ? "전투 파워업" : "battle upgrade"}`} type="number" min="1" value={side.battleUpgradeLevel} onChange={(event) => {
        const value = Number(event.target.value);
        if (Number.isInteger(value) && value >= 1) onChange({ ...side, battleUpgradeLevel: value });
      }} /></label>
    </div>
    <ConditionControls definitions={definitions} values={side.conditionValues} locale={locale} onChange={(key, value) => onChange({ ...side, conditionValues: { ...side.conditionValues, [key]: value } })} />
  </section>;
}

export function CompareWorkspace({ data, locale, baseInput }: CompareWorkspaceProps) {
  const [left, setLeft] = useState<SideState>(() => initialSide(baseInput, "current"));
  const [right, setRight] = useState<SideState>(() => initialSide(baseInput, "none"));

  const inputFor = (side: SideState): SimulationInputV3 => ({
    ...baseInput,
    diceId: side.diceId,
    diceProgressionLevel: side.diceProgressionLevel,
    battleUpgradeLevel: side.battleUpgradeLevel,
    treeRanks: side.treeMode === "current" ? baseInput.treeRanks : {},
    conditionValues: side.conditionValues,
  });

  const reset = () => {
    setLeft(initialSide(baseInput, "current"));
    setRight(initialSide(baseInput, "none"));
  };

  return <main className="v3-compare-shell" data-testid="v45-compare-workspace">
    <header className="v45-compare-toolbar">
      <div><strong>{locale === "ko" ? "독립 A/B 설정" : "Independent A/B setup"}</strong><small>{locale === "ko" ? "적·HP·분석 시간은 공정한 비교를 위해 동일하게 고정됩니다." : "Enemy, HP, and duration stay identical for a fair comparison."}</small></div>
      <div><button type="button" onClick={() => { setLeft(right); setRight(left); }}>{locale === "ko" ? "A/B 바꾸기" : "Swap A/B"}</button><button type="button" onClick={reset}>{locale === "ko" ? "현재 설정으로 초기화" : "Reset to current"}</button></div>
    </header>
    <section className="v45-compare-editors">
      <SideEditor id="A" side={left} data={data} locale={locale} baseTreeRanks={baseInput.treeRanks} onChange={setLeft} />
      <SideEditor id="B" side={right} data={data} locale={locale} baseTreeRanks={baseInput.treeRanks} onChange={setRight} />
    </section>
    <CompareView data={data} locale={locale} left={inputFor(left)} right={inputFor(right)} />
  </main>;
}
