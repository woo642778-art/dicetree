from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class StaticEvidence:
    key: str
    symbols: tuple[str, ...]
    present: bool
    confidence: str = "partial"
    formula: None = None
    sourceRefs: tuple[str, ...] = ("il2cpp:global-metadata+UnityFramework",)

    def to_dict(self) -> dict[str, object]:
        result = asdict(self)
        result["symbols"] = list(self.symbols)
        result["sourceRefs"] = list(self.sourceRefs)
        return result


DEFAULT_SYMBOL_GROUPS: dict[str, tuple[str, ...]] = {
    "attack-interval-path": (
        "GetAttackIntervalByRatio",
        "GetFinalAttackIntervalWithRuneEffect",
        "RT_AttackInterval",
    ),
    "predator-mechanics": (
        "PredatorDmgPerStack",
        "BonusPredatorChance",
        "InstaPredatorHpThreshold",
    ),
}


def scan_il2cpp_identifiers(
    metadata_bytes: bytes,
    binary_bytes: bytes,
    symbol_groups: dict[str, tuple[str, ...]] | None = None,
) -> list[dict[str, object]]:
    """Record static symbol presence only. Symbol names never imply a formula."""
    groups = symbol_groups or DEFAULT_SYMBOL_GROUPS
    haystacks = (metadata_bytes, binary_bytes)
    output: list[dict[str, object]] = []
    for key, symbols in sorted(groups.items()):
        present = all(any(symbol.encode("utf-8") in blob for blob in haystacks) for symbol in symbols)
        output.append(StaticEvidence(key=key, symbols=symbols, present=present).to_dict())
    return output
