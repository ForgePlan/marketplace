#!/usr/bin/env python3
"""Deterministic, offline Structurizr manual-layout patch generator."""

import argparse
import heapq
import json
import math
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

Point = Tuple[float, float]
EPS = 0.01


@dataclass(frozen=True)
class Rect:
    x: float
    y: float
    w: float
    h: float

    def grow(self, value: float) -> "Rect":
        return Rect(self.x - value, self.y - value,
                    self.w + 2 * value, self.h + 2 * value)

    def contains(self, p: Point) -> bool:
        return (self.x + EPS < p[0] < self.x + self.w - EPS
                and self.y + EPS < p[1] < self.y + self.h - EPS)

    def overlaps(self, other: "Rect") -> bool:
        return (min(self.x + self.w, other.x + other.w) - max(self.x, other.x) > EPS
                and min(self.y + self.h, other.y + other.h) - max(self.y, other.y) > EPS)


def intersects(a: Point, b: Point, rect: Rect) -> bool:
    """Open-interior segment/rectangle test; touching the boundary is allowed."""
    lo, hi = 0.0, 1.0
    for start, end, lower, upper in (
            (a[0], b[0], rect.x + EPS, rect.x + rect.w - EPS),
            (a[1], b[1], rect.y + EPS, rect.y + rect.h - EPS)):
        delta = end - start
        if abs(delta) < EPS:
            if start <= lower or start >= upper:
                return False
        else:
            p, q = (lower - start) / delta, (upper - start) / delta
            lo, hi = max(lo, min(p, q)), min(hi, max(p, q))
            if lo >= hi - 1e-9:
                return False
    return hi > lo + 1e-9


def length(a: Point, b: Point) -> float:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def segments(path: Sequence[Point]):
    return zip(path, path[1:])


def simplify(path: Sequence[Point]) -> List[Point]:
    result = []
    for p in path:
        if result and length(result[-1], p) < EPS:
            continue
        if len(result) >= 2:
            a, b = result[-2:]
            if ((abs(a[0] - b[0]) < EPS and abs(b[0] - p[0]) < EPS)
                    or (abs(a[1] - b[1]) < EPS and abs(b[1] - p[1]) < EPS)):
                # Only remove a point when travel continues in the same direction.
                if ((b[0] - a[0]) * (p[0] - b[0])
                        + (b[1] - a[1]) * (p[1] - b[1])) >= 0:
                    result.pop()
        result.append(p)
    return result


def shared_length(a: Point, b: Point, c: Point, d: Point) -> float:
    if abs(a[0] - b[0]) < EPS and abs(c[0] - d[0]) < EPS and abs(a[0] - c[0]) < EPS:
        return max(0.0, min(max(a[1], b[1]), max(c[1], d[1]))
                   - max(min(a[1], b[1]), min(c[1], d[1])))
    if abs(a[1] - b[1]) < EPS and abs(c[1] - d[1]) < EPS and abs(a[1] - c[1]) < EPS:
        return max(0.0, min(max(a[0], b[0]), max(c[0], d[0]))
                   - max(min(a[0], b[0]), min(c[0], d[0])))
    return 0.0


def crosses(a: Point, b: Point, c: Point, d: Point) -> bool:
    if abs(a[1] - b[1]) < EPS and abs(c[0] - d[0]) < EPS:
        return (min(a[0], b[0]) + EPS < c[0] < max(a[0], b[0]) - EPS
                and min(c[1], d[1]) + EPS < a[1] < max(c[1], d[1]) - EPS)
    if abs(a[0] - b[0]) < EPS and abs(c[1] - d[1]) < EPS:
        return crosses(c, d, a, b)
    return False


def port(rect: Rect, toward: Rect) -> Point:
    cx, cy = rect.x + rect.w / 2, rect.y + rect.h / 2
    dx, dy = toward.x + toward.w / 2 - cx, toward.y + toward.h / 2 - cy
    if abs(dx) + abs(dy) < EPS:
        return rect.x + rect.w, cy
    scale = min(rect.w / (2 * abs(dx)) if abs(dx) > EPS else float("inf"),
                rect.h / (2 * abs(dy)) if abs(dy) > EPS else float("inf"))
    return cx + dx * scale, cy + dy * scale


