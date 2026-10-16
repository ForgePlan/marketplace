#!/usr/bin/env python3
"""Generic contract tests for native Structurizr SVG geometry extraction.

Run with ``python3 -m unittest discover -s tooling -p test_extract_native_svg.py``.
All fixtures are synthetic and contain no project architecture or user data.
"""
import copy
import html
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


_SPEC = importlib.util.spec_from_file_location(
    "native_svg_under_test", Path(__file__).parents[1] / "extract_native_svg.py")
native = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(native)


def workspace(elements=None, relationships=None, view_relationships=None,
              view_elements=None):
    elements = elements or [
        {"id": "A", "name": "Alpha"},
        {"id": "B", "name": "Beta"},
    ]
    relationships = relationships or [
        {"id": "R", "sourceId": "A", "destinationId": "B", "description": "Calls"},
    ]
    model = {"softwareSystems": copy.deepcopy(elements)}
    model["softwareSystems"][0]["relationships"] = copy.deepcopy(relationships)
    return {"model": model, "views": {"systemContextViews": [{
        "key": "Example", "elements": view_elements or [{"id": e["id"]} for e in elements],
        "relationships": view_relationships or [{"id": r["id"]} for r in relationships],
    }]}}


def node(identifier, name, x, y, width=100, height=80, local_x=0, local_y=0):
    return ('<g id="j_%s" transform="translate(%s,%s)"><g>'
            '<rect x="%s" y="%s" width="%s" height="%s" fill="#ffffff"/>'
            '</g><text font-weight="bold">%s</text></g>') % (
                identifier, x, y, local_x, local_y, width, height, html.escape(name))


def link(identifier="R", label="Calls", path="M 100 40 L 300 40",
         label_x=170, label_y=0, label_width=60, label_height=20,
         transform="", extra_label=""):
    transform_attr = (' transform="' + transform + '"') if transform else ""
    return ('<g id="j_link_%s"%s><path joint-selector="line" d="%s"/>'
            '<g label-idx="0" transform="translate(%s,%s)">'
            '<rect x="0" y="0" width="%s" height="%s"/>'
            '<text>%s</text></g>%s</g>') % (
                identifier, transform_attr, path, label_x, label_y, label_width,
                label_height, html.escape(label), extra_label)


def svg(*groups):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">'
            + ''.join(groups) + '</svg>')


