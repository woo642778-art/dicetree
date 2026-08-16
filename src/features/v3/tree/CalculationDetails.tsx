import type { CalculationTraceStepV3 } from "../../../simulation/engine/types";

export interface CalculationDetailsProps {
  trace: readonly CalculationTraceStepV3[];
  locale: "ko" | "en";
}

function valueText(value: number | null) {
  return value === null ? "—" : Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function CalculationDetails({ trace, locale }: CalculationDetailsProps) {
  return <details className="v3-calculation-details" data-testid="calculation-details">
    <summary>{locale === "ko" ? "계산 근거" : "Calculation details"}</summary>
    {!trace.length
      ? <p>{locale === "ko" ? "현재 적용된 계산 단계가 없습니다." : "No calculation steps are applied yet."}</p>
      : <ol>
          {trace.map((step) => <li key={step.id} className={step.applied ? "is-applied" : "is-partial"}>
            <div>
              <strong>{step.labelKey ?? step.stat}</strong>
              <span>{step.stage}</span>
            </div>
            <p>
              {valueText(step.inputValue)} → {valueText(step.outputValue)}
              <small>{step.operation} {valueText(step.modifierValue)}</small>
            </p>
            <em>{step.confidence === "verified" ? (locale === "ko" ? "검증됨" : "Verified") : (locale === "ko" ? "부분 계산" : "Partial")}</em>
          </li>)}
        </ol>}
  </details>;
}
