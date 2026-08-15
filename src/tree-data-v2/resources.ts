import type { ResourceDefinitionV2 } from "../domain/types";
import { sourced } from "../domain/provenance";

const screenshotSources = ["user-tree-full-a", "user-tree-full-b"];

export const resourceDefinitions: ResourceDefinitionV2[] = [
  {
    id: "gold",
    iconKey: "gold",
    accent: "#f6b91a",
    name: sourced({ ko: "골드", en: "Gold" }, "observed", screenshotSources),
  },
  {
    id: "blueCard",
    iconKey: "blue-card",
    accent: "#2e78f7",
    name: sourced(
      { ko: "파란 재화", en: "Blue resource" },
      "partial",
      screenshotSources,
      "The icon and amounts are visible; the official current-game name is not yet verified.",
    ),
  },
  {
    id: "redCard",
    iconKey: "red-card",
    accent: "#e94c4c",
    name: sourced(
      { ko: "빨간 재화", en: "Red resource" },
      "partial",
      screenshotSources,
      "The icon and amounts are visible; the official current-game name is not yet verified.",
    ),
  },
  {
    id: "prismCube",
    iconKey: "prism-cube",
    accent: "#9b6bff",
    name: sourced(
      { ko: "프리즘 재화", en: "Prism resource" },
      "partial",
      screenshotSources,
      "The cube icon and amounts are visible; the official current-game name is not yet verified.",
    ),
  },
];