def outward(point: Point, rect: Rect, clearance: float) -> Point:
    distances = [abs(point[0] - rect.x), abs(point[0] - rect.x - rect.w),
                 abs(point[1] - rect.y), abs(point[1] - rect.y - rect.h)]
    side = min(range(4), key=lambda i: (distances[i], i))
    if side == 0:
        return rect.x - clearance, point[1]
    if side == 1:
        return rect.x + rect.w + clearance, point[1]
    if side == 2:
        return point[0], rect.y - clearance
    return point[0], rect.y + rect.h + clearance


def route_grid(start: Point, end: Point, obstacles: Sequence[Rect],
               previous: Sequence[Sequence[Point]], lane: float,
               max_states: int = 200000) -> Optional[List[Point]]:
    """Search adjacent free vertices of a sparse rectilinear coordinate grid."""
    xs, ys = {start[0], end[0]}, {start[1], end[1]}
    for rect in obstacles:
        xs.update((rect.x, rect.x + rect.w))
        ys.update((rect.y, rect.y + rect.h))
    # Parallel lanes let A* avoid reusing an earlier channel.
    for path in previous:
        for a, b in segments(path):
            if abs(a[0] - b[0]) < EPS:
                xs.update((a[0] - lane, a[0] + lane))
            if abs(a[1] - b[1]) < EPS:
                ys.update((a[1] - lane, a[1] + lane))
    xs.update((min(xs) - 2 * lane, max(xs) + 2 * lane))
    ys.update((min(ys) - 2 * lane, max(ys) + 2 * lane))
    xs, ys = sorted(xs), sorted(ys)
    xi, yi = {x: i for i, x in enumerate(xs)}, {y: i for i, y in enumerate(ys)}
    initial = xi[start[0]], yi[start[1]], 0
    target = xi[end[0]], yi[end[1]]
    distances, parent, cache = {initial: 0.0}, {}, {}
    heap = [(length(start, end), 0.0, initial)]
    prior_segments = [segment for path in previous for segment in segments(path)]
    visited = 0
    while heap:
        _, cost, state = heapq.heappop(heap)
        if cost != distances.get(state):
            continue
        visited += 1
        if visited > max_states:
            return None
        ix, iy, direction = state
        if (ix, iy) == target:
            path = [(xs[ix], ys[iy])]
            while state in parent:
                state = parent[state]
                path.append((xs[state[0]], ys[state[1]]))
            return simplify(list(reversed(path)))
        here = xs[ix], ys[iy]
        for nx, ny, nd in ((ix - 1, iy, 1), (ix + 1, iy, 1),
                           (ix, iy - 1, 2), (ix, iy + 1, 2)):
            if not (0 <= nx < len(xs) and 0 <= ny < len(ys)):
                continue
            there = xs[nx], ys[ny]
            edge = tuple(sorted((here, there)))
            if edge not in cache:
                if any(intersects(here, there, r) for r in obstacles):
                    cache[edge] = None
                else:
                    overlap = sum(shared_length(here, there, a, b) for a, b in prior_segments)
                    crossing = sum(crosses(here, there, a, b) for a, b in prior_segments)
                    cache[edge] = length(here, there) + overlap * 25 + crossing * lane * 2
            edge_cost = cache[edge]
            if edge_cost is None:
                continue
            candidate = cost + edge_cost + (lane * 1.4 if direction and direction != nd else 0)
            nxt = nx, ny, nd
            if candidate + EPS < distances.get(nxt, float("inf")):
                distances[nxt], parent[nxt] = candidate, state
                heapq.heappush(heap, (candidate + length(there, end), candidate, nxt))
    return None


