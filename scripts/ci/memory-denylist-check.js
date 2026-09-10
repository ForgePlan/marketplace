#!/usr/bin/env node
/**
 * An agent that is not trusted to write memory must not hold ANY memory write tool.
 *
 * THE DEFECT THIS EXISTS TO CATCH. Denylists across the marketplace express "this role does not
 * write memory" by naming the write tools one by one. That is a hand-maintained enumeration of a
 * set that grows — and when the memory relay went from 13 tools to 27, all 27 restricted agents
 * kept naming only the old three. `document_delete` (irreversible, cascades to every fact
 * extracted from a document), `bank_config_set` (rewrites the bank's behaviour) and
 * `memory_invalidate` became reachable by every Profile A creator and Profile B reviewer in the
 * marketplace, and nothing anywhere said so. The surface grew; the guards did not.
 *
 * So the required set is NOT written here. It is read from the plugin that owns the tools —
 * `plugins/fpl-hsmem/src/lib/tool-names.ts`, export `MEMORY_WRITE_TOOLS` — which makes the next
 * tool addition a decision ("is this a write?") instead of an omission.
 *
 * WHICH AGENTS ARE IN SCOPE. Only those that already deny `memory_retain`. That is the marker of
 * a role which has decided it does not write memory; this check holds it to that decision in full.
 * An agent with no memory denial at all is out of scope — that is a different question (whether it
 * SHOULD restrict memory), and answering it here would turn one gate into two.
 *
 * Read-only. Never rewrites an agent file: a denylist is a security boundary, and a script that
 * edits security boundaries to make itself pass is the failure mode, not the fix.
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(repoRoot, "plugins");
const SOURCE_OF_TRUTH = path.join(PLUGINS, "fpl-hsmem", "src", "lib", "tool-names.ts");

function loadRequired() {
  if (!fs.existsSync(SOURCE_OF_TRUTH)) {
    throw new Error(
      `cannot read the memory tool registry at ${path.relative(repoRoot, SOURCE_OF_TRUTH)} — ` +
        `refusing to check denylists against a list I could not load`,
    );
  }
  const src = fs.readFileSync(SOURCE_OF_TRUTH, "utf8");
  const block = /export const MEMORY_WRITE_TOOLS = \[([\s\S]*?)\] as const;/.exec(src);
  if (!block) throw new Error("MEMORY_WRITE_TOOLS not found in tool-names.ts");
  const names = [...block[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
  if (names.length === 0) {
    // An empty required set would make every agent pass. That is the vacuous green this repository
    // has been bitten by before; refuse rather than report a meaningless success.
    throw new Error("parsed zero required tools — refusing to report a pass on an empty rule");
  }
  return names;
}

/** Minimal frontmatter read: the key we need is a list or a comma-joined string. */
function denylistOf(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = text.slice(3, end);
  const line = /^disallowedTools:(.*)$/m.exec(fm);
  if (!line) return null;
  const inline = line[1].trim();
  if (inline && inline !== "|" && inline !== ">") {
    return inline.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  // block list form: subsequent "  - value" lines
  const after = fm.slice(line.index + line[0].length);
  const out = [];
  for (const l of after.split("\n")) {
    const m = /^\s+-\s+(.+?)\s*$/.exec(l);
    if (m) out.push(m[1]);
    else if (l.trim() && !/^\s/.test(l)) break;
  }
  return out;
}

const bare = (entry) => String(entry).trim().split("__").pop();

function main() {
  const required = loadRequired();
  const problems = [];
  let scanned = 0;
  let inScope = 0;

  const packs = fs.existsSync(PLUGINS)
    ? fs.readdirSync(PLUGINS, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];
  for (const pack of packs) {
    const dir = path.join(PLUGINS, pack.name, "agents");
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const rel = path.join("plugins", pack.name, "agents", file);
      const text = fs.readFileSync(path.join(dir, file), "utf8");
      scanned++;
      const deny = denylistOf(text);
      if (!deny) continue;
      const names = new Set(deny.map(bare));
      if (!names.has("memory_retain")) continue; // not in scope
      inScope++;
      const missing = required.filter((r) => !names.has(r));
      if (missing.length) problems.push({ rel, missing });
    }
  }

  if (scanned === 0) {
    console.error("memory-denylist-check scanned NO agents — refusing to report a pass.");
    process.exit(1);
  }

  if (problems.length) {
    console.error(
      `memory-denylist-check FAILED: ${problems.length} of ${inScope} memory-restricted agent(s) ` +
        `hold memory write tools their denylist does not mention.\n`,
    );
    for (const p of problems) {
      console.error(`  ${p.rel}`);
      console.error(`    missing: ${p.missing.join(", ")}`);
    }
    console.error(
      `\nAn agent that denies memory_retain has decided it does not write memory. These tools ` +
        `write memory.\nRequired set is derived from plugins/fpl-hsmem/src/lib/tool-names.ts ` +
        `(MEMORY_WRITE_TOOLS) — if one of these is genuinely not a write, take it off that list ` +
        `and say why in the comment above it.`,
    );
    process.exit(1);
  }

  console.log(
    `Memory denylist OK: ${scanned} agent(s) scanned, ${inScope} restrict memory writes, ` +
      `each denying all ${required.length} write tools.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`memory-denylist-check FAILED: ${err.message}`);
  process.exit(1);
}
