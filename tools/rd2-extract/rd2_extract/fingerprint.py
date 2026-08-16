from pathlib import Path
import hashlib

EXPECTED_101_SHA256 = "0341bef051315f7827466d23f3e41900d06dfa3d4994c7ecc84a89f4d1e21dd8"


def sha256_file(path: Path) -> str:
    """Return the SHA-256 of a file without executing or loading it."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_client_fingerprint(path: Path, expected_sha256: str = EXPECTED_101_SHA256) -> str:
    actual = sha256_file(path)
    if actual.lower() != expected_sha256.lower():
        raise ValueError(
            "Random Dice 2 client fingerprint mismatch: "
            f"expected {expected_sha256}, got {actual}"
        )
    return actual
