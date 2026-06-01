// DELIBERATELY BROKEN variant for the negative control test.
// Bug: treats "release > prerelease" backwards (returns -1 instead of 1),
// so v08 (1.0.0 vs 1.0.0-rc.1 -> expected 1) fails and INV-2 antisymmetry breaks.
function parse(v: string): { core: number[]; pre: string[] } {
  const plus = v.indexOf("+");
  const noBuild = plus >= 0 ? v.slice(0, plus) : v;
  const dash = noBuild.indexOf("-");
  const coreStr = dash >= 0 ? noBuild.slice(0, dash) : noBuild;
  const core = coreStr.split(".").map((x) => parseInt(x, 10));
  const pre = dash >= 0 ? noBuild.slice(dash + 1).split(".") : [];
  return { core, pre };
}
function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}
function isNum(s: string): boolean {
  return /^[0-9]+$/.test(s);
}
export function semverCompare(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return sign(pa.core[i] - pb.core[i]);
  }
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0;
  if (pa.pre.length === 0) return -1; // BUG: should be 1
  if (pb.pre.length === 0) return -1;
  const n = Math.min(pa.pre.length, pb.pre.length);
  for (let i = 0; i < n; i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === y) continue;
    const xn = isNum(x);
    const yn = isNum(y);
    if (xn && yn) return sign(parseInt(x, 10) - parseInt(y, 10));
    if (xn && !yn) return -1;
    if (yn && !xn) return 1;
    return x < y ? -1 : 1;
  }
  return sign(pa.pre.length - pb.pre.length);
}
