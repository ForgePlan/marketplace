#!/usr/bin/env python3
"""Apply one checked geometry patch without altering a Structurizr semantic model.

Default: dry-run. Use --output NEWFILE or --write (with automatic backup) to save.
"""

import argparse
import copy
import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import sys
import tempfile


class LayoutError(ValueError):
    """A patch cannot be applied without guessing its target identity."""


def number(value):
    if isinstance(value, bool):
        raise LayoutError("Boolean is not a coordinate")
    result = float(value)
    if not math.isfinite(result):
        raise LayoutError("Geometry must contain finite numbers")
    return result


def integer(value):
    return int(round(number(value)))


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(",", ":")).encode("utf-8")).hexdigest()


def unique_by_id(items, kind):
    result = {}
    for item in items:
        identity = str(item["id"])
        if identity in result:
            raise LayoutError("Duplicate " + kind + " ID: " + identity)
        result[identity] = item
    return result


def locate_view(workspace, key):
    matches = []
    for collection, values in workspace.get("views", {}).items():
        if isinstance(values, list):
            for index, view in enumerate(values):
                if isinstance(view, dict) and view.get("key") == key:
                    matches.append((collection, index, view))
    if len(matches) != 1:
        raise LayoutError("Expected one view with key " + str(key) + "; found " + str(len(matches)))
    return matches[0]


def order_value(value):
    return None if value is None else str(value)


def model_relationship_endpoints(model):
    result = {}

    def visit(value):
        if isinstance(value, dict):
            if all(key in value for key in ("id", "sourceId", "destinationId")):
                identity = str(value["id"])
                endpoints = str(value["sourceId"]), str(value["destinationId"])
                if identity in result and result[identity] != endpoints:
                    raise LayoutError("Conflicting model endpoints for relationship " + identity)
                result[identity] = endpoints
            for item in value.values():
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)

    visit(model)
    return result


def validate_snapshot_endpoints(snapshot, model_endpoints):
    original_id = str(snapshot.get("originalId", snapshot["id"]))
    if original_id not in model_endpoints:
        raise LayoutError("Relationship absent from the current model: " + original_id)
    observed = str(snapshot["sourceId"]), str(snapshot["targetId"])
    if observed != model_endpoints[original_id]:
        raise LayoutError("Snapshot endpoints differ from the current model for relationship " + original_id)


def map_relationship(snapshot, view_relationships):
    """Prefer ID + order; an index is only a verified ambiguity fallback."""
    original_id = str(snapshot.get("originalId", snapshot["id"]))
    order = order_value(snapshot.get("order"))
    candidates = [(index, relation) for index, relation in enumerate(view_relationships)
                  if str(relation["id"]) == original_id]
    if order is not None:
        candidates = [(index, relation) for index, relation in candidates
                      if order_value(relation.get("order")) == order]
        method = "id+order"
    else:
        method = "unique-id"
    if len(candidates) == 1:
        index, relation = candidates[0]
    elif len(candidates) > 1 and "viewIndex" in snapshot:
        index = integer(snapshot["viewIndex"])
        valid = [(i, relation) for i, relation in candidates if i == index]
        if len(valid) != 1:
            raise LayoutError("viewIndex does not verify relationship " + str(snapshot["id"]))
        index, relation = valid[0]
        method = "verified-index"
    else:
        raise LayoutError("Ambiguous or missing relationship: " + str(snapshot["id"]))
    return index, relation, method


def path_point(path, percent):
    if not path:
        return 0.0, 0.0
    lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:])]
    distance = sum(lengths) * percent / 100
    for index, amount in enumerate(lengths):
        if distance <= amount or index == len(lengths) - 1:
            ratio = max(0.0, min(1.0, distance / amount)) if amount else 0.0
            a, b = path[index], path[index + 1]
            return a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio
        distance -= amount
    return path[0]


def measured_endpoint(relation, name, node_offsets):
    point = relation.get(name)
    if point is None and relation.get("points"):
        value = relation["points"][0 if name == "start" else -1]
        point = {"x": value[0], "y": value[1]}
    if point is None:
        return None
    identity = str(relation["sourceId" if name == "start" else "targetId"])
    dx, dy = node_offsets.get(identity, (0.0, 0.0))
    return number(point["x"]) + dx, number(point["y"]) + dy


