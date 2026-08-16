export type GameTextValue = number | string | null | undefined;

const KOREAN_TAG_LABELS: Record<string, string> = {
  ALIGNMENT: "정렬",
  ALONE: "고독",
  BIGTHORN: "대형 가시",
  BIG_MONSTER: "대형 몬스터",
  BLESS: "축복",
  BLOOM: "개화",
  BOSS_MONSTER: "보스 몬스터",
  BUBBLE: "버블",
  BULLET: "불렛",
  BURN: "화상",
  COMBO: "콤보",
  DECAY: "부패",
  DOOM: "파멸",
  ELEMENT: "원소",
  EXECUTIONER: "처형",
  FAILURE: "실패",
  FROZEN: "빙결",
  GOLEM_MONSTER: "골렘 몬스터",
  GROWTH: "성장",
  HARMONY: "조화",
  LASER: "레이저",
  LOCK: "잠금",
  MERGE: "합성",
  MUTATION: "변이",
  NORMAL_MONSTER: "일반 몬스터",
  OVERSHURIKEN: "대형 수리검",
  PILLAR: "기둥",
  POISON: "독",
  POTION: "포션",
  PREDATOR: "포식",
  RESONANCE: "공명",
  SAW: "톱날",
  SHURIKEN: "수리검",
  SLOW: "감속",
  SPEED_MONSTER: "속도형 몬스터",
  STONE: "돌",
  STUN: "기절",
  TAEGEUK: "태극",
  THORN: "가시",
  TRANSFER: "전이",
  TYRANT: "폭군",
};

function humanizeTag(token: string, locale: "ko" | "en") {
  const normalized = token.trim().toUpperCase();
  if (locale === "ko" && KOREAN_TAG_LABELS[normalized]) return KOREAN_TAG_LABELS[normalized];
  return normalized
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function formatValue(value: GameTextValue, locale: "ko" | "en") {
  if (value === null || value === undefined || value === "") return locale === "ko" ? "미확인" : "Unknown";
  if (typeof value !== "number") return String(value);
  return value.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 4 });
}

export function formatGameText(
  source: string,
  locale: "ko" | "en",
  values: readonly GameTextValue[] = [],
) {
  return source
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<tag>(.*?)<\/tag>/gi, (match, token: string, offset: number, whole: string) => {
      const word = /[0-9A-Za-z가-힣]/;
      const before = offset > 0 && word.test(whole[offset - 1]) ? " " : "";
      const afterIndex = offset + match.length;
      const after = afterIndex < whole.length && word.test(whole[afterIndex]) ? " " : "";
      return `${before}${humanizeTag(token, locale)}${after}`;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/\{(\d+)\}/g, (_match, rawIndex: string) => formatValue(values[Number(rawIndex)], locale))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
