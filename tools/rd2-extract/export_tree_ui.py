#!/usr/bin/env python3
"""Export audited Dice Tree interface artwork from serialized Unity assets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import UnityPy


UI_SPRITES = {
    "dice-tree-base": "DiceTreeBase",
}


def export_tree_ui(asset_root: Path, output_dir: Path) -> None:
    environment = UnityPy.load(str(asset_root))
    wanted = set(UI_SPRITES.values())
    sprites = {}
    for obj in environment.objects:
        if obj.type.name != "Sprite":
            continue
        sprite = obj.read()
        if sprite.m_Name in wanted and sprite.m_Name not in sprites:
            sprites[sprite.m_Name] = sprite.image.convert("RGBA")

    missing = sorted(wanted - sprites.keys())
    if missing:
        raise RuntimeError(f"Missing audited UI sprites: {', '.join(missing)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for asset_id, sprite_name in UI_SPRITES.items():
        image = sprites[sprite_name]
        output_name = f"{asset_id}.webp"
        image.save(output_dir / output_name, "WEBP", lossless=True, method=6)
        manifest[asset_id] = {
            "file": output_name,
            "sourceSprite": sprite_name,
            "width": image.width,
            "height": image.height,
        }

    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported {len(manifest)} verified Dice Tree UI assets to {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export verified Dice Tree interface artwork")
    parser.add_argument("asset_root", type=Path, help="Directory containing Unity asset files")
    parser.add_argument("output_dir", type=Path, help="Destination directory for web assets")
    args = parser.parse_args()
    export_tree_ui(args.asset_root, args.output_dir)


if __name__ == "__main__":
    main()