def at_position(path: Sequence[Point], percent: int) -> Tuple[Point, int, float]:
    lengths = [length(a, b) for a, b in segments(path)]
    distance = sum(lengths) * percent / 100
    for i, amount in enumerate(lengths):
        if distance <= amount or i == len(lengths) - 1:
            fraction = min(1.0, max(0.0, distance / amount)) if amount else 0
            a, b = path[i], path[i + 1]
            return ((a[0] + (b[0] - a[0]) * fraction,
                     a[1] + (b[1] - a[1]) * fraction), i, amount)
        distance -= amount
    return path[0], 0, 0


def place_label(path: Sequence[Point], width: float, height: float,
                nodes: Sequence[Rect], labels: Sequence[Rect],
                previous: Sequence[Sequence[Point]], padding: float,
                hard_nodes: Optional[Sequence[Rect]] = None) -> Tuple[int, Rect, int]:
    best = None
    for percent in range(2, 99):
        point, segment, segment_length = at_position(path, percent)
        rect = Rect(point[0] - width / 2, point[1] - height / 2, width, height)
        padded = rect.grow(padding)
        conflicts = sum(padded.overlaps(other) for other in nodes)
        conflicts += sum(padded.overlaps(other) for other in labels)
        conflicts += sum(any(intersects(a, b, padded) for a, b in segments(other)) for other in previous)
        hard_conflicts = sum(rect.overlaps(other) for other in
                             (hard_nodes if hard_nodes is not None else nodes))
        hard_conflicts += sum(rect.overlaps(other) for other in labels)
        hard_conflicts += sum(any(intersects(a, b, rect) for a, b in segments(other))
                              for other in previous)
        a, b = path[segment], path[segment + 1]
        horizontal = abs(a[1] - b[1]) < EPS
        required = width if horizontal else height
        edge_distance = min(length(a, point), length(point, b))
        # A clean middle of a sufficiently long straight segment wins.
        cramped = max(0.0, required / 2 + padding - edge_distance)
        score = (hard_conflicts, conflicts, cramped, 0 if horizontal else 1,
                 abs(percent - 50), percent)
        if best is None or score < best[0]:
            best = score, percent, rect, conflicts
    return best[1], best[2], best[3]


def refine_labels(nodes: Dict[str, Rect], routes: List[dict], padding: float,
                  passes: int = 4, hard_nodes: Optional[Sequence[Rect]] = None) -> int:
    """Reconsider every label against the complete, fixed set of edge paths."""
    changes = 0
    for _ in range(passes):
        changed = False
        ordered = sorted(routes, key=lambda item: (-item["labelRect"].w, str(item["id"])))
        for item in ordered:
            others = [other for other in routes if other is not item]
            rect = item["labelRect"]
            position, candidate, _ = place_label(
                item["path"], rect.w, rect.h, list(nodes.values()),
                [other["labelRect"] for other in others],
                [other["path"] for other in others], padding, hard_nodes=hard_nodes)
            if position != item["position"]:
                item["position"], item["labelRect"] = position, candidate
                changed = True
                changes += 1
        if not changed:
            break
    return changes


def audit(nodes: Dict[str, Rect], routes: Sequence[dict], clearance: float) -> dict:
    node_hits, label_nodes, label_pairs, label_lines, shared, crossings = [], [], [], [], [], []
    for item in routes:
        for node_id, rect in nodes.items():
            if node_id not in (item["sourceId"], item["targetId"]):
                if any(intersects(a, b, rect) for a, b in segments(item["path"])):
                    node_hits.append({"relationship": item["id"], "node": node_id})
            if item["labelRect"].overlaps(rect):
                label_nodes.append({"relationship": item["id"], "node": node_id})
    for i, first in enumerate(routes):
        for second in routes[i + 1:]:
            pair = [first["id"], second["id"]]
            if first["labelRect"].overlaps(second["labelRect"]):
                label_pairs.append(pair)
            for a, b in ((first, second), (second, first)):
                if any(intersects(p, q, b["labelRect"]) for p, q in segments(a["path"])):
                    label_lines.append({"line": a["id"], "label": b["id"]})
            shared_endpoint = bool({first["sourceId"], first["targetId"]}
                                   & {second["sourceId"], second["targetId"]})
            coincident = sum(shared_length(a, b, c, d)
                             for a, b in segments(first["path"])
                             for c, d in segments(second["path"]))
            if coincident > (2.1 * clearance if shared_endpoint else max(12.0, clearance / 2)):
                shared.append({"relationships": pair, "length": round(coincident, 2)})
            if any(crosses(a, b, c, d) for a, b in segments(first["path"])
                   for c, d in segments(second["path"])):
                crossings.append(pair)
    unresolved = []
    for name, values in (("lineNodeHits", node_hits), ("labelNodeOverlaps", label_nodes),
                         ("labelPairOverlaps", label_pairs), ("linesThroughOtherLabels", label_lines),
                         ("coincidentLongRoutes", shared)):
        if values:
            unresolved.append({"kind": name, "count": len(values)})
    return {"lineNodeHits": node_hits, "labelNodeOverlaps": label_nodes,
            "labelPairOverlaps": label_pairs, "linesThroughOtherLabels": label_lines,
            "coincidentLongRoutes": shared, "lineCrossings": crossings, "unresolved": unresolved}


