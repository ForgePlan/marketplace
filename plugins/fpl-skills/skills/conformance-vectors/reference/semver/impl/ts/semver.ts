// Implementation of SPEC-001 semver_compare. Pure: no I/O, no time, no randomness.
// Generated to conform to the frozen corpus; the corpus is the oracle (read-only).
function parse(v: string): { core: number[]; pre: string[] } {
  const plus = v.indexOf("+");
  const noBuild = plus >= 0 ? v.slice(0, plus) : v; // build metadata ignored
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
    if (pa.core[i] !== pb.core[i]) return sign(pa.core[i] - pb.core[i]); // numeric, not lexical
  }
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0;
  if (pa.pre.length === 0) return 1; // release > prerelease
  if (pb.pre.length === 0) return -1; // prerelease < release
  const n = Math.min(pa.pre.length, pb.pre.length);
  for (let i = 0; i < n; i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === y) continue;
    const xn = isNum(x);
    const yn = isNum(y);
    if (xn && yn) return sign(parseInt(x, 10) - parseInt(y, 10));
    if (xn && !yn) return -1; // numeric < non-numeric
    if (yn && !xn) return 1;
    return x < y ? -1 : 1; // both non-numeric: ASCII
  }
  return sign(pa.pre.length - pb.pre.length); // more fields wins
}
