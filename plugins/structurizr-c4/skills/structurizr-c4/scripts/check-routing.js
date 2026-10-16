// Evaluate this whole IIFE through a browser's read-only DOM evaluation tool.
// Screens rendered Structurizr SVG, without accessing application internals.
(() => {
  const root = document.querySelector('#diagram-canvas');
  if (!root || !root.querySelector('svg')) throw Error('No rendered Structurizr diagram');
  const box = e => {
    const r = e.getBoundingClientRect();
    return {x: r.x, y: r.y, w: r.width, h: r.height};
  };
  const inside = (p, r, margin = 0) => p.x > r.x + margin &&
    p.x < r.x + r.w - margin && p.y > r.y + margin && p.y < r.y + r.h - margin;
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.2 &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.2;
  const name = e => (e?.textContent || '').replace(/\s+/g, ' ').trim();
  const sample = e => {
    if (!e) throw Error('Relationship has no rendered line');
    const d = e.getAttribute('d') || '';
    if (/[A-BD-KN-Zabd-z]/.test(d.replace(/e[-+]?\d+/gi, ''))) {
      throw Error('Unsupported SVG path command; use visual review');
    }
    const tokens = d.match(/[MLC]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) || [];
    let i = 0, p = {x: 0, y: 0};
    const points = [];
    while (i < tokens.length) {
      const command = tokens[i++];
      if (command === 'M') {
        p = {x: +tokens[i++], y: +tokens[i++]}; points.push(p);
      } else if (command === 'L') {
        const q = {x: +tokens[i++], y: +tokens[i++]};
        const count = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 6));
        for (let j = 1; j <= count; j++) points.push({
          x: p.x + (q.x - p.x) * j / count, y: p.y + (q.y - p.y) * j / count
        });
        p = q;
      } else if (command === 'C') {
        const a = {x: +tokens[i++], y: +tokens[i++]};
        const b = {x: +tokens[i++], y: +tokens[i++]};
        const q = {x: +tokens[i++], y: +tokens[i++]};
        for (let j = 1; j <= 32; j++) {
          const u = j / 32, v = 1 - u;
          points.push({
            x: v*v*v*p.x + 3*v*v*u*a.x + 3*v*u*u*b.x + u*u*u*q.x,
            y: v*v*v*p.y + 3*v*v*u*a.y + 3*v*u*u*b.y + u*u*u*q.y
          });
        }
        p = q;
      } else throw Error('Unsupported SVG path command: ' + command);
    }
    if (points.length < 2) throw Error('Empty relationship path');
    const r = box(e), xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const dx = Math.max(...xs) - minX, dy = Math.max(...ys) - minY;
    return points.map(p => ({
      x: r.x + (dx ? (p.x - minX) * r.w / dx : 0),
      y: r.y + (dy ? (p.y - minY) * r.h / dy : 0)
    }));
  };
  const nodes = Array.from(root.querySelectorAll('g.joint-element'))
    .filter(e => !/(boundary|deploymentnode)/i.test(e.getAttribute('data-type') || ''))
    .map(e => ({name: name(e.querySelector('text.structurizrName')),
      box: box(e.querySelector('.structurizrHighlightableElement') || e)}))
    .filter(n => n.name && n.box.w > 0 && n.box.h > 0);
  if (!nodes.length) throw Error('No named diagram elements; wait for rendering');
  const links = Array.from(root.querySelectorAll('g.joint-link')).map(e => ({
    label: name(e.querySelector('.labels text.structurizrDescription')),
    points: sample(e.querySelector('path[joint-selector="line"]')),
    boxes: Array.from(e.querySelectorAll('.labels rect')).map(box)
      .filter(r => r.w > 0.2 && r.h > 0.2)
  }));
  const lineNodeHits = [], labelNodeOverlaps = [], labelPairOverlaps = [];
  const linesThroughOtherLabels = [], nodePairOverlaps = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (overlap(nodes[i].box, nodes[j].box)) nodePairOverlaps.push([nodes[i].name, nodes[j].name]);
  }
  for (const line of links) {
    for (const node of nodes) {
      const endpoint = inside(line.points[0], node.box, -1) ||
        inside(line.points[line.points.length - 1], node.box, -1);
      if (!endpoint && line.points.some(p => inside(p, node.box, 0.2))) {
        lineNodeHits.push({line: line.label, node: node.name});
      }
      if (line.boxes.some(r => overlap(r, node.box))) {
        labelNodeOverlaps.push({label: line.label, node: node.name});
      }
    }
    for (const other of links) if (line !== other && other.boxes.some(r =>
      line.points.some(p => inside(p, r, 0.2)))) {
      linesThroughOtherLabels.push([line.label, other.label]);
    }
  }
  for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
    if (links[i].boxes.some(a => links[j].boxes.some(b => overlap(a, b)))) {
      labelPairOverlaps.push([links[i].label, links[j].label]);
    }
  }
  const total = lineNodeHits.length + labelNodeOverlaps.length + labelPairOverlaps.length +
    linesThroughOtherLabels.length + nodePairOverlaps.length;
  return {
    status: total ? 'review-required' : 'no-collisions-detected',
    method: 'sampled SVG paths and DOM bounding boxes; visual review still required',
    nodes: nodes.length, links: links.length, nodePairOverlaps, lineNodeHits,
    labelNodeOverlaps, labelPairOverlaps, linesThroughOtherLabels
  };
})()