def _label_bay_pass(nodes: Dict[str, Rect], routes: List[dict], clearance: float,
                    padding: float, lane: float) -> List[str]:
    """Give a still-obstructed label an outside horizontal channel, if feasible."""
    bayed = []
    for item in routes:
        current = audit(nodes, routes, clearance)
        problematic = {hit["relationship"] for hit in current["labelNodeOverlaps"]}
        problematic.update(hit["label"] for hit in current["linesThroughOtherLabels"])
        problematic.update(pair[1] for pair in current["labelPairOverlaps"])
        if item["id"] not in problematic:
            continue
        others = [other for other in routes if other is not item]
        old = item["labelRect"]
        span = max(old.w + 2 * padding + 6 * lane, 350.0)
        min_y = min([rect.y for rect in nodes.values()]
                    + [p[1] for route in routes for p in route["path"]]
                    + [route["labelRect"].y for route in routes])
        max_y = max([rect.y + rect.h for rect in nodes.values()]
                    + [p[1] for route in routes for p in route["path"]]
                    + [route["labelRect"].y + route["labelRect"].h for route in routes])
        start, end = item["path"][0], item["path"][-1]
        center_x = (start[0] + end[0]) / 2
        success = False
        for side in (-1, 1):
            bay_y = (min_y - old.h - padding - 2 * lane if side < 0
                     else max_y + old.h + padding + 2 * lane)
            left, right = center_x - span / 2, center_x + span / 2
            first, last = ((left, bay_y), (right, bay_y)) if start[0] <= end[0] else (
                (right, bay_y), (left, bay_y))
            # Connections may touch the sides but cannot enter the own-label corridor.
            corridor = Rect(left, bay_y - old.h / 2 - padding, span, old.h + 2 * padding)
            for margin in (clearance, clearance / 2, clearance / 4, min(4.0, clearance / 8)):
                source_stub = outward(start, nodes[item["sourceId"]], margin)
                target_stub = outward(end, nodes[item["targetId"]], margin)
                obstacles = [rect.grow(margin) for rect in nodes.values()]
                obstacles += [other["labelRect"].grow(padding) for other in others]
                obstacles.append(corridor)
                previous = [other["path"] for other in others]
                first_leg = route_grid(source_stub, first, obstacles, previous, lane)
                if first_leg is None:
                    continue
                last_leg = route_grid(last, target_stub, obstacles, previous + [first_leg], lane)
                if last_leg is None:
                    continue
                path = simplify([start] + first_leg + [last] + last_leg[1:] + [end])
                position, rect, _ = place_label(
                    path, old.w, old.h, list(nodes.values()),
                    [other["labelRect"] for other in others], previous, padding)
                candidate = dict(item, path=path, position=position, labelRect=rect)
                check = audit(nodes, others + [candidate], clearance)
                bad = any(hit["relationship"] == item["id"] for hit in check["labelNodeOverlaps"])
                bad |= any(item["id"] in pair for pair in check["labelPairOverlaps"])
                bad |= any(hit["label"] == item["id"] for hit in check["linesThroughOtherLabels"])
                bad |= any(hit["relationship"] == item["id"] for hit in check["lineNodeHits"])
                if not bad:
                    item.update(candidate)
                    bayed.append(item["id"])
                    success = True
                    break
            if success:
                break
    return bayed


