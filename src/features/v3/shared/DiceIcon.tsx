import type { ImgHTMLAttributes } from "react";

export function diceIconUrl(diceId: string) {
  return `${import.meta.env.BASE_URL}dice-icons/${encodeURIComponent(diceId)}.webp`;
}

export interface DiceIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  diceId: string;
  label: string;
}

export function DiceIcon({ diceId, label, className = "", ...props }: DiceIconProps) {
  return <img
    {...props}
    className={`v42-dice-icon ${className}`.trim()}
    src={diceIconUrl(diceId)}
    alt={label}
    data-dice-id={diceId}
    decoding="async"
    loading="lazy"
  />;
}
