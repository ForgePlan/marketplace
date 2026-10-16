#!/usr/bin/env python3
"""Read a native Structurizr SVG and match its geometry to one workspace view."""
import argparse
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

NS = {'s': 'http://www.w3.org/2000/svg'}
NUM = r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'


def normal(text):
    return re.sub(r'\s+', '', text).casefold()


def text_of(element):
    return ''.join(element.itertext()) if element is not None else ''


def matrix(element):
    value = element.get('transform', '')
    if not value:
        return (1, 0, 0, 1, 0, 0)
    m = re.fullmatch(r'\s*(translate|matrix)\(([^)]+)\)\s*', value)
    if not m:
        raise ValueError('Unsupported transform: ' + value)
    numbers = list(map(float, re.findall(NUM, m[2])))
    if m[1] == 'translate':
        return (1, 0, 0, 1, numbers[0], numbers[1] if len(numbers) > 1 else 0)
    if len(numbers) != 6:
        raise ValueError('Malformed matrix')
    return tuple(numbers)


def transformed_rect(rect, parent):
    a, b, c, d, tx, ty = matrix(parent)
    x, y = float(rect.get('x', 0)), float(rect.get('y', 0))
    w, h = float(rect.get('width', 0)), float(rect.get('height', 0))
    corners = [(a*u+c*v+tx, b*u+d*v+ty) for u, v in
               [(x, y), (x+w, y), (x, y+h), (x+w, y+h)]]
    xs, ys = zip(*corners)
    return {'x': min(xs), 'y': min(ys), 'width': max(xs)-min(xs), 'height': max(ys)-min(ys)}


def path_points(d):
    token_pattern = r'[A-Za-z]|' + NUM
    matches = list(re.finditer(token_pattern, d))
    end = 0
    for match in matches:
        if d[end:match.start()].strip(' \t\r\n,'):
            raise ValueError('Malformed relationship path')
        end = match.end()
    if d[end:].strip(' \t\r\n,'):
        raise ValueError('Malformed relationship path')
    tokens = [match.group() for match in matches]
    output = []
    i = 0
    p = (0, 0)
    while i < len(tokens):
        command = tokens[i]
        i += 1
        arity = {'M': 2, 'L': 2, 'C': 6}.get(command)
        if arity is None:
            raise ValueError('Unsupported line SVG command: ' + command)
        if not output and command != 'M':
            raise ValueError('Relationship path must start with M')
        values = tokens[i:i+arity]
        if len(values) != arity or any(re.fullmatch(NUM, value) is None for value in values):
            raise ValueError('Malformed coordinates for SVG command: ' + command)
        coordinates = list(map(float, values))
        if not all(math.isfinite(value) for value in coordinates):
            raise ValueError('Non-finite relationship path coordinates')
        i += arity
        if command in ('M', 'L'):
            p = tuple(coordinates)
            output.append(p)
        else:
            a, b, q = [tuple(coordinates[j:j+2]) for j in (0, 2, 4)]
            for k in range(1, 33):
                u, v = k/32, 1-k/32
                output.append(tuple(v*v*v*p[z]+3*v*v*u*a[z]+3*v*u*u*b[z]+u*u*u*q[z]
                                    for z in (0, 1)))
            p = q
    if len(output) < 2:
        raise ValueError('Empty relationship path')
    return output


def overlaps(a, b, epsilon=0.5):
    return (min(a['x']+a['width'], b['x']+b['width'])-max(a['x'], b['x']) > epsilon
            and min(a['y']+a['height'], b['y']+b['height'])-max(a['y'], b['y']) > epsilon)


def segment_hits(p, q, rect, margin=0.5):
    lo, hi = 0.0, 1.0
    for index, key, size in ((0, 'x', 'width'), (1, 'y', 'height')):
        start, delta = p[index], q[index]-p[index]
        left, right = rect[key]+margin, rect[key]+rect[size]-margin
        if abs(delta) < 1e-8:
            if start <= left or start >= right:
                return False
        else:
            a, b = sorted(((left-start)/delta, (right-start)/delta))
            lo, hi = max(lo, a), min(hi, b)
            if lo >= hi:
                return False
    return True


def line_hits(points, rect):
    return any(segment_hits(p, q, rect) for p, q in zip(points, points[1:]))


def audit(snapshot):
    nodes, links = snapshot['nodes'], snapshot['relationships']
    result = {key: [] for key in ('nodeNode', 'lineNode', 'labelNode', 'labelLabel', 'lineLabel')}
    for i, a in enumerate(nodes):
        for b in nodes[i+1:]:
            if overlaps(a, b):
                result['nodeNode'].append([a['id'], b['id']])
    for link in links:
        for node in nodes:
            if node['id'] not in (link['sourceId'], link['targetId']) and line_hits(link['points'], node):
                result['lineNode'].append([link['id'], node['id']])
            if any(overlaps(rect, node) for rect in link['labelRects']):
                result['labelNode'].append([link['id'], node['id']])
        for other in links:
            if other is not link and any(line_hits(link['points'], r) for r in other['labelRects']):
                result['lineLabel'].append([link['id'], other['id']])
    for i, a in enumerate(links):
        for b in links[i+1:]:
            if any(overlaps(x, y) for x in a['labelRects'] for y in b['labelRects']):
                result['labelLabel'].append([a['id'], b['id']])
    result['counts'] = {key: len(value) for key, value in result.items()}
    return result


