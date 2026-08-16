import type { CanonicalGameData } from "./types";
import { validateCanonicalGameData } from "./validate";

export function loadCanonicalGameData(data: CanonicalGameData): CanonicalGameData {
  return validateCanonicalGameData(data);
}
