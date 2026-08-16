export function NumberRoll({ value, suffix = "" }: { value: number; suffix?: string }) {
  return <span className="v3-number-roll" key={`${value}:${suffix}`}>{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}</span>;
}
