import { describe, expect, it } from "vitest";
import { formatGameText } from "./formatGameText";

describe("formatGameText", () => {
  it("converts Unity mechanic tags and placeholders into Korean product text", () => {
    expect(formatGameText(
      "<tag>PREDATOR</tag> 획득 시 {0}% 확률로 {1}중첩 추가 획득",
      "ko",
      [30, 2],
    )).toBe("포식 획득 시 30% 확률로 2중첩 추가 획득");
  });

  it("removes rich-text markup while retaining current and per-rank values", () => {
    const result = formatGameText(
      "기본 공격 대미지 {0}% <color=#00FF00>(+{1}%)</color> 증가<br>검증값",
      "ko",
      [7.4, 1.2],
    );
    expect(result).toBe("기본 공격 대미지 7.4% (+1.2%) 증가\n검증값");
    expect(result).not.toMatch(/[<>{}]/);
  });

  it("does not leak an unresolved template placeholder", () => {
    expect(formatGameText("Value {0}", "en")).toBe("Value Unknown");
  });

  it("localizes and separates mechanic tags attached to Korean words", () => {
    expect(formatGameText("감소시키는<tag>slow</tag>효과", "ko")).toBe("감소시키는 감속 효과");
    expect(formatGameText("<tag>BOSS_MONSTER</tag>대상 대미지", "ko")).toBe("보스 몬스터 대상 대미지");
  });
});
