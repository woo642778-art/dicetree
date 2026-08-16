from pathlib import Path
from unittest import TestCase
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rd2_extract.compact import chunk_list, chunk_mapping


class CompactTransportTests(TestCase):
    def test_chunk_list_is_stable(self):
        self.assertEqual(chunk_list([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])

    def test_chunk_mapping_sorts_keys_before_splitting(self):
        chunks = chunk_mapping({"c": 3, "a": 1, "b": 2}, 2)
        self.assertEqual(chunks, [{"a": 1, "b": 2}, {"c": 3}])

    def test_non_positive_chunk_size_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            chunk_list([1], 0)


if __name__ == "__main__":
    import unittest
    unittest.main()
