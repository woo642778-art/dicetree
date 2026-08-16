import { useMemo, useState } from "react";
import type { CanonicalGameData, DiceFamilyV3 } from "../../../game-data/types";
import { DiceIcon } from "../shared/DiceIcon";

export interface DiceSelectorProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  selectedDiceId: string;
  onSelect: (diceId: string) => void;
}

const FAMILY_LABEL: Record<DiceFamilyV3, { ko: string; en: string }> = {
  order: { ko: "질서", en: "Order" }, chaos: { ko: "혼돈", en: "Chaos" }, magic: { ko: "마법", en: "Magic" },
  engineering: { ko: "공학", en: "Engineering" }, nature: { ko: "자연", en: "Nature" },
};

function diceName(data: CanonicalGameData, diceId: string, nameKey: string | undefined, locale: "ko" | "en") {
  if (!nameKey) return diceId;
  return data.localization[locale][nameKey] ?? data.localization.ko[nameKey] ?? data.localization.en[nameKey] ?? diceId;
}

export function DiceSelector({ data, locale, selectedDiceId, onSelect }: DiceSelectorProps) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<DiceFamilyV3 | "all">("all");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return data.dice
      .filter((dice) => family === "all" || dice.family === family)
      .map((dice) => ({ dice, name: diceName(data, dice.id, dice.nameKey, locale) }))
      .filter(({ dice, name }) => !normalized || `${name} ${dice.id}`.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [data, family, locale, query]);

  return <section className="v3-dice-selector" aria-label={locale === "ko" ? "주사위 선택" : "Dice selector"}>
    <div className="v3-dice-search">
      <input
        aria-label={locale === "ko" ? "주사위 검색" : "Search dice"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={locale === "ko" ? "주사위 이름 검색" : "Search dice"}
      />
      <select aria-label={locale === "ko" ? "계열 필터" : "Family filter"} value={family} onChange={(event) => setFamily(event.target.value as DiceFamilyV3 | "all")}>
        <option value="all">{locale === "ko" ? "전체 계열" : "All families"}</option>
        {(Object.keys(FAMILY_LABEL) as DiceFamilyV3[]).map((key) => <option key={key} value={key}>{FAMILY_LABEL[key][locale]}</option>)}
      </select>
    </div>
    <div className="v3-dice-list" role="listbox" aria-label={locale === "ko" ? "주사위 목록" : "Dice list"}>
      {visible.map(({ dice, name }) => <button
        key={dice.id}
        type="button"
        role="option"
        aria-selected={dice.id === selectedDiceId}
        className={dice.id === selectedDiceId ? "is-selected" : ""}
        onClick={() => onSelect(dice.id)}
      >
        <span className={`v3-dice-token family-${dice.family ?? "unknown"}`}><DiceIcon diceId={dice.id} label={name} /></span>
        <span><strong>{name}</strong><small>{dice.family ? FAMILY_LABEL[dice.family][locale] : dice.id}</small></span>
      </button>)}
    </div>
  </section>;
}
