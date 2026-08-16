from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from zipfile import ZipFile
import hashlib
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rd2_extract.archive import discover_client_files
from rd2_extract.fingerprint import assert_client_fingerprint, sha256_file


class FingerprintTests(TestCase):
    def test_sha256_file(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "client.bin"
            path.write_bytes(b"rd2")
            expected = hashlib.sha256(b"rd2").hexdigest()
            self.assertEqual(sha256_file(path), expected)

    def test_rejects_mismatched_client(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "client.bin"
            path.write_bytes(b"not-approved")
            with self.assertRaisesRegex(ValueError, "fingerprint mismatch"):
                assert_client_fingerprint(path, "0" * 64)

    def test_archive_discovery_is_read_only_indexing(self):
        with TemporaryDirectory() as directory:
            ipa = Path(directory) / "client.ipa"
            with ZipFile(ipa, "w") as archive:
                archive.writestr("Payload/Game.app/Info.plist", b"plist")
                archive.writestr("Payload/Game.app/Data/Managed/Metadata/global-metadata.dat", b"meta")
                archive.writestr("Payload/Game.app/Frameworks/UnityFramework.framework/UnityFramework", b"bin")
                archive.writestr("Payload/Game.app/Data/resources.assets", b"assets")
                archive.writestr("Payload/Game.app/Data/localization_ko.json", b"{}")
            index = discover_client_files(ipa)
            self.assertEqual(len(index.global_metadata), 1)
            self.assertTrue(any("UnityFramework" in member for member in index.unity_framework))
            self.assertTrue(any("resources.assets" in member for member in index.data_assets))
            self.assertTrue(any("localization" in member for member in index.localization_candidates))


if __name__ == "__main__":
    import unittest
    unittest.main()