class NativeSvgContractTests(unittest.TestCase):
    def extract(self, data=None, image=None):
        with tempfile.TemporaryDirectory(prefix="native-svg-contract-") as directory:
            root = Path(directory)
            (root / "workspace.json").write_text(json.dumps(data or workspace()))
            (root / "view.svg").write_text(image or svg(
                node("A", "Alpha", 0, 0), node("B", "Beta", 300, 0), link()))
            return native.extract(root / "workspace.json", root / "view.svg", "Example")

    def test_straight_and_orthogonal_paths_retain_endpoints(self):
        self.assertEqual(native.path_points("M 1e1,-2 L 20 30 L 40 30"),
                         [(10.0, -2.0), (20.0, 30.0), (40.0, 30.0)])

    def test_cubic_curve_has_expected_midpoint_and_endpoint(self):
        points = native.path_points("M 0 0 C 0 100 100 100 100 0")
        self.assertEqual(points[0], (0.0, 0.0))
        self.assertEqual(points[-1], (100.0, 0.0))
        self.assertTrue(any(abs(x - 50) < 1e-6 and abs(y - 75) < 1e-6 for x, y in points))
        self.assertTrue(native.line_hits(points, {"x": 45, "y": 70, "width": 10, "height": 10}))
        self.assertFalse(native.line_hits(points, {"x": 45, "y": -10, "width": 10, "height": 10}))

    def test_unsupported_path_command_fails(self):
        with self.assertRaises(ValueError):
            native.path_points("M 0 0 Q 50 50 100 0")

    def test_malformed_path_fails_instead_of_creating_partial_point(self):
        for path in ("M 0 0 L 10", "M 0 0 C 10 20 30", "M 0 0 L NaN 30"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                native.path_points(path)

    def test_baseline_maps_all_elements_and_links_with_no_collisions(self):
        result = self.extract()
        self.assertEqual({n["id"] for n in result["nodes"]}, {"A", "B"})
        self.assertEqual(result["relationships"][0]["id"], "R")
        self.assertEqual(result["relationships"][0]["sourceId"], "A")
        self.assertEqual(result["relationships"][0]["targetId"], "B")
        self.assertEqual(result["missingElements"], [])
        self.assertTrue(all(count == 0 for count in result["audit"]["counts"].values()))

    def test_node_bounds_include_local_positive_and_negative_offsets(self):
        for x, y in ((10, 15), (-10, -15)):
            with self.subTest(offset=(x, y)):
                result = self.extract(image=svg(
                    node("A", "Alpha", 100, 200, 90, 50, x, y),
                    node("B", "Beta", 400, 200),
                    link(path="M 200 240 L 400 240", label_x=260, label_y=200)))
                alpha = next(n for n in result["nodes"] if n["id"] == "A")
                self.assertEqual((alpha["x"], alpha["y"], alpha["width"], alpha["height"]),
                                 (100 + x, 200 + y, 90, 50))

    def test_native_cylinder_bounds_include_cap_above_invisible_body_rect(self):
        cylinder = ('<g id="j_A" transform="translate(100,200)"><g>'
            '<path fill="#fff" d="M 0,10 a 50,10 0,0,0 100 0 a 50,10 0,0,0 -100 0 '
            'l 0,60 a 50,10 0,0,0 100 0 l 0,-60"/>'
            '<rect fill="none" x="0" y="10" width="100" height="70"/>'
            '</g><text font-weight="bold">Alpha</text></g>')
        result = self.extract(image=svg(cylinder, node("B", "Beta", 400, 200),
            link(path="M 200 240 L 400 240", label_x=260, label_y=200)))
        alpha = next(n for n in result["nodes"] if n["id"] == "A")
        self.assertEqual((alpha["x"], alpha["y"], alpha["width"], alpha["height"]),
                         (100, 200, 100, 80))
        self.assertEqual((alpha["elementX"], alpha["elementY"]), (100, 200))

    def test_label_rectangles_keep_translated_and_matrix_bounds(self):
        extra = ('<g label-idx="2" transform="matrix(0,1,-1,0,260,50)">'
                 '<rect x="0" y="0" width="20" height="10"/><text>HTTP</text></g>')
        result = self.extract(image=svg(node("A", "Alpha", 0, 0),
            node("B", "Beta", 300, 0), link(label_x=170, label_y=-30, extra_label=extra)))
        rel = result["relationships"][0]
        self.assertEqual(rel["labelRects"], [
            {"x": 170, "y": -30, "width": 60, "height": 20},
            {"x": 250, "y": 50, "width": 10, "height": 20},
        ])
        self.assertEqual((rel["labelWidth"], rel["labelHeight"]), (90, 100))

    def test_duplicate_descriptions_map_by_both_endpoints_not_svg_order(self):
        data = workspace(elements=[{"id": "A", "name": "Alpha"},
            {"id": "B", "name": "Beta"}, {"id": "C", "name": "Gamma"}], relationships=[
            {"id": "R1", "sourceId": "A", "destinationId": "B", "description": "Calls"},
            {"id": "R2", "sourceId": "A", "destinationId": "C", "description": "Calls"},
        ])
        result = self.extract(data, svg(node("A", "Alpha", 0, 0),
            node("B", "Beta", 300, 0), node("C", "Gamma", 0, 300),
            link("second", path="M 50 80 L 50 300", label_x=80, label_y=160),
            link("first")))
        self.assertEqual([r["id"] for r in result["relationships"]], ["R2", "R1"])

    def test_dynamic_repeated_relationship_id_is_disambiguated_by_order(self):
        data = workspace(view_relationships=[{"id": "R", "order": "1"},
                                             {"id": "R", "order": "2"}])
        result = self.extract(data, svg(node("A", "Alpha", 0, 0),
            node("B", "Beta", 300, 0), link("second", "2: Calls"),
            link("first", "1: Calls", path="M 100 60 L 300 60", label_y=90)))
        self.assertEqual([r["id"] for r in result["relationships"]], ["R:2", "R:1"])
        self.assertEqual([r["originalId"] for r in result["relationships"]], ["R", "R"])

    def test_boundary_is_not_treated_as_runtime_obstacle(self):
        data = workspace()
        data["model"]["deploymentNodes"] = [{"id": "ZONE", "name": "Zone", "children": []}]
        data["views"]["systemContextViews"][0]["elements"].append({"id": "ZONE"})
        result = self.extract(data, svg(node("ZONE", "Zone", -50, -50, 500, 250),
            node("A", "Alpha", 0, 0), node("B", "Beta", 300, 0), link()))
        self.assertEqual(result["ignoredBoundaries"], ["ZONE"])
        self.assertEqual(len(result["nodes"]), 2)
        self.assertEqual(result["audit"]["counts"]["lineNode"], 0)

    def test_unmatched_relationship_label_fails(self):
        with self.assertRaisesRegex(ValueError, "[Uu]nmatched|ambiguous"):
            self.extract(image=svg(node("A", "Alpha", 0, 0),
                node("B", "Beta", 300, 0), link(label="Unknown operation")))

    def test_missing_rendered_relationship_fails(self):
        with self.assertRaisesRegex(ValueError, "relationship"):
            self.extract(image=svg(node("A", "Alpha", 0, 0), node("B", "Beta", 300, 0)))

    def test_missing_isolated_runtime_element_cannot_report_green(self):
        data = workspace(elements=[{"id": "A", "name": "Alpha"},
            {"id": "B", "name": "Beta"}, {"id": "C", "name": "Gamma"}])
        with self.assertRaisesRegex(ValueError, "[Mm]issing|element|node"):
            self.extract(data)

    def test_relationship_group_transform_is_applied_or_explicitly_rejected(self):
        image = svg(node("A", "Alpha", 100, 0), node("B", "Beta", 400, 0),
                    link(path="M 100 40 L 300 40", transform="translate(100,0)"))
        try:
            result = self.extract(image=image)
        except ValueError:
            return  # A strict unsupported-transform error is a valid fail-closed contract.
        self.assertEqual(result["relationships"][0]["start"], {"x": 200, "y": 40})
        self.assertEqual(result["relationships"][0]["end"], {"x": 400, "y": 40})

    def test_audit_detects_foreign_node_and_label_collisions(self):
        data = workspace(elements=[{"id": "A", "name": "Alpha"},
            {"id": "B", "name": "Beta"}, {"id": "C", "name": "Gamma"}], relationships=[
            {"id": "R1", "sourceId": "A", "destinationId": "B", "description": "Calls"},
            {"id": "R2", "sourceId": "C", "destinationId": "B", "description": "Reports"},
        ])
        result = self.extract(data, svg(node("A", "Alpha", 0, 0),
            node("B", "Beta", 300, 0), node("C", "Gamma", 160, 0),
            link("R1", "Calls", label_x=175, label_y=30),
            link("R2", "Reports", path="M 260 40 L 300 40", label_x=180, label_y=30)))
        audit = result["audit"]
        self.assertIn(["R1", "C"], audit["lineNode"])
        self.assertIn(["R1", "C"], audit["labelNode"])
        self.assertIn(["R1", "R2"], audit["labelLabel"])
        self.assertIn(["R1", "R2"], audit["lineLabel"])

    def test_shared_endpoint_and_edge_touch_are_not_foreign_node_hits(self):
        result = self.extract()
        self.assertEqual(result["audit"]["lineNode"], [])
        rect = {"x": 0, "y": 0, "width": 100, "height": 80}
        self.assertFalse(native.segment_hits((-20, 0), (120, 0), rect))
        self.assertTrue(native.segment_hits((-20, 40), (120, 40), rect))


if __name__ == "__main__":
    unittest.main()