def native_cylinder_bounds(path):
    """Recognize Structurizr's cylinder outline; reject other filled path shapes."""
    tokens = re.findall(r'[A-Za-z]|' + NUM, path.get('d', ''))
    if len(tokens) != 33 or [tokens[i] for i in (0, 3, 11, 19, 22, 30)] != ['M', 'a', 'a', 'l', 'a', 'l']:
        raise ValueError('Unsupported filled node path')
    rx, ry, width, body_height = [float(tokens[i]) for i in (4, 5, 9, 21)]
    expected = ['M', 0, ry, 'a', rx, ry, 0, 0, 0, width, 0,
                'a', rx, ry, 0, 0, 0, -width, 0, 'l', 0, body_height,
                'a', rx, ry, 0, 0, 0, width, 0, 'l', 0, -body_height]
    for actual, wanted in zip(tokens, expected):
        if isinstance(wanted, str):
            valid = actual == wanted
        else:
            valid = re.fullmatch(NUM, actual) is not None and math.isclose(float(actual), wanted)
        if not valid:
            raise ValueError('Unsupported filled node path')
    if not all(math.isfinite(value) and value > 0 for value in (rx, ry, width, body_height)) or not math.isclose(width, 2*rx):
        raise ValueError('Malformed cylinder outline')
    return (0, 0, width, body_height+2*ry)


