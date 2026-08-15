from __future__ import annotations

import base64
import io
import tarfile
from pathlib import Path

root = Path.cwd().resolve()
parts = ["payload-0.txt", "payload-1.txt", "payload-2-correct.txt", "payload-3.txt", "payload-4.txt"]
payload = "".join((root / name).read_text().strip() for name in parts)
data = base64.b64decode(payload, validate=True)

with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
    for member in archive.getmembers():
        target = (root / member.name).resolve()
        if root not in target.parents and target != root:
            raise RuntimeError(f"unsafe archive path: {member.name}")
    archive.extractall(root)

print("bootstrapped source tree")
