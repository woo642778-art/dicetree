import type { ConditionDefinitionV3 } from "../../../simulation/mechanics/types";

export interface ConditionControlsProps {
  definitions: readonly ConditionDefinitionV3[];
  values: Record<string, number | boolean | string>;
  locale: "ko" | "en";
  labelForKey?: (labelKey: string) => string;
  onChange: (key: string, value: number | boolean | string) => void;
}

const CONDITION_LABELS: Record<string, { ko: string; en: string }> = {
  sim_condition_predator_stacks: { ko: "포식 스택", en: "Predator stacks" },
  sim_condition_predator_acquisitions: { ko: "포식 획득 횟수", en: "Predator acquisitions" },
  sim_condition_adjacent_gear: { ko: "인접 기어 주사위 수", en: "Adjacent Gear dice" },
  sim_condition_combo_stacks: { ko: "콤보 스택", en: "Combo stacks" },
  sim_condition_taeguk_horizontal: { ko: "가로 태극 활성", en: "Horizontal Taegeuk active" },
  sim_condition_taeguk_vertical: { ko: "세로 태극 활성", en: "Vertical Taegeuk active" },
  sim_condition_empty_adjacent: { ko: "인접 빈 칸 수", en: "Empty adjacent tiles" },
  sim_condition_empty_field: { ko: "필드 빈 칸 수", en: "Empty field tiles" },
  sim_condition_neon_count: { ko: "네온 주사위 수", en: "Neon dice count" },
  sim_condition_resonance_count: { ko: "동일 눈금 공명 수", en: "Same-dot resonance count" },
  sim_condition_alignment_stacks: { ko: "정렬 스택", en: "Alignment stacks" },
  sim_condition_tyrant_stacks: { ko: "폭군 소모 스택", en: "Tyrant consume stacks" },
  sim_condition_poison_stacks: { ko: "독 스택", en: "Poison stacks" },
  sim_condition_laser_duration: { ko: "레이저 유지 시간(초)", en: "Laser duration (seconds)" },
  sim_condition_target_distance: { ko: "대상 거리", en: "Target distance" },
  sim_condition_current_sp: { ko: "현재 SP", en: "Current SP" },
  sim_condition_potion_stacks: { ko: "포션 스택", en: "Potion stacks" },
  sim_condition_dot_count: { ko: "눈금 수", en: "Dot count" },
  sim_condition_boss_hits: { ko: "보스 공격 횟수", en: "Boss hit count" },
};

function fallbackLabel(key: string, locale: "ko" | "en") {
  const known = CONDITION_LABELS[key];
  if (known) return known[locale];
  return key
    .replace(/^sim_condition_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function conditionLabelV3(
  key: string,
  locale: "ko" | "en",
  labelForKey?: (labelKey: string) => string,
) {
  const translated = labelForKey?.(key);
  return translated && translated !== key ? translated : fallbackLabel(key, locale);
}

export function ConditionControls({ definitions, values, locale, labelForKey, onChange }: ConditionControlsProps) {
  if (!definitions.length) return <section className="v3-condition-controls is-empty">
    <h3>{locale === "ko" ? "특수 조건" : "Special conditions"}</h3>
    <p>{locale === "ko" ? "이 주사위에는 추가 입력 조건이 없습니다." : "This dice has no extra input conditions."}</p>
  </section>;

  return <section className="v3-condition-controls" data-testid="v3-condition-controls">
    <h3>{locale === "ko" ? "특수 조건" : "Special conditions"}</h3>
    {definitions.map((definition) => {
      const label = conditionLabelV3(definition.labelKey, locale, labelForKey);
      const value = values[definition.key] ?? definition.defaultValue;
      if (definition.type === "boolean") {
        return <label key={definition.key} className="v3-toggle-row">
          <span>{label}</span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(definition.key, event.target.checked)}
          />
        </label>;
      }
      if (definition.type === "select") {
        return <label key={definition.key}>
          <span>{label}</span>
          <select value={String(value)} onChange={(event) => onChange(definition.key, event.target.value)}>
            {(definition.options ?? []).map((option) => <option key={option.value} value={option.value}>
              {conditionLabelV3(option.labelKey, locale, labelForKey)}
            </option>)}
          </select>
        </label>;
      }
      return <label key={definition.key}>
        <span>{label}</span>
        <input
          type="number"
          value={Number(value)}
          min={definition.min}
          max={definition.max}
          step={definition.step ?? 1}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(definition.key, next);
          }}
        />
      </label>;
    })}
  </section>;
}