def collect_bounds(elements, snapshot_nodes, relationships, snapshots, node_offsets):
    xs, ys = [], []
    for element in elements:
        identity = str(element["id"])
        x, y = number(element.get("x", 0)), number(element.get("y", 0))
        if identity in snapshot_nodes:
            node = snapshot_nodes[identity]
            bbox_x = x + number(node["x"]) - number(node.get("elementX", node["x"]))
            bbox_y = y + number(node["y"]) - number(node.get("elementY", node["y"]))
            xs.extend((bbox_x, bbox_x + number(node["width"])))
            ys.extend((bbox_y, bbox_y + number(node["height"])))
        else:
            xs.append(x)
            ys.append(y)
    for relation, snapshot in zip(relationships, snapshots):
        path = [(number(vertex["x"]), number(vertex["y"]))
                for vertex in relation.get("vertices", [])]
        start = measured_endpoint(snapshot, "start", node_offsets)
        end = measured_endpoint(snapshot, "end", node_offsets)
        if start is not None:
            path.insert(0, start)
        if end is not None:
            path.append(end)
        if not path:
            raise LayoutError("No path geometry for relationship " + str(snapshot["id"]))
        xs.extend(point[0] for point in path)
        ys.extend(point[1] for point in path)
        center = path_point(path, number(relation.get("position", 50)))
        width = number(snapshot.get("labelWidth", 160))
        height = number(snapshot.get("labelHeight", 36))
        if width < 0 or height < 0:
            raise LayoutError("Negative label dimensions")
        xs.extend((center[0] - width / 2, center[0] + width / 2))
        ys.extend((center[1] - height / 2, center[1] + height / 2))
    return {"minX": min(xs, default=0), "minY": min(ys, default=0),
            "maxX": max(xs, default=0), "maxY": max(ys, default=0)}


def apply_layout(workspace, snapshot, patch, padding=50):
    """Return a deep-copied workspace and report; never mutate the input objects."""
    padding = number(padding)
    if padding < 0:
        raise LayoutError("padding must be non-negative")
    key = snapshot["viewKey"]
    if patch.get("viewKey") != key:
        raise LayoutError("Snapshot and patch view keys differ")
    if not isinstance(workspace.get("model"), dict):
        raise LayoutError("Workspace must have a semantic model object")
    result = copy.deepcopy(workspace)
    collection, view_index, original_view = locate_view(workspace, key)
    _, _, view = locate_view(result, key)
    snapshot_nodes = unique_by_id(snapshot["nodes"], "snapshot node")
    patch_elements = unique_by_id(patch["elements"], "patch element")
    if set(patch_elements) != set(snapshot_nodes):
        raise LayoutError("Patch and snapshot node IDs differ")
    view_elements = unique_by_id(view.get("elements", []), "view element")
    if not set(patch_elements).issubset(view_elements):
        raise LayoutError("Patch contains nodes absent from the view")
    node_offsets = {}
    for identity, item in patch_elements.items():
        element = view_elements[identity]
        element["x"], element["y"] = integer(item["x"]), integer(item["y"])
        node = snapshot_nodes[identity]
        node_offsets[identity] = (element["x"] - number(node.get("elementX", node["x"])),
                                  element["y"] - number(node.get("elementY", node["y"])))
    snapshot_relations = unique_by_id(snapshot["relationships"], "snapshot relationship")
    patch_relations = unique_by_id(patch["relationships"], "patch relationship")
    if set(snapshot_relations) != set(patch_relations):
        raise LayoutError("Patch and snapshot relationship IDs differ")
    view_relations = view.get("relationships", [])
    model_endpoints = model_relationship_endpoints(workspace["model"])
    if len(view_relations) != len(snapshot_relations):
        raise LayoutError("Snapshot relationship count differs from the view; nothing may be dropped")
    mappings, used, snapshots_in_view_order = [], set(), [None] * len(view_relations)
    for identity, source in snapshot_relations.items():
        # Dynamic response arrows retain the model relation's source/destination;
        # the view response flag is presentation, not a reversed model identity.
        validate_snapshot_endpoints(source, model_endpoints)
        index, relation, method = map_relationship(source, view_relations)
        if index in used:
            raise LayoutError("Two snapshot relationships map to one view entry")
        used.add(index)
        snapshots_in_view_order[index] = source
        item = patch_relations[identity]
        routing = item.get("routing", "Direct")
        if routing not in ("Direct", "Orthogonal", "Curved"):
            raise LayoutError("Unknown routing: " + str(routing))
        position = integer(item.get("position", 50))
        if not 0 <= position <= 100:
            raise LayoutError("Label position must be from 0 to 100")
        vertices = []
        for vertex in item.get("vertices", []):
            point = {"x": integer(vertex["x"]), "y": integer(vertex["y"])}
            if not vertices or point != vertices[-1]:
                vertices.append(point)
        relation.update(vertices=vertices, routing=routing, position=position)
        mapping = {"snapshotId": identity, "originalId": str(relation["id"]),
                   "order": relation.get("order"), "viewIndex": index, "method": method}
        if "viewIndex" in source and integer(source["viewIndex"]) != index:
            mapping["snapshotIndexDrift"] = True
        mappings.append(mapping)
    if len(used) != len(view_relations):
        raise LayoutError("Not every view relationship was mapped")
    before_bounds = collect_bounds(view["elements"], snapshot_nodes, view_relations,
                                   snapshots_in_view_order, node_offsets)
    dx = math.ceil(padding - before_bounds["minX"]) if before_bounds["minX"] < 0 else 0
    dy = math.ceil(padding - before_bounds["minY"]) if before_bounds["minY"] < 0 else 0
    for element in view["elements"]:
        element["x"] = integer(element.get("x", 0)) + dx
        element["y"] = integer(element.get("y", 0)) + dy
    for relation in view_relations:
        for vertex in relation.get("vertices", []):
            vertex["x"] += dx
            vertex["y"] += dy
    bounds = {axis: value + (dx if axis.endswith("X") else dy)
              for axis, value in before_bounds.items()}
    dimensions = view.get("dimensions", {})
    snapshot_dimensions = snapshot.get("dimensions", {})
    width = max(number(dimensions.get("width", 0)), number(snapshot_dimensions.get("width", 0)))
    height = max(number(dimensions.get("height", 0)), number(snapshot_dimensions.get("height", 0)))
    view["dimensions"] = {"width": math.ceil(max(width + dx, bounds["maxX"] + padding)),
                          "height": math.ceil(max(height + dy, bounds["maxY"] + padding))}
    view.pop("automaticLayout", None)
    if result["model"] != workspace["model"]:
        raise LayoutError("Semantic model changed")
    if [item["id"] for item in view["elements"]] != [item["id"] for item in original_view["elements"]]:
        raise LayoutError("Element identity or count changed")
    for before, after in zip(original_view.get("relationships", []), view_relations):
        before_semantics = {key: value for key, value in before.items()
                            if key not in ("vertices", "routing", "position")}
        after_semantics = {key: value for key, value in after.items()
                           if key not in ("vertices", "routing", "position")}
        if before_semantics != after_semantics:
            raise LayoutError("Relationship semantics or order changed")
    restored = copy.deepcopy(result)
    restored["views"][collection][view_index] = copy.deepcopy(original_view)
    if restored != workspace:
        raise LayoutError("Something outside the selected view changed")
    return result, {"viewKey": key, "elements": len(view["elements"]),
                    "relationships": len(view_relations), "offset": {"x": dx, "y": dy},
                    "boundsBeforeShift": before_bounds, "bounds": bounds,
                    "dimensions": view["dimensions"], "relationshipMapping": mappings,
                    "modelUnchanged": True, "otherViewsUnchanged": True,
                    "modelSha256": fingerprint(workspace["model"]),
                    "solverUnresolved": patch.get("report", {}).get("unresolved", []),
                    "nativeRenderRequired": True}