def label_bays(nodes: Dict[str, Rect], routes: List[dict], clearance: float,
               padding: float, lane: float) -> List[str]:
    bayed = []
    for _ in range(3):
        changed = _label_bay_pass(nodes, routes, clearance, padding, lane)
        bayed.extend(changed)
        if not changed:
            break
    return list(dict.fromkeys(bayed))


def separate_shared_stubs(nodes: Dict[str, Rect], routes: List[dict], clearance: float,
                          padding: float, lane: float) -> List[str]:
    """Fan nearby endpoint turns out when long portions still coincide."""
    changed = []
    for _ in range(3):
        current = audit(nodes, routes, clearance)
        ids = {identity for hit in current["coincidentLongRoutes"] for identity in hit["relationships"]}
        if not ids:
            break
        improved = False
        initial_length = sum(hit["length"] for hit in current["coincidentLongRoutes"])
        for item in routes:
            if item["id"] not in ids or len(item["path"]) < 4:
                continue
            others = [other for other in routes if other is not item]
            best = None
            for reverse in (False, True):
                base = list(reversed(item["path"])) if reverse else list(item["path"])
                for delta in (-12.0, 12.0, -24.0, 24.0, -36.0, 36.0):
                    path = list(base)
                    p, a, b = path[:3]
                    if abs(p[0] - a[0]) < EPS and abs(a[1] - b[1]) < EPS:
                        path[1], path[2] = (a[0], a[1] + delta), (b[0], b[1] + delta)
                    elif abs(p[1] - a[1]) < EPS and abs(a[0] - b[0]) < EPS:
                        path[1], path[2] = (a[0] + delta, a[1]), (b[0] + delta, b[1])
                    else:
                        continue
                    if reverse:
                        path.reverse()
                    # Preserve measured ports and reject travel back through own boxes.
                    if any(intersects(a, b, nodes[item["sourceId"]]) for a, b in segments(path[1:])):
                        continue
                    if any(intersects(a, b, nodes[item["targetId"]]) for a, b in segments(path[:-1])):
                        continue
                    rect = item["labelRect"]
                    position, label, _ = place_label(
                        path, rect.w, rect.h, list(nodes.values()),
                        [other["labelRect"] for other in others],
                        [other["path"] for other in others], padding)
                    candidate = dict(item, path=path, position=position, labelRect=label)
                    check = audit(nodes, others + [candidate], clearance)
                    if any(len(check[key]) > len(current[key]) for key in
                           ("lineNodeHits", "labelNodeOverlaps", "labelPairOverlaps", "linesThroughOtherLabels")):
                        continue
                    coincident = sum(hit["length"] for hit in check["coincidentLongRoutes"])
                    score = (coincident, len(check["lineCrossings"]), abs(delta))
                    if coincident < initial_length - EPS and (best is None or score < best[0]):
                        best = score, candidate
            if best is not None:
                item.update(best[1])
                changed.append(item["id"])
                improved = True
                break
        if not improved:
            break
    return list(dict.fromkeys(changed))


