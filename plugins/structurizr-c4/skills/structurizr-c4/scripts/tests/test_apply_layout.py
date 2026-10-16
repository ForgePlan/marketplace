import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from apply_layout import LayoutError, apply_layout
from route import solve


def fixtures():
    model = {"people": [{"id": "a", "name": "Caller", "relationships": [
        {"id": "r", "sourceId": "a", "destinationId": "b", "description": "Calls"}]}],
        "softwareSystems": [{"id": "b", "name": "System"}]}
    workspace = {"name": "Example", "model": model, "views": {
        "dynamicViews": [{"key": "Flow", "title": "Request and response",
                          "automaticLayout": {"rankDirection": "LeftRight"},
                          "elements": [{"id": "a", "x": 0, "y": 0}, {"id": "b", "x": 300, "y": 0}],
                          "relationships": [
                              {"id": "r", "order": "2", "description": "Response", "response": True},
                              {"id": "r", "order": "1", "description": "Request", "response": False}],
                          "dimensions": {"width": 500, "height": 400}}],
        "systemContextViews": [{"key": "Untouched", "automaticLayout": {"rankDirection": "TopBottom"},
                                "elements": [{"id": "b", "x": 0, "y": 0}], "relationships": []}],
        "configuration": {"styles": {"elements": [{"tag": "Element", "color": "#ffffff"}]}}}}
    nodes = [{"id": "a", "x": 0, "y": 0, "width": 100, "height": 100},
             {"id": "b", "x": 300, "y": 0, "width": 100, "height": 100}]
    relations = [{"id": "r:1", "originalId": "r", "order": "1", "viewIndex": 1,
                  "sourceId": "a", "targetId": "b", "start": {"x": 100, "y": 50},
                  "end": {"x": 300, "y": 50}, "labelWidth": 100, "labelHeight": 20},
                 {"id": "r:2", "originalId": "r", "order": "2", "viewIndex": 0,
                  "sourceId": "a", "targetId": "b", "start": {"x": 100, "y": 50},
                  "end": {"x": 300, "y": 50}, "labelWidth": 100, "labelHeight": 20}]
    snapshot = {"viewKey": "Flow", "nodes": nodes, "relationships": relations,
                "dimensions": {"width": 450, "height": 200}}
    patch = {"viewKey": "Flow", "elements": [{"id": "a", "x": 0.1, "y": 0.1},
                                                {"id": "b", "x": 300.1, "y": 0.1}],
             "relationships": [
                 {"id": "r:2", "routing": "Direct", "position": 75, "vertices": [
                     {"x": 100.1, "y": 50.1}, {"x": 300.1, "y": 50.1}]},
                 {"id": "r:1", "routing": "Direct", "position": 25, "vertices": [
                     {"x": 100.1, "y": 50.1}, {"x": 100.1, "y": -120.1},
                     {"x": 300.1, "y": -120.1}, {"x": 300.1, "y": 50.1}]}],
             "report": {"unresolved": []}}
    return workspace, snapshot, patch