def save_result(path, result, replace=False):
    content = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if not replace:
        with path.open("x", encoding="utf-8") as stream:
            stream.write(content)
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=str(path.parent),
                                         prefix="." + path.name + ".", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
        os.chmod(str(temporary), path.stat().st_mode & 0o777)
        os.replace(str(temporary), str(path))
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("patch", type=Path)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--output", "-o", type=Path, help="Save to a new JSON file")
    group.add_argument("--write", action="store_true", help="Replace the workspace, after making a backup")
    parser.add_argument("--backup", type=Path, help="Explicit new backup path; only with --write")
    parser.add_argument("--padding", type=float, default=50, help="Positive margin after translation")
    args = parser.parse_args(argv)
    try:
        if args.backup is not None and not args.write:
            raise LayoutError("--backup requires --write")
        inputs = [path.resolve() for path in (args.workspace, args.snapshot, args.patch)]
        if args.output is not None and args.output.resolve() in inputs:
            raise LayoutError("--output cannot overwrite any input; use --write for the workspace")
        workspace, snapshot, patch = [json.loads(path.read_text(encoding="utf-8"))
                                      for path in (args.workspace, args.snapshot, args.patch)]
        result, report = apply_layout(workspace, snapshot, patch, args.padding)
        if args.write:
            stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            backup = args.backup or args.workspace.with_name(args.workspace.name + ".bak." + stamp)
            if backup.resolve() in inputs:
                raise LayoutError("Backup cannot overwrite any input")
            with backup.open("xb") as stream:
                stream.write(args.workspace.read_bytes())
            shutil.copystat(str(args.workspace), str(backup))
            save_result(args.workspace, result, replace=True)
            report.update(writtenTo=str(args.workspace.resolve()), backup=str(backup.resolve()))
        elif args.output is not None:
            save_result(args.output, result)
            report["writtenTo"] = str(args.output.resolve())
        else:
            report["dryRun"] = True
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, TypeError, KeyError, OSError) as error:
        print("Layout apply error: " + str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
