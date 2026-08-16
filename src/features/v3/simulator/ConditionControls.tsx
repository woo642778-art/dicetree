import type { ConditionDefinitionV3 } from "../../../simulation/mechanics/types";

export interface ConditionControlsProps {
  definitions: readonly ConditionDefinitionV3[];
  values: Record<string, number | boolean | string>;
  locale: "ko" | "en";
  labelForKey?: (labelKey: string) => string;
  onChange: (key: string, value: number | boolean | string) => void;
}

function fallbackLabel(key: string) {
  return key
    .replace(/^sim_condition_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ConditionControls({ definitions, values, locale, labelForKey, onChange }: ConditionControlsProps) {
  if (!definitions.length) return <section className="v3-condition-controls is-empty">
    <h3>{locale === "ko" ? "특수 조건" : "Special conditions"}</h3>
    <p>{locale === "ko" ? "이 주사위에는 추가 입력 조건이 없습니다." : "This dice has no extra input conditions."}</p>
  </section>;

  return <section className="v3-condition-controls" data-testid="v3-condition-controls">
    <h3>{locale === "ko" ? "특수 조건" : "Special conditions"}</h3>
    {definitions.map((definition) => {
      const label = labelForKey?.(definition.labelKey) ?? fallbackLabel(definition.labelKey);
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
              {labelForKey?.(option.labelKey) ?? fallbackLabel(option.labelKey)}
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
