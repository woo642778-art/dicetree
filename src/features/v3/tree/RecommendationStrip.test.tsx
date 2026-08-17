import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalGameData } from "../../../game-data/types";
import { RecommendationStrip } from "./RecommendationStrip";

afterEach(cleanup);

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [], runes: [], enemies: [], passives: [],
  tree: [{
    id: "attack", family: "core", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 1,
    costsByRank: [{ gold: 2_000, stone: 1 }], nameKey: "node.attack", descriptionKey: "node.attack.desc", sourceRefs: [],
  }],
  localization: {
    ko: { "node.attack": "모든 주사위 대미지", "node.attack.desc": "대미지 증가" },
    en: { "node.attack": "All Dice Damage", "node.attack.desc": "Damage up" },
  },
};

describe("RecommendationStrip", () => {
  it("expands a transparent verified calculation trace without selecting the node", () => {
    const onSelectNode = vi.fn();
    render(<RecommendationStrip
      data={data}
      locale="ko"
      onSelectNode={onSelectNode}
      recommendations={{
        verified: [{
          nodeId: "attack", beforeDps: 100, afterDps: 112.3, absoluteGain: 12.3, percentGain: 12.3,
          cost: { gold: 2_000, stone: 1 }, prerequisiteCost: { gold: 3_000, stone: 2 }, totalRouteCost: { gold: 5_000, stone: 3 },
          gainPerGold: 12.3 / 2_000, gainPerStone: 12.3, confidence: "verified", reasons: [], routeNodeIds: ["root", "attack"],
        }],
        partial: [],
      }}
    />);

    fireEvent.click(screen.getByRole("button", { name: "왜?" }));
    expect(screen.getByTestId("recommendation-trace-attack")).toHaveTextContent("현재 DPS");
    expect(screen.getByTestId("recommendation-trace-attack")).toHaveTextContent("경로 포함 총비용");
    expect(screen.getByTestId("recommendation-trace-attack")).toHaveTextContent("확정");
    expect(onSelectNode).not.toHaveBeenCalled();
  });
});
