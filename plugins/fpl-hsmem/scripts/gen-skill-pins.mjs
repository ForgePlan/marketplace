#!/usr/bin/env node
/**
 * Expand each skill's `hindsight-tools:` list into its `allowed-tools:` line.
 *
 * WHAT `allowed-tools` ACTUALLY DOES — corrected 2026-09-10, and the correction matters.
 *
 * An earlier version of this header claimed a mis-spelled pin "silently withholds the tool" and
 * that a plugin install "denied every one of them". That was WRONG. The documentation is explicit:
 * "The `allowed-tools` field grants permission for the listed tools during the turn that invokes
 * the skill, so Claude can use them without prompting you for approval", and "It does not restrict
 * which tools are available: every tool remains callable, and your permission settings still govern
 * tools that are not listed." Restriction is `disallowed-tools`, a different field.
 *
 * So a pin is a PRE-APPROVAL, not a gate. The failure mode of a wrong or missing pin is not denial
 * — it is a permission prompt in the middle of a workflow that was supposed to run unattended.
 * Milder than the original claim, and still worth fixing.
 *
 * WHY BOTH PREFIXES. This relay is reachable under two spellings depending on how it was wired:
 *
 *   mcp__hindsight__memory_status                 — a project that hand-wires the server in .mcp.json
 *   mcp__plugin_fpl-hsmem_hindsight__memory_status — the same relay installed as a plugin
 *
 * The shipped skills pinned only the first, which is the spelling this repository happens to use.
 * On a plugin install every one of their calls would have prompted. Listing both means the skill
 * runs unattended under either wiring.
 *
 * So each skill declares the BARE names it needs, next to itself, and this generator writes the
 * prefixed forms. `--check` fails when a file has drifted, which is what CI runs — hand-maintaining
 * nine skills times two prefixes is exactly the kind of enumeration that goes stale unnoticed.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(HERE, "..");
const SKILLS = join(PLUGIN, "skills");

const PREFIXES = ["mcp__hindsight__", "mcp__plugin_fpl-hsmem_hindsight__"];

/** The canonical tool list, read from the one module that declares it. */
function loadToolNames() {
  const src = readFileSync(join(PLUGIN, "src", "lib", "tool-names.ts"), "utf8");
  const body = /export const TOOL_NAMES = \[([\s\S]*?)\] as const;/.exec(src);
  if (!body) throw new Error("could not find TOOL_NAMES in src/lib/tool-names.ts");
  const names = [...body[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
  if (names.length === 0) throw new Error("parsed zero tool names — refusing to generate empty pins");
  return names;
}

const TOOL_NAMES = loadToolNames();
const KNOWN = new Set(TOOL_NAMES);

/** Split a SKILL.md into [frontmatterLines, rest]. */
function splitFrontmatter(text, file) {
  const lines = text.split("\n");
  if (lines[0] !== "---") throw new Error(`${file}: no YAML frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error(`${file}: unterminated frontmatter`);
  return [lines.slice(1, end), lines.slice(end + 1), lines[0]];
}

function parseListValue(raw) {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const check = process.argv.includes("--check");
let changed = 0;
let problems = [];

const dirs = existsSync(SKILLS) ? readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
if (dirs.length === 0) problems.push("no skills found under skills/ — refusing to report a pass");

for (const d of dirs) {
  const file = join(SKILLS, d.name, "SKILL.md");
  if (!existsSync(file)) {
    problems.push(`skills/${d.name}/: no SKILL.md`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  let fm, rest, marker;
  try {
    [fm, rest, marker] = splitFrontmatter(text, `skills/${d.name}`);
  } catch (e) {
    problems.push(e.message);
    continue;
  }

  const idx = fm.findIndex((l) => l.startsWith("hindsight-tools:"));
  if (idx < 0) {
    problems.push(`skills/${d.name}: no \`hindsight-tools:\` line — this generator is the only writer of allowed-tools`);
    continue;
  }
  const bare = parseListValue(fm[idx].slice("hindsight-tools:".length));
  const unknown = bare.filter((n) => !KNOWN.has(n));
  if (unknown.length) {
    problems.push(`skills/${d.name}: names no such tool: ${unknown.join(", ")}`);
    continue;
  }

  // Extra (non-MCP) tools the skill needs stay hand-written on their own line.
  const extraIdx = fm.findIndex((l) => l.startsWith("extra-tools:"));
  const extra = extraIdx >= 0 ? parseListValue(fm[extraIdx].slice("extra-tools:".length)) : [];

  const pins = [];
  for (const name of bare) for (const p of PREFIXES) pins.push(p + name);
  pins.push(...extra);
  const line = `allowed-tools: ${pins.join(", ")}`;

  const allowedIdx = fm.findIndex((l) => l.startsWith("allowed-tools:"));
  const current = allowedIdx >= 0 ? fm[allowedIdx] : null;
  if (current === line) continue;

  if (check) {
    problems.push(`skills/${d.name}: allowed-tools is out of date (run gen-skill-pins.mjs)`);
    continue;
  }
  if (allowedIdx >= 0) fm[allowedIdx] = line;
  else fm.push(line);
  writeFileSync(file, [marker, ...fm, "---", ...rest].join("\n"), "utf8");
  changed++;
}

if (problems.length) {
  console.error("skill pins FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(
  check
    ? `skill pins OK: ${dirs.length} skills, ${TOOL_NAMES.length} tools, both prefixes present`
    : `skill pins written: ${changed} of ${dirs.length} skills updated`,
);
