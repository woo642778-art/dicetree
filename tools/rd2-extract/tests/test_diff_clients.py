from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from diff_clients import diff_canonical, diff_documents


class ClientDiffTests(TestCase):
    def test_tree_cost_change_is_reported(self):
        old = {"tree": [{"id": "n1", "costsByRank": [{"gold": 2000, "stone": 0}]}]}
        new = {"tree": [{"id": "n1", "costsByRank": [{"gold": 3000, "stone": 0}]}]}
        diff = diff_documents(old, new)
        self.assertEqual(diff["treeCosts"][0]["nodeId"], "n1")
        self.assertEqual(diff["treeCosts"][0]["old"]["costsByRank"][0]["gold"], 2000)
        self.assertEqual(diff["treeCosts"][0]["new"]["costsByRank"][0]["gold"], 3000)

    def test_record_order_does_not_create_a_diff(self):
        old = {
            "dice": [
                {"id": "b", "family": "chaos", "baseStats": {"attack": 20}},
                {"id": "a", "family": "order", "baseStats": {"attack": 10}},
            ]
        }
        new = {"dice": list(reversed(old["dice"]))}
        diff = diff_documents(old, new)
        self.assertEqual(diff["diceStats"], [])

    def test_prerequisite_order_does_not_create_a_topology_diff(self):
        old = {
            "tree": [{
                "id": "n1",
                "family": "chaos",
                "kind": "passive",
                "position": {"x": 0, "y": 0},
                "prerequisites": [
                    {"nodeId": "b", "minRank": 1},
                    {"nodeId": "a", "minRank": 1},
                ],
                "targetId": None,
                "passiveOrRuneRef": "passive:p1",
                "maxRank": 1,
                "costsByRank": [{"gold": 2000, "stone": 0}],
            }]
        }
        new = json.loads(json.dumps(old))
        new["tree"][0]["prerequisites"].reverse()
        diff = diff_documents(old, new)
        self.assertEqual(diff["treeTopology"], [])

    def test_tree_topology_and_costs_are_separate_sections(self):
        old = {
            "tree": [{
                "id": "n1",
                "family": "chaos",
                "kind": "passive",
                "position": {"x": 0, "y": 0},
                "prerequisites": [],
                "targetId": None,
                "passiveOrRuneRef": "passive:p1",
                "maxRank": 1,
                "costsByRank": [{"gold": 2000, "stone": 0}],
            }]
        }
        new = json.loads(json.dumps(old))
        new["tree"][0]["position"] = {"x": 100, "y": 0}
        diff = diff_documents(old, new)
        self.assertEqual(diff["treeCosts"], [])
        self.assertEqual(diff["treeTopology"][0]["nodeId"], "n1")

    def test_checked_in_compact_layout_can_be_loaded_and_diffed(self):
        with TemporaryDirectory() as root:
            old_dir = Path(root) / "old"
            new_dir = Path(root) / "new"
            for directory, attack in ((old_dir, 100), (new_dir, 120)):
                directory.mkdir()
                (directory / "manifest.json").write_text('{"schemaVersion":3}', encoding="utf-8")
                dice = [[
                    "predator", 50, "chaos", "dice_predator_name", "dice_predator_desc",
                    attack, 2.7, 1.2, 100,
                    0, 0.05, None,
                    0, None, -0.08, 0,
                    "predator", "Predator", "Predator", "RangeFront", "Bullet", None,
                ]]
                (directory / "dice.compact.json").write_text(json.dumps(dice), encoding="utf-8")
                (directory / "tree.compact.01.json").write_text("[]", encoding="utf-8")
                (directory / "passives.compact.01.json").write_text("[]", encoding="utf-8")
                (directory / "runes.compact.01.json").write_text("[]", encoding="utf-8")
                (directory / "localization.compact.01.json").write_text("{}", encoding="utf-8")
                (directory / "enemies.json").write_text("[]", encoding="utf-8")
                (directory / "mechanic-evidence.json").write_text("[]", encoding="utf-8")
            diff = diff_canonical(old_dir, new_dir)
            self.assertEqual(diff["diceStats"][0]["diceId"], "predator")
            self.assertEqual(diff["diceStats"][0]["old"]["baseStats"]["attack"], 100)
            self.assertEqual(diff["diceStats"][0]["new"]["baseStats"]["attack"], 120)


if __name__ == "__main__":
    import unittest
    unittest.main()
