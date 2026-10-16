import copy
import unittest

from route import Rect, audit, intersects, label_bays, refine_labels, separate_shared_stubs, solve


def node(identity, x, y, width=120, height=100):
    return {"id": identity, "name": identity, "x": x, "y": y,
            "width": width, "height": height}


def edge(identity, source, target, start, end, width=100):
    return {"id": identity, "sourceId": source, "targetId": target,
            "label": "Reads", "labelWidth": width, "labelHeight": 24,
            "start": {"x": start[0], "y": start[1]},
            "end": {"x": end[0], "y": end[1]}}


class RoutingTests(unittest.TestCase):
    def test_obstacle_is_bypassed_and_measured_endpoints_are_preserved(self):
        snapshot = {"viewKey": "Example", "nodes": [node("a", 0, 100), node("b", 700, 100),
                    node("obstacle", 330, 70, 150, 160)],
                    "relationships": [edge("ab", "a", "b", (120, 150), (700, 150))]}
        untouched = copy.deepcopy(snapshot)
        result = solve(snapshot)
        self.assertEqual(snapshot, untouched)
        relation = result["relationships"][0]
        self.assertEqual(relation["vertices"][0], {"x": 120, "y": 150})
        self.assertEqual(relation["vertices"][-1], {"x": 700, "y": 150})
        self.assertEqual(result["report"]["lineNodeHits"], [])
        self.assertEqual(result["report"]["unresolved"], [])
        self.assertEqual(result["report"]["movedElements"], [])

    def test_parallel_relations_keep_ids_and_separate_routes_and_labels(self):
        snapshot = {"viewKey": "Parallel", "nodes": [node("a", 0, 100), node("b", 900, 100)],
                    "relationships": [edge("first", "a", "b", (120, 150), (900, 150)),
                                      edge("second", "a", "b", (120, 150), (900, 150))]}
        result = solve(snapshot)
        self.assertEqual([r["id"] for r in result["relationships"]], ["first", "second"])
        self.assertEqual(result["report"]["labelPairOverlaps"], [])
        self.assertEqual(result["report"]["linesThroughOtherLabels"], [])
        self.assertEqual(result["report"]["coincidentLongRoutes"], [])
        self.assertEqual(result, solve(snapshot))

    def test_overlap_moves_only_colliding_node(self):
        snapshot = {"viewKey": "Overlap", "nodes": [node("a", 0, 0), node("b", 80, 20),
                    node("c", 1000, 0)], "relationships": []}
        result = solve(snapshot)
        self.assertEqual(result["report"]["movedElements"], ["b"])
        self.assertEqual(result["elements"][0], {"id": "a", "x": 0, "y": 0})
        self.assertEqual(result["elements"][2], {"id": "c", "x": 1000, "y": 0})

    def test_missing_node_fails_instead_of_dropping_edge(self):
        with self.assertRaisesRegex(ValueError, "Missing endpoint"):
            solve({"viewKey": "Invalid", "nodes": [node("a", 0, 0)],
                   "relationships": [edge("bad", "a", "b", (120, 50), (500, 50))]})

    def test_segment_audit_handles_crossing_and_boundary_touch(self):
        rect = Rect(100, 100, 100, 100)
        self.assertTrue(intersects((0, 150), (300, 150), rect))
        self.assertFalse(intersects((0, 100), (300, 100), rect))
        self.assertFalse(intersects((0, 50), (300, 50), rect))

    def test_final_pass_checks_labels_against_future_paths(self):
        routes = [
            {"id": "horizontal", "sourceId": "a", "targetId": "b",
             "path": [(100, 50), (900, 50)], "position": 50,
             "labelRect": Rect(430, 35, 140, 30)},
            {"id": "vertical", "sourceId": "c", "targetId": "d",
             "path": [(500, -400), (500, 500)], "position": 50,
             "labelRect": Rect(430, 35, 140, 30)}]
        before = audit({}, routes, 48)
        self.assertTrue(before["linesThroughOtherLabels"])
        self.assertTrue(before["labelPairOverlaps"])
        self.assertGreater(refine_labels({}, routes, 8), 0)
        after = audit({}, routes, 48)
        self.assertEqual(after["linesThroughOtherLabels"], [])
        self.assertEqual(after["labelPairOverlaps"], [])

    def test_large_label_gets_a_clear_outer_channel_without_moving_nodes(self):
        nodes = {"a": Rect(0, 0, 100, 100), "b": Rect(200, 0, 100, 100)}
        routes = [{"id": "ab", "sourceId": "a", "targetId": "b",
                   "path": [(100, 50), (200, 50)], "position": 50,
                   "labelRect": Rect(-100, 20, 500, 60)}]
        self.assertTrue(audit(nodes, routes, 48)["labelNodeOverlaps"])
        self.assertEqual(label_bays(nodes, routes, 48, 14, 38), ["ab"])
        self.assertEqual(audit(nodes, routes, 48)["unresolved"], [])
        self.assertEqual(routes[0]["path"][0], (100, 50))
        self.assertEqual(routes[0]["path"][-1], (200, 50))

    def test_tight_endpoint_corridor_reduces_margin_without_crossing_a_node(self):
        snapshot = {"viewKey": "Tight", "nodes": [node("a", 0, 0),
                    node("nearby", 0, 150), node("b", 700, 200)],
                    "relationships": [edge("ab", "a", "b", (60, 100), (700, 250))]}
        result = solve(snapshot)
        self.assertTrue(result["report"]["reducedClearance"])
        self.assertEqual(result["report"]["lineNodeHits"], [])
        self.assertEqual(result["report"]["unroutedRelationships"], [])

    def test_same_port_self_loop_is_reported_instead_of_claiming_clean_geometry(self):
        result = solve({"viewKey": "Loop", "nodes": [node("a", 0, 0)],
                        "relationships": [edge("loop", "a", "a", (120, 50), (120, 50))],
                        "options": {"outerLabelChannels": False}})
        self.assertEqual(result["report"]["selfLoopsRequiringManualPorts"], ["loop"])
        self.assertTrue(result["report"]["unresolved"])

    def test_non_finite_geometry_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Non-finite"):
            solve({"viewKey": "Invalid", "nodes": [node("a", float("nan"), 0)],
                   "relationships": []})

    def test_endpoint_turns_can_fan_out_without_moving_the_shared_port(self):
        nodes = {"a": Rect(0, 0, 100, 100), "b": Rect(500, 400, 100, 100),
                 "c": Rect(500, 700, 100, 100)}
        routes = [
            {"id": "ab", "sourceId": "a", "targetId": "b", "position": 50,
             "path": [(50, 100), (50, 180), (550, 180), (550, 400)],
             "labelRect": Rect(375, 170, 50, 20)},
            {"id": "ac", "sourceId": "a", "targetId": "c", "position": 50,
             "path": [(50, 100), (50, 180), (300, 180), (300, 700), (500, 700)],
             "labelRect": Rect(275, 490, 50, 20)}]
        self.assertTrue(audit(nodes, routes, 48)["coincidentLongRoutes"])
        self.assertTrue(separate_shared_stubs(nodes, routes, 48, 14, 120))
        self.assertEqual(audit(nodes, routes, 48)["coincidentLongRoutes"], [])
        self.assertEqual(routes[0]["path"][0], (50, 100))
        self.assertEqual(routes[1]["path"][0], (50, 100))

    def test_native_origin_is_preserved_separately_from_the_visible_bbox(self):
        snapshot = {"viewKey": "Offset", "nodes": [
            {"id": "a", "x": 120, "y": 210, "width": 100, "height": 100,
             "elementX": 100, "elementY": 200}], "relationships": []}
        result = solve(snapshot)
        self.assertEqual(result["elements"], [{"id": "a", "x": 100, "y": 200}])
        self.assertEqual(result["report"]["movedElements"], [])
        self.assertEqual(result["report"]["bounds"]["minX"], 120)

    def test_bbox_movement_is_applied_as_a_delta_to_the_native_origin(self):
        snapshot = {"viewKey": "OffsetMove", "nodes": [
            {"id": "a", "x": 120, "y": 210, "width": 100, "height": 100,
             "elementX": 100, "elementY": 200},
            {"id": "b", "x": 200, "y": 210, "width": 100, "height": 100,
             "elementX": 180, "elementY": 200}], "relationships": []}
        result = solve(snapshot)
        self.assertEqual(result["report"]["movedElements"], ["b"])
        self.assertEqual(result["elements"][1], {"id": "b", "x": 248, "y": 200})


if __name__ == "__main__":
    unittest.main()