def extract(workspace, svg, view_key):
    data = json.loads(Path(workspace).read_text())
    elements, relationships = {}, {}

    def walk(value):
        if isinstance(value, dict):
            if 'id' in value and ('name' in value or 'containerId' in value or 'softwareSystemId' in value):
                elements[value['id']] = value
            if 'id' in value and 'sourceId' in value and 'destinationId' in value:
                relationships[value['id']] = value
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
    walk(data['model'])
    views = [v for values in data['views'].values() if isinstance(values, list)
             for v in values if isinstance(v, dict) and v.get('key') == view_key]
    if len(views) != 1:
        raise ValueError('Missing or ambiguous view: ' + view_key)
    view = views[0]
    allowed_ids = {item['id'] for item in view['elements']}
    names = {}
    boundary_ids = set()
    for identifier in allowed_ids:
        item = elements[identifier]
        if 'containerInstances' in item or 'infrastructureNodes' in item or 'children' in item:
            boundary_ids.add(identifier)
            continue
        if not item.get('name'):
            item = elements[item.get('containerId', item.get('softwareSystemId'))]
        names.setdefault(normal(item['name']), []).append(identifier)
    root = ET.parse(svg).getroot()
    groups = [g for g in root.findall('.//s:g', NS) if g.get('id', '').startswith('j_')]
    nodes, raw_links = [], []
    for group in groups:
        line = next((p for p in group.findall('.//s:path', NS) if p.get('joint-selector') == 'line'), None)
        if line is not None:
            raw_links.append((group, line))
            continue
        bold = next((t for t in group.findall('.//s:text', NS) if t.get('font-weight') == 'bold'), None)
        name = text_of(bold)
        matches = names.get(normal(name), [])
        if not matches:
            continue
        if len(matches) != 1:
            raise ValueError('Ambiguous named element: ' + name)
        body = list(group)[0] if len(group) else group
        visible = [e for e in body if e.tag.rsplit('}', 1)[-1] in ('rect', 'circle', 'path')
                   and e.get('fill') not in ('none', None)]
        if not visible:
            continue  # implicit boundaries are not runtime nodes
        rectangles = list(body.findall('s:rect', NS))
        circles = list(body.findall('s:circle', NS))
        filled_paths = [p for p in body.findall('s:path', NS) if p.get('fill') not in ('none', None)]
        for shape in [body] + rectangles + circles + filled_paths:
            if matrix(shape) != (1, 0, 0, 1, 0, 0):
                raise ValueError('Unsupported nested node transform: ' + name)
        min_x = [float(e.get('x', 0)) for e in rectangles]
        min_y = [float(e.get('y', 0)) for e in rectangles]
        max_x = [float(e.get('x', 0))+float(e.get('width', 0)) for e in rectangles]
        max_y = [float(e.get('y', 0))+float(e.get('height', 0)) for e in rectangles]
        min_x += [float(e.get('cx', 0))-float(e.get('r', 0)) for e in circles]
        min_y += [float(e.get('cy', 0))-float(e.get('r', 0)) for e in circles]
        max_x += [float(e.get('cx', 0))+float(e.get('r', 0)) for e in circles]
        max_y += [float(e.get('cy', 0))+float(e.get('r', 0)) for e in circles]
        for path in filled_paths:
            left, top, right, bottom = native_cylinder_bounds(path)
            min_x.append(left)
            min_y.append(top)
            max_x.append(right)
            max_y.append(bottom)
        if not max_x or not max_y:
            raise ValueError('Unsupported node shape: ' + name)
        a, b, c, d, x, y = matrix(group)
        if (a, b, c, d) != (1, 0, 0, 1):
            raise ValueError('Unsupported node transform')
        bounds = (min(min_x), min(min_y), max(max_x), max(max_y))
        if not all(math.isfinite(value) for value in bounds + (x, y)):
            raise ValueError('Non-finite node bounds: ' + name)
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            raise ValueError('Empty node bounds: ' + name)
        nodes.append({'id': matches[0], 'name': elements[matches[0]].get('name', name),
                      'elementX': x, 'elementY': y,
                      'x': x+bounds[0], 'y': y+bounds[1],
                      'width': bounds[2]-bounds[0], 'height': bounds[3]-bounds[1]})
    if not nodes:
        raise ValueError('No named nodes in SVG')
    links, consumed = [], set()
    for group, line in raw_links:
        if any(matrix(element) != (1, 0, 0, 1, 0, 0) for element in (group, line)):
            raise ValueError('Unsupported relationship group/path transform')
        labels, rects, texts = [], [], []
        for label in group.findall('.//s:g', NS):
            if 'label-idx' not in label.attrib:
                continue
            text = label.find('s:text', NS)
            if label.get('label-idx') in ('0', '1'):
                texts.append(text_of(text))
            for rect in label.findall('s:rect', NS):
                box = transformed_rect(rect, label)
                if box['width'] > 0.5 and box['height'] > 0.5:
                    rects.append(box)
        label_text = texts[0] if texts else ''
        points = path_points(line.get('d', ''))
        candidates = []
        for index, rel in enumerate(view.get('relationships', [])):
            model_rel = relationships[rel['id']]
            expected = rel.get('description', model_rel.get('description', ''))
            if rel.get('order'):
                expected = str(rel['order']) + ': ' + expected
            if normal(label_text) == normal(expected) and index not in consumed:
                candidates.append(index)
        if len(candidates) > 1:
            def distance(point, identifier):
                node = next((n for n in nodes if n['id'] == identifier), None)
                if node is None:
                    return math.inf
                dx = max(node['x']-point[0], 0, point[0]-node['x']-node['width'])
                dy = max(node['y']-point[1], 0, point[1]-node['y']-node['height'])
                return math.hypot(dx, dy)
            candidates = [index for index in candidates if
                          distance(points[0], relationships[view['relationships'][index]['id']]['sourceId']) < 2
                          and distance(points[-1], relationships[view['relationships'][index]['id']]['destinationId']) < 2]
        if len(candidates) != 1:
            raise ValueError('Unmatched/ambiguous relationship label: ' + label_text)
        index = candidates[0]
        consumed.add(index)
        rel = view['relationships'][index]
        original = relationships[rel['id']]
        xs = [r['x'] for r in rects]+[r['x']+r['width'] for r in rects]
        ys = [r['y'] for r in rects]+[r['y']+r['height'] for r in rects]
        links.append({'id': rel['id']+(':'+str(rel['order']) if rel.get('order') else ''),
                      'originalId': rel['id'], 'order': rel.get('order'), 'viewIndex': index,
                      'sourceId': original['sourceId'], 'targetId': original['destinationId'],
                      'label': label_text, 'labelWidth': max(xs)-min(xs) if xs else 0,
                      'labelHeight': max(ys)-min(ys) if ys else 0,
                      'start': dict(zip(('x', 'y'), points[0])),
                      'end': dict(zip(('x', 'y'), points[-1])),
                      'points': points, 'labelRects': rects,
                      'vertices': rel.get('vertices', []), 'position': rel.get('position', 50)})
    if len(links) != len(view.get('relationships', [])):
        raise ValueError('SVG does not contain every view relationship')
    result = {'viewKey': view_key, 'nodes': nodes, 'relationships': links,
              'dimensions': {'width': float(root.get('width')), 'height': float(root.get('height'))},
              'source': str(svg), 'ignoredBoundaries': sorted(boundary_ids),
              'missingElements': sorted(allowed_ids-boundary_ids-{n['id'] for n in nodes})}
    if result['missingElements']:
        raise ValueError('Missing runtime elements in SVG: ' + ', '.join(result['missingElements']))
    result['audit'] = audit(result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workspace')
    parser.add_argument('svg')
    parser.add_argument('--view', required=True)
    parser.add_argument('-o', '--output', required=True)
    args = parser.parse_args()
    snapshot = extract(args.workspace, args.svg, args.view)
    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'view': args.view, 'nodes': len(snapshot['nodes']),
                      'links': len(snapshot['relationships']), 'missing': snapshot['missingElements'],
                      'counts': snapshot['audit']['counts']}, ensure_ascii=False))
