import type { CanonicalGameData } from "../../../game-data/types";
import { buildEnemyPresetsV3 } from "../../../simulation/enemies/presets";

export interface EnemyControlsProps {
  data: CanonicalGameData;
  locale: "ko" | "en";
  presetId: string;
  hpOverride?: number;
  durationSeconds: number;
  onChange: (patch: { enemyPresetId?: string; enemyHpOverride?: number | undefined; durationSeconds?: number }) => void;
}

function presetName(data: CanonicalGameData, preset: ReturnType<typeof buildEnemyPresetsV3>[number], locale: "ko" | "en") {
  if (preset.id === "custom") return locale === "ko" ? "사용자 지정" : "Custom";
  if (preset.nameKey) return data.localization[locale][preset.nameKey] ?? data.localization.ko[preset.nameKey] ?? preset.id;
  const kind: Record<string, { ko: string; en: string }> = {
    normal: { ko: "일반", en: "Normal" }, elite: { ko: "엘리트", en: "Elite" }, boss: { ko: "보스", en: "Boss" },
  };
  return `${kind[preset.kind]?.[locale] ?? preset.kind} · ${preset.id}`;
}

export function EnemyControls({ data, locale, presetId, hpOverride, durationSeconds, onChange }: EnemyControlsProps) {
  const presets = buildEnemyPresetsV3(data);
  const selected = presets.find((preset) => preset.id === presetId) ?? presets[0];
  return <section className="v3-enemy-controls" data-testid="v3-enemy-controls">
    <h3>{locale === "ko" ? "적 조건" : "Enemy scenario"}</h3>
    <label>
      <span>{locale === "ko" ? "프리셋" : "Preset"}</span>
      <select aria-label={locale === "ko" ? "적 프리셋" : "Enemy preset"} value={selected.id} onChange={(event) => onChange({ enemyPresetId: event.target.value })}>
        {presets.map((preset) => <option key={preset.id} value={preset.id}>{presetName(data, preset, locale)}</option>)}
      </select>
    </label>
    <label>
      <span>{locale === "ko" ? "적 HP" : "Enemy HP"}</span>
      <input
        aria-label={locale === "ko" ? "적 HP" : "Enemy HP"}
        type="number"
        min="1"
        step="1"
        value={hpOverride ?? ""}
        placeholder={selected.requiresHpInput ? (locale === "ko" ? "직접 입력" : "Enter HP") : ""}
        onChange={(event) => {
          if (event.target.value === "") {
            onChange({ enemyHpOverride: undefined });
            return;
          }
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value > 0) onChange({ enemyHpOverride: value });
        }}
      />
      {selected.requiresHpInput && <small>{locale === "ko" ? "현재 클라이언트는 절대 HP가 아니라 배율/스케일 정보를 제공하므로 HP를 직접 입력합니다." : "The client exposes relative/scaling HP data, so absolute HP is entered manually."}</small>}
    </label>
    <label>
      <span>{locale === "ko" ? "분석 시간" : "Duration"}</span>
      <input
        aria-label={locale === "ko" ? "분석 시간" : "Duration"}
        type="number"
        min="1"
        step="1"
        value={durationSeconds}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value > 0) onChange({ durationSeconds: value });
        }}
      />
      <small>{locale === "ko" ? "초" : "seconds"}</small>
    </label>
  </section>;
}