class ApplyLayoutTests(unittest.TestCase):
    def test_repeated_relationship_ids_map_by_order_and_model_is_preserved(self):
        workspace, snapshot, patch = fixtures()
        originals = copy.deepcopy((workspace, snapshot, patch))
        result, report = apply_layout(workspace, snapshot, patch)
        self.assertEqual((workspace, snapshot, patch), originals)
        self.assertEqual(result["model"], workspace["model"])
        self.assertEqual(result["views"]["systemContextViews"], workspace["views"]["systemContextViews"])
        view = result["views"]["dynamicViews"][0]
        self.assertNotIn("automaticLayout", view)
        self.assertEqual([relation["position"] for relation in view["relationships"]], [75, 25])
        self.assertEqual([relation["description"] for relation in view["relationships"]], ["Response", "Request"])
        self.assertEqual([relation["response"] for relation in view["relationships"]], [True, False])
        self.assertEqual(report["offset"], {"x": 0, "y": 170})
        self.assertGreaterEqual(report["bounds"]["minY"], 50)
        self.assertGreaterEqual(view["dimensions"]["height"], 570)
        self.assertTrue(all(isinstance(point["x"], int) and isinstance(point["y"], int)
                            for relation in view["relationships"] for point in relation["vertices"]))

    def test_order_beats_stale_view_index(self):
        workspace, snapshot, patch = fixtures()
        snapshot["relationships"][0]["viewIndex"] = 0
        result, report = apply_layout(workspace, snapshot, patch)
        self.assertEqual(result["views"]["dynamicViews"][0]["relationships"][1]["position"], 25)
        self.assertTrue(report["relationshipMapping"][0]["snapshotIndexDrift"])

    def test_verified_index_can_resolve_repeated_ids_when_order_is_absent(self):
        workspace, snapshot, patch = fixtures()
        for item in snapshot["relationships"]:
            item.pop("order")
        _, report = apply_layout(workspace, snapshot, patch)
        self.assertTrue(all(item["method"] == "verified-index" for item in report["relationshipMapping"]))

    def test_ambiguous_relationships_and_dropped_edges_fail(self):
        workspace, snapshot, patch = fixtures()
        for item in snapshot["relationships"]:
            item.pop("order")
            item.pop("viewIndex")
        with self.assertRaisesRegex(LayoutError, "Ambiguous"):
            apply_layout(workspace, snapshot, patch)
        workspace, snapshot, patch = fixtures()
        patch["relationships"].pop()
        with self.assertRaisesRegex(LayoutError, "relationship IDs differ"):
            apply_layout(workspace, snapshot, patch)

    def test_dry_run_output_and_explicit_write_with_backup(self):
        workspace, snapshot, patch = fixtures()
        script = Path(__file__).resolve().parents[1] / "apply_layout.py"
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            paths = [directory / name for name in ("workspace.json", "snapshot.json", "patch.json")]
            for path, value in zip(paths, (workspace, snapshot, patch)):
                path.write_text(json.dumps(value), encoding="utf-8")
            original = paths[0].read_bytes()
            command = [sys.executable, str(script)] + [str(path) for path in paths]
            dry = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(dry.returncode, 0, dry.stderr)
            self.assertTrue(json.loads(dry.stdout)["dryRun"])
            self.assertEqual(paths[0].read_bytes(), original)
            output = directory / "new.json"
            saved = subprocess.run(command + ["--output", str(output)], capture_output=True, text=True)
            self.assertEqual(saved.returncode, 0, saved.stderr)
            self.assertTrue(output.exists())
            self.assertEqual(paths[0].read_bytes(), original)
            rejected = subprocess.run(command + ["--output", str(paths[0])], capture_output=True, text=True)
            self.assertEqual(rejected.returncode, 2)
            written = subprocess.run(command + ["--write"], capture_output=True, text=True)
            self.assertEqual(written.returncode, 0, written.stderr)
            report = json.loads(written.stdout)
            self.assertEqual(Path(report["backup"]).read_bytes(), original)
            self.assertNotEqual(paths[0].read_bytes(), original)

    def test_stale_snapshot_endpoints_are_rejected_even_when_id_and_order_match(self):
        workspace, snapshot, patch = fixtures()
        workspace["model"]["people"][0]["relationships"][0]["destinationId"] = "a"
        original = copy.deepcopy(workspace)
        with self.assertRaisesRegex(LayoutError, "Snapshot endpoints differ"):
            apply_layout(workspace, snapshot, patch)
        self.assertEqual(workspace, original)

    def test_response_flag_does_not_invert_model_endpoints(self):
        workspace, snapshot, patch = fixtures()
        snapshot["relationships"][1]["response"] = True
        result, _ = apply_layout(workspace, snapshot, patch)
        self.assertTrue(result["views"]["dynamicViews"][0]["relationships"][0]["response"])
        snapshot["relationships"][1]["sourceId"] = "b"
        snapshot["relationships"][1]["targetId"] = "a"
        with self.assertRaisesRegex(LayoutError, "Snapshot endpoints differ"):
            apply_layout(workspace, snapshot, patch)

    def test_bbox_offset_and_native_origin_survive_solver_apply_and_canvas_shift(self):
        workspace, snapshot, _ = fixtures()
        view = workspace["views"]["dynamicViews"][0]
        view["relationships"] = [view["relationships"][1]]
        view["elements"] = [{"id": "a", "x": 100, "y": 200}, {"id": "b", "x": 400, "y": 200}]
        snapshot["nodes"] = [
            {"id": "a", "x": 120, "y": 210, "width": 100, "height": 100,
             "elementX": 100, "elementY": 200},
            {"id": "b", "x": 420, "y": 210, "width": 100, "height": 100,
             "elementX": 400, "elementY": 200}]
        relation = snapshot["relationships"][0]
        relation.update(viewIndex=0, start={"x": 220, "y": 260}, end={"x": 420, "y": 260},
                        labelWidth=80, labelHeight=20)
        snapshot["relationships"] = [relation]
        patch = solve(snapshot)
        self.assertEqual(patch["report"]["movedElements"], [])
        self.assertEqual(patch["elements"][0], {"id": "a", "x": 100, "y": 200})
        clean, clean_report = apply_layout(workspace, snapshot, patch)
        self.assertEqual(clean["views"]["dynamicViews"][0]["elements"][0]["x"], 100)
        self.assertEqual(clean_report["bounds"]["minX"], 120)
        self.assertEqual(clean_report["bounds"]["minY"], 210)
        patch["relationships"][0].update(position=50, vertices=[
            {"x": 220, "y": 260}, {"x": 268, "y": 260}, {"x": 268, "y": -40},
            {"x": 372, "y": -40}, {"x": 372, "y": 260}, {"x": 420, "y": 260}])
        result, report = apply_layout(workspace, snapshot, patch)
        self.assertEqual(report["offset"], {"x": 0, "y": 100})
        self.assertEqual(result["views"]["dynamicViews"][0]["elements"][0],
                         {"id": "a", "x": 100, "y": 300})
        self.assertEqual(report["bounds"]["minY"], 50)
        self.assertEqual(report["bounds"]["maxY"], 410)
        self.assertEqual(result["model"], workspace["model"])


if __name__ == "__main__":
    unittest.main()
