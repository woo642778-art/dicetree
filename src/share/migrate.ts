import type { PlannerStateV1 } from "../domain/types";

export function migratePlannerState(input: unknown): PlannerStateV1 | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<PlannerStateV1>;
  if (value.schemaVersion !== 1) return null;
  return value as PlannerStateV1;
}
