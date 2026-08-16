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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only Random Dice 2 IPA scanner")
    parser.add_argument("--ipa", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--allow-new-client",
        action="store_true",
        help="allow an unknown SHA for inspection; never changes the approved canonical hash",
    )
    return parser


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
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"sourceSha256={source_sha256}")
    print(f"archiveIndex={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
