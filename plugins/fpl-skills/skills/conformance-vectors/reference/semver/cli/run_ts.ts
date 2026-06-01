// TS runner: reads TSV "a<TAB>b" lines from stdin, prints semver_compare per line.
// The corpus + expected answers live in the comparator; this only answers compare(a,b).
import { semverCompare } from "../impl/ts/semver.ts";
import { semverCompare as semverCompareBroken } from "../impl/ts/semver_broken.ts";
import * as fs from "node:fs";

const fn = process.env.SEMVER_BREAK ? semverCompareBroken : semverCompare;
const input = fs.readFileSync(0, "utf8"); // fd 0 = stdin
const out: string[] = [];
for (const line of input.split("\n")) {
  if (line === "") continue;
  const [a, b] = line.split("\t");
  out.push(String(fn(a, b)));
}
process.stdout.write(out.join("\n") + "\n");