def solve(snapshot: dict) -> dict:
    options = snapshot.get("options", {})
    clearance = float(options.get("clearance", 48))
    padding = float(options.get("labelPadding", 14))
    lane = float(options.get("laneSeparation", 38))
    if not all(math.isfinite(value) for value in (clearance, padding, lane)) or min(clearance, padding, lane) <= 0:
        raise ValueError("clearance, labelPadding and laneSeparation must be positive")
    nodes, offsets, moved, element_origins = {}, {}, [], {}
    for item in snapshot["nodes"]:
        node_id = str(item["id"])
        if node_id in nodes:
            raise ValueError("Duplicate node ID: " + node_id)
        rect = Rect(*(float(item[k]) for k in ("x", "y", "width", "height")))
        element_origins[node_id] = (float(item.get("elementX", item["x"])),
                                    float(item.get("elementY", item["y"])))
        if not all(math.isfinite(value) for value in (rect.x, rect.y, rect.w, rect.h)):
            raise ValueError("Non-finite node geometry: " + node_id)
        if not all(math.isfinite(value) for value in element_origins[node_id]):
            raise ValueError("Non-finite element origin: " + node_id)
        if rect.w <= 0 or rect.h <= 0:
            raise ValueError("Non-positive node dimensions: " + node_id)
        original = rect
        for _ in range(len(nodes) + 1):
            collisions = [other for other in nodes.values() if rect.overlaps(other)]
            if not collisions:
                break
            rect = Rect(max(other.x + other.w for other in collisions) + clearance,
                        rect.y, rect.w, rect.h)
        nodes[node_id], offsets[node_id] = rect, (rect.x - original.x, rect.y - original.y)
        if rect != original:
            moved.append(node_id)
    relations = snapshot["relationships"]
    relation_ids = [str(r["id"]) for r in relations]
    if len(set(relation_ids)) != len(relation_ids):
        raise ValueError("Duplicate relationship IDs")
    labels, routed, inferred, failed, relabelled_routes, reduced_clearance = [], [], [], [], [], []
    unresolved_self_loops = []
    # Input order is intentional: extract in stable model relationship order.
    for item in relations:
        relation_id = str(item["id"])
        sid = str(item.get("renderedSourceId", item["sourceId"]))
        tid = str(item.get("renderedTargetId", item["targetId"]))
        if sid not in nodes or tid not in nodes:
            raise ValueError("Missing endpoint node for relationship " + relation_id)
        source, target = nodes[sid], nodes[tid]
        if "start" in item and "end" in item:
            start = tuple(float(item["start"][k]) + offsets[sid][i] for i, k in enumerate(("x", "y")))
            end = tuple(float(item["end"][k]) + offsets[tid][i] for i, k in enumerate(("x", "y")))
        else:
            start, end = port(source, target), port(target, source)
            inferred.append(relation_id)
        if not all(math.isfinite(value) for point in (start, end) for value in point):
            raise ValueError("Non-finite endpoint geometry: " + relation_id)
        if sid == tid and length(start, end) < EPS:
            unresolved_self_loops.append(relation_id)
        source_stub, target_stub = outward(start, source, clearance), outward(end, target, clearance)
        obstacles = [rect.grow(clearance) for rect in nodes.values()]
        obstacles += [rect.grow(padding) for rect in labels]
        previous = [r["path"] for r in routed]
        middle = route_grid(source_stub, target_stub, obstacles, previous, lane)
        if middle is None and labels:
            # An early label can cover a shared endpoint corridor. Preserve the
            # endpoint and route around nodes first; the final pass relocates labels.
            middle = route_grid(source_stub, target_stub,
                                [rect.grow(clearance) for rect in nodes.values()],
                                previous, lane)
            if middle is not None:
                relabelled_routes.append(relation_id)
        if middle is None:
            for margin in (clearance / 2, clearance / 4, min(4.0, clearance / 8)):
                source_stub = outward(start, source, margin)
                target_stub = outward(end, target, margin)
                middle = route_grid(source_stub, target_stub,
                                    [rect.grow(margin) for rect in nodes.values()],
                                    previous, lane)
                if middle is not None:
                    reduced_clearance.append({"relationship": relation_id, "clearance": margin})
                    break
        if middle is None:
            # Keep every relationship visible even if the obstruction cannot be solved.
            # The audit will flag any resulting hit; never silently drop an edge.
            failed.append(relation_id)
            middle = [source_stub, (source_stub[0], target_stub[1]), target_stub]
        path = simplify([start] + middle + [end])
        if len(path) < 2:
            path = [start, (start[0] + clearance * 2, start[1]),
                    (start[0] + clearance * 2, start[1] - clearance * 2),
                    (end[0], end[1] - clearance * 2), end]
        width, height = float(item.get("labelWidth", 160)), float(item.get("labelHeight", 36))
        if not all(math.isfinite(value) and value >= 0 for value in (width, height)):
            raise ValueError("Invalid label dimensions: " + relation_id)
        position, label_rect, conflicts = place_label(
            path, width, height, [rect.grow(clearance) for rect in nodes.values()],
            labels, previous, padding, hard_nodes=list(nodes.values()))
        labels.append(label_rect)
        routed.append({"id": relation_id, "sourceId": sid, "targetId": tid,
                       "path": path, "position": position, "labelRect": label_rect})
    before_refinement = audit(nodes, routed, clearance)
    label_changes = refine_labels({identity: rect.grow(clearance)
                                  for identity, rect in nodes.items()}, routed, padding,
                                  hard_nodes=list(nodes.values()))
    bays = label_bays(nodes, routed, clearance, padding, lane) if options.get("outerLabelChannels", True) else []
    separated = separate_shared_stubs(nodes, routed, clearance, padding, lane)
    report = audit(nodes, routed, clearance)
    report["labelRefinement"] = {
        "changes": label_changes,
        "conflictsBefore": sum(len(before_refinement[key]) for key in
                               ("labelNodeOverlaps", "labelPairOverlaps", "linesThroughOtherLabels")),
        "conflictsAfter": sum(len(report[key]) for key in
                              ("labelNodeOverlaps", "labelPairOverlaps", "linesThroughOtherLabels"))}
    report.update({"nodeCount": len(nodes), "relationshipCount": len(routed),
                   "movedElements": moved, "inferredEndpoints": inferred,
                   "unroutedRelationships": failed,
                   "routesRequiringLabelRefinement": relabelled_routes,
                   "reducedClearance": reduced_clearance,
                   "outerLabelChannels": bays,
                   "selfLoopsRequiringManualPorts": unresolved_self_loops,
                   "endpointFanoutChanges": separated,
                   "method": "rectilinear-grid-a-star; snapshot geometry, native re-render required"})
    all_rectangles = list(nodes.values()) + [item["labelRect"] for item in routed]
    xs = [value for rect in all_rectangles for value in (rect.x, rect.x + rect.w)]
    ys = [value for rect in all_rectangles for value in (rect.y, rect.y + rect.h)]
    xs += [point[0] for item in routed for point in item["path"]]
    ys += [point[1] for item in routed for point in item["path"]]
    report["bounds"] = {"minX": min(xs, default=0), "minY": min(ys, default=0),
                        "maxX": max(xs, default=0), "maxY": max(ys, default=0)}
    if failed:
        report["unresolved"].append({"kind": "unroutedRelationships", "count": len(failed)})
    if unresolved_self_loops:
        report["unresolved"].append({"kind": "selfLoopsRequiringManualPorts",
                                     "count": len(unresolved_self_loops)})
    return {"viewKey": snapshot["viewKey"],
            "elements": [{"id": node_id,
                          "x": round(element_origins[node_id][0] + offsets[node_id][0], 3),
                          "y": round(element_origins[node_id][1] + offsets[node_id][1], 3)}
                         for node_id, rect in nodes.items()],
            "relationships": [{"id": r["id"], "routing": "Direct", "position": r["position"],
                               # Boundary vertices lock the measured port when native anchors recalculate.
                               "vertices": [{"x": round(x, 3), "y": round(y, 3)} for x, y in r["path"]]}
                              for r in routed],
            "report": report}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", default="-", help="Snapshot JSON, or - for stdin")
    parser.add_argument("--output", "-o", default="-", help="Layout patch JSON, or - for stdout")
    args = parser.parse_args()
    try:
        if args.input == "-":
            snapshot = json.load(sys.stdin)
        else:
            with open(args.input, encoding="utf-8") as stream:
                snapshot = json.load(stream)
        result = solve(snapshot)
        output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.output == "-":
            sys.stdout.write(output)
        else:
            with open(args.output, "w", encoding="utf-8") as stream:
                stream.write(output)
        return 0
    except (ValueError, KeyError, OSError, TypeError) as exc:
        print("Routing error: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
