import type { SourcedField } from "./types";

const EXACT_CONFIDENCE = new Set(["verified", "observed"] as const);

export function hasValue<T>(field: SourcedField<T>): field is SourcedField<T> & { value: T } {
  return field.value !== undefined;
}

export function canUseExactValue<T>(field: SourcedField<T>): field is SourcedField<T> & { value: T } {
  return hasValue(field) && EXACT_CONFIDENCE.has(field.confidence as "verified" | "observed") && field.sourceIds.length > 0;
}

export function validateSourcedField<T>(field: SourcedField<T>, label: string): string[] {
  const errors: string[] = [];
  if ((field.confidence === "verified" || field.confidence === "observed") && field.sourceIds.length === 0) {
    errors.push(`${label}: ${field.confidence} values require at least one source`);
  }
  if (field.confidence === "unknown" && field.value !== undefined) {
    errors.push(`${label}: unknown fields cannot carry an exact value`);
  }
  return errors;
}

export function sourced<T>(
  value: T,
  confidence: Exclude<SourcedField<T>["confidence"], "unknown">,
  sourceIds: string[],
  notes?: string,
): SourcedField<T> {
  return { value, confidence, sourceIds, notes };
}

export function unknown<T>(notes?: string): SourcedField<T> {
  return { confidence: "unknown", sourceIds: [], notes };
}
