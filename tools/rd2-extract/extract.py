#!/usr/bin/env python3
from pathlib import Path
import argparse
import json
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from rd2_extract.archive import discover_client_files
from rd2_extract.fingerprint import EXPECTED_101_SHA256, assert_client_fingerprint, sha256_file
from rd2_extract.normalize import generate_canonical_data
from rd2_extract.unity_assets import read_member


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only Random Dice 2 IPA scanner")
    parser.add_argument("--ipa", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--emit", type=Path, help="write normalized V3 JSON into this directory")
    parser.add_argument(
        "--allow-new-client",
        action="store_true",
        help="allow an unknown SHA for inspection; never changes the approved canonical hash",
    )
    return parser


def _write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _emit_dataset(ipa_path: Path, emit_dir: Path, source_sha256: str) -> None:
    resources = read_member(ipa_path, "/Data/resources.assets")
    metadata = read_member(ipa_path, "/Data/Managed/Metadata/global-metadata.dat")
    unity_framework = read_member(ipa_path, "/Frameworks/UnityFramework.framework/UnityFramework")
    data = generate_canonical_data(
        resources,
        metadata,
        unity_framework,
        source_sha256=source_sha256,
    )

    emit_dir.mkdir(parents=True, exist_ok=True)
    _write_json(emit_dir / "manifest.json", data["manifest"])
    _write_json(emit_dir / "dice.json", data["dice"])
    _write_json(emit_dir / "tree.json", data["tree"])
    _write_json(emit_dir / "passives.json", data["passives"])
    _write_json(emit_dir / "runes.json", data["runes"])
    _write_json(emit_dir / "enemies.json", data["enemies"])
    _write_json(emit_dir / "waves.json", data["waves"])
    _write_json(emit_dir / "mechanic-evidence.json", data["mechanicEvidence"])
    localization = data["localization"]
    _write_json(emit_dir / "localization.ko.json", localization["ko"])
    _write_json(emit_dir / "localization.en.json", localization["en"])


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.allow_new_client:
        source_sha256 = sha256_file(args.ipa)
    else:
        source_sha256 = assert_client_fingerprint(args.ipa, EXPECTED_101_SHA256)

    archive_index = discover_client_files(args.ipa)
    args.out.mkdir(parents=True, exist_ok=True)
    output_path = args.out / "archive-index.json"
    payload = {
        "sourceSha256": source_sha256,
        "approvedClient": source_sha256 == EXPECTED_101_SHA256,
        "archive": archive_index.to_dict(),
    }
    _write_json(output_path, payload)

    if args.emit:
        _emit_dataset(args.ipa, args.emit, source_sha256)
        print(f"canonicalData={args.emit}")
    print(f"sourceSha256={source_sha256}")
    print(f"archiveIndex={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
