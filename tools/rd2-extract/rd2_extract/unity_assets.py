from __future__ import annotations

from pathlib import Path
from zipfile import ZipFile
import csv
import io


def read_member(ipa_path: Path, suffix: str) -> bytes:
    """Read one archive member by suffix without extracting it to disk."""
    with ZipFile(ipa_path) as archive:
        matches = [name for name in archive.namelist() if name.endswith(suffix)]
        if len(matches) != 1:
            raise ValueError(f"Expected one IPA member ending with {suffix!r}, found {len(matches)}")
        return archive.read(matches[0])


def find_text_asset(asset_bytes: bytes, asset_name: str) -> str:
    """Recover a Unity TextAsset payload using its serialized name + length layout.

    Random Dice 2 TextAssets store the UTF-8 text after an aligned asset name and
    a little-endian payload length. Multiple occurrences can exist (for example a
    catalog entry and the actual TextAsset); the largest valid text candidate wins.
    """
    needle = asset_name.encode("utf-8")
    candidates: list[str] = []
    cursor = 0
    while True:
        index = asset_bytes.find(needle, cursor)
        if index < 0:
            break
        after_name = index + len(needle)
        aligned = after_name + ((-after_name) % 4)
        if aligned + 4 <= len(asset_bytes):
            length = int.from_bytes(asset_bytes[aligned : aligned + 4], "little")
            end = aligned + 4 + length
            if 0 < length < 5_000_000 and end <= len(asset_bytes):
                raw = asset_bytes[aligned + 4 : end]
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = ""
                if "\n" in text and "," in text:
                    candidates.append(text)
        cursor = index + 1
    if not candidates:
        raise ValueError(f"TextAsset {asset_name!r} was not found or was not valid UTF-8 text")
    return max(candidates, key=len)


def parse_table_text(text: str) -> list[dict[str, str]]:
    """Parse a Random Dice 2 table TextAsset while preserving raw string values."""
    lines = text.splitlines()
    header_index: int | None = None
    for index in range(len(lines) - 1):
        if "," in lines[index] and lines[index + 1].startswith("Key<"):
            header_index = index
            break
    if header_index is None:
        raise ValueError("TextAsset does not contain a typed table header")

    header = next(csv.reader([lines[header_index]]))
    records: list[dict[str, str]] = []
    for line in lines[header_index + 2 :]:
        row = next(csv.reader([line]))
        if len(row) != len(header):
            break
        records.append(dict(zip(header, row)))
    return records


def parse_localization_text(text: str) -> dict[str, dict[str, str]]:
    rows = csv.reader(io.StringIO(text))
    output: dict[str, dict[str, str]] = {}
    for row in rows:
        if len(row) < 3 or not row[0]:
            continue
        output[row[0]] = {"ko": row[1], "en": row[2]}
    return output
