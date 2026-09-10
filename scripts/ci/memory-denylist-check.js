#!/usr/bin/env node
/**
 * An agent that is not trusted to write memory must not hold ANY memory write tool — under EITHER
 * name the relay can be reached by.
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
 * BOTH PREFIXES, AND WHY THAT IS THE WHOLE POINT. A denylist matches an EXACT string. The same
 * relay is reachable under two names depending on how it was wired:
 *
 *   mcp__hindsight__<tool>                    — hand-wired as a server in .mcp.json
 *   mcp__plugin_fpl-hsmem_hindsight__<tool>   — installed as this plugin
 *
 * A denylist naming only one spelling denies NOTHING under the other wiring. The first version of
 * this gate compared bare names with the prefix stripped, which made it blind to exactly that: it
 * certified 27 agents as compliant while every one of them named only the plugin spelling, in a
 * workspace whose own standing rules describe `.mcp.json` wiring as supported. The gate reported a
 * property strictly weaker than the one it was written to enforce, and its self-test had no case
 * that could tell the difference. Found by an independent review (EVID-257 F1), not by this file.
 *
 * WHICH AGENTS ARE IN SCOPE. Only those that already deny `memory_retain` (under either spelling).
 * That is the marker of a role which has decided it does not write memory; this check holds it to
 * that decision in full. An agent with no memory denial at all is out of scope — that is a
 * different question (whether it SHOULD restrict memory), and answering it here would turn one gate
 * into two. That boundary has a known cost, named rather than hidden: `fpl-hsmem`'s own
 * `memory-curator` legitimately retains into the bank it curates, so it never enters scope even
 * though it holds the most bank-write authority in the marketplace (EVID-257 F3).
 *
 * Read-only. Never rewrites an agent file: a denylist is a security boundary, and a script that
 * edits security boundaries to make itself pass is the failure mode, not the fix.
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(repoRoot, "plugins");
const SOURCE_OF_TRUTH = path.join(PLUGINS, "fpl-hsmem", "src", "lib", "tool-names.ts");

/**
 * Both names the relay answers to. Adding a third wiring means adding it HERE, once — not in
 * twenty-seven agent files.
 */
const PREFIXES = ["mcp__hindsight__", "mcp__plugin_fpl-hsmem_hindsight__"];

/**
 * How many write tools the registry is expected to hold.
 *
 * Why pin a number at all: removing a name from MEMORY_WRITE_TOOLS makes this gate GREENER, never
 * redder — it is the one edit the control can never catch, because the control derives its
 * expectations from the thing being edited. Pinning the count means a shrink requires a second,
 * deliberate edit in a different file, which is the difference between a decision and a slip
 * (EVID-257 F6). Bump it in the same commit that removes a name, and say why there.
 */
const EXPECTED_REQUIRED_COUNT = 12;

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
  const raw = [...block[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
  // DISTINCT, not raw count. Pinning the raw length catches one shrink shape (delete a line) and
  // misses the other (substitute a duplicate): swapping `document_delete` for a second
  // `memory_retain` keeps the count at 12, passes the pin, and silently stops requiring the single
  // most destructive tool on the list — while the success sentence still says "all 12". Measured on
  // a fixture, not imagined (EVID-258 N1).
  const names = [...new Set(raw)];
  if (names.length === 0) {
    // An empty required set would make every agent pass. That is the vacuous green this repository
    // has been bitten by before; refuse rather than report a meaningless success.
    throw new Error("parsed zero required tools — refusing to report a pass on an empty rule");
  }
  if (raw.length !== names.length) {
    throw new Error(
      `MEMORY_WRITE_TOOLS holds ${raw.length} entries but only ${names.length} distinct tools — ` +
        `a duplicate is how a shrink hides behind an unchanged count. Remove the duplicate, or if a ` +
        `tool was deliberately dropped, say so and update EXPECTED_REQUIRED_COUNT in the same commit.`,
    );
  }
  if (names.length !== EXPECTED_REQUIRED_COUNT) {
    throw new Error(
      `MEMORY_WRITE_TOOLS holds ${names.length} distinct tools, this gate expects ` +
        `${EXPECTED_REQUIRED_COUNT}. If a tool was deliberately added or removed, update ` +
        `EXPECTED_REQUIRED_COUNT in scripts/ci/memory-denylist-check.js in the same commit and say ` +
        `why. Shrinking the rule to make CI green is out of bounds.`,
    );
  }
  return names;
}

/**
 * Minimal frontmatter read.
 *
 * Leading blank lines are tolerated deliberately: requiring `---` at byte 0 meant one stray newline
 * at the top of a file made the agent frontmatter-less, and it left this gate's scope in silence
 * (EVID-258 N2b). Not live on the tree today — which is exactly when to close it, because the whole
 * point of the gate is that an ordinary future edit must not quietly reduce coverage.
 */
function frontmatterOf(text) {
  // \uFEFF written as an escape, never as the literal character: a BOM typed into source is exactly
  // the invisible-codepoint smuggling the repository's unicode gate exists to catch, and it caught
  // this line on the first run.
  const body = text.replace(/^[\s\uFEFF]*/, "");
  if (!body.startsWith("---")) return null;
  const end = body.indexOf("\n---", 3);
  if (end < 0) return null;
  return body.slice(3, end);
}

/**
 * Returns an array of denylist entries, or `null` when the key is absent.
 *
 * Both YAML list indentations are accepted. The earlier version required leading whitespace on list
 * items and treated a non-indented line as the end of the block — so a perfectly valid list written
 * at column 0 parsed as EMPTY and the agent silently left scope, complete denylist or not
 * (EVID-258 N2a).
 */
function denylistOf(fm) {
  const line = /^disallowedTools:(.*)$/m.exec(fm);
  if (!line) return null;
  const inline = line[1].trim();
  if (inline && inline !== "|" && inline !== ">") {
    return inline.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  const after = fm.slice(line.index + line[0].length);
  const out = [];
  for (const l of after.split("\n")) {
    const m = /^\s*-\s+(.+?)\s*$/.exec(l);          // column 0 allowed
    if (m) out.push(m[1]);
    else if (l.trim() && /^\S/.test(l)) break;      // a new top-level key ends the list
  }
  return out;
}

const bare = (entry) => String(entry).trim().split("__").pop();

function main() {
  const required = loadRequired();
  const problems = [];
  const asymmetric = [];
  const misspelled = [];
  const unreadable = [];
  const unknownPrefix = [];
  let scanned = 0;
  let inScope = 0;
  let symmetryChecked = 0;

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
      const fm = frontmatterOf(text);
      if (!fm) continue;

      // An agent whose restricting key is spelled the SKILL way (`disallowed-tools`) restricts
      // nothing and silently leaves scope. Loud, not skipped — a checker that quietly passes over
      // what it does not understand reports success for work it did not do (EVID-257 F5).
      if (/^disallowed-tools:/m.test(fm) && !/^disallowedTools:/m.test(fm)) {
        misspelled.push(rel);
        continue;
      }

      const deny = denylistOf(fm);
      if (!deny) continue;
      // The key is present but nothing parsed out of it. Either the list is genuinely empty or it
      // is written in a shape this parser does not follow — and from the outside those look the
      // same. Loud, per the principle F5 established: a shape the checker cannot read is a refusal,
      // not a skip (EVID-258 N2).
      if (deny.length === 0) {
        unreadable.push(rel);
        continue;
      }
      const exact = new Set(deny.map((e) => String(e).trim()));
      const anyPrefix = new Set(deny.map(bare));

      // CHECK ONE — prefix symmetry, applied to EVERY agent that denies any memory write tool,
      // in scope or not. Denying a tool under one spelling and not the other is never a decision;
      // it is always a half-written denial that stops working the moment the relay is wired the
      // other way. This is the half of EVID-257 F3 that closes cleanly: `fpl-hsmem`'s own
      // memory-curator legitimately retains (so it never enters the scope below) and is the ONLY
      // file in the repository that got both spellings right — with nothing watching it. Now
      // something does.
      const asym = [];
      const alien = [];
      let bothCount = 0;
      for (const name of required) {
        const present = PREFIXES.filter((p) => exact.has(p + name));
        if (present.length === 2) bothCount++;
        if (present.length === 1) {
          asym.push(`${name} (has ${present[0]}, missing ${PREFIXES.find((p) => p !== present[0])})`);
        }
        // PER TOOL, not per agent. The first version tested the unknown prefix once for the whole
        // agent, in an `else` branch — so a single correct both-prefix denial suppressed the report
        // for every other denial on the same file, and one binding under no wiring this repository
        // ships went unnamed while the agent counted as compliant. Demonstrated on a fixture by the
        // activation gate (EVID-259 G3), not reasoned about.
        if (present.length === 0 && anyPrefix.has(name)) {
          const seen = deny.filter((e) => bare(e) === name).map((e) => String(e).trim());
          alien.push(`${name} (named as ${seen.join(", ")} — neither known relay spelling)`);
        }
      }
      if (asym.length) asymmetric.push({ rel, asym });
      if (alien.length) unknownPrefix.push({ rel, alien });
      // Count an agent toward the symmetry tally only when it actually names BOTH spellings of
      // something. The earlier tally counted "mentions a write tool under any prefix", so an agent
      // naming its denials under a THIRD server name was counted in a sentence promising both known
      // spellings — the summary line asserting more than the code checks (EVID-258 N3).
      if (bothCount > 0) symmetryChecked++;

      // CHECK TWO — completeness, applied only to agents that have DECIDED they do not write
      // memory. That decision is marked by denying `memory_retain`.
      if (!anyPrefix.has("memory_retain")) continue; // not in scope
      inScope++;

      const missing = [];
      for (const name of required) {
        for (const p of PREFIXES) {
          if (!exact.has(p + name)) missing.push(p + name);
        }
      }
      if (missing.length) problems.push({ rel, missing });
    }
  }

  if (scanned === 0) {
    console.error("memory-denylist-check scanned NO agents — refusing to report a pass.");
    process.exit(1);
  }

  // EVERY failure class is reported, then one exit. Reporting only the first meant an operator who
  // fixed the asymmetry discovered a second, unrelated failure on the next run — the gate
  // understating its own work, one round-trip at a time (EVID-258 N6).
  let failed = false;
  const fail = (headline, lines) => {
    failed = true;
    console.error(headline + "\n");
    for (const l of lines) console.error(l);
    console.error("");
  };

  if (misspelled.length) {
    fail(
      `memory-denylist-check FAILED: ${misspelled.length} agent(s) spell the restricting key ` +
        `\`disallowed-tools\` (the SKILL form). For a subagent the field is \`disallowedTools\`; ` +
        `spelled the other way it restricts nothing and the agent silently leaves this gate's scope.`,
      misspelled.map((rel) => `  ${rel}`),
    );
  }

  if (unreadable.length) {
    fail(
      `memory-denylist-check FAILED: ${unreadable.length} agent(s) declare \`disallowedTools:\` and ` +
        `nothing parsed out of it. An empty list and a list shape this checker cannot follow look ` +
        `identical from here, and both would drop the agent out of scope in silence.`,
      unreadable.map((rel) => `  ${rel}`),
    );
  }

  if (unknownPrefix.length) {
    fail(
      `memory-denylist-check FAILED: ${unknownPrefix.length} agent(s) deny a memory write tool under ` +
        `a relay prefix this gate does not know. Neither known spelling is present for that tool, so ` +
        `the denial binds under no wiring this repository ships.`,
      unknownPrefix.flatMap((u) => [`  ${u.rel}`, ...u.alien.map((l) => `    ${l}`)]),
    );
  }

  if (inScope === 0) {
    fail(
      `memory-denylist-check FAILED: ${scanned} agent(s) scanned, but NONE is in scope — no agent ` +
        `denies memory_retain. Either every restriction was dropped, or the frontmatter shape ` +
        `changed under this gate. Refusing to report a pass on a check that examined nothing.`,
      [],
    );
  }

  if (asymmetric.length) {
    fail(
      `memory-denylist-check FAILED: ${asymmetric.length} agent(s) deny a memory write tool under ` +
        `ONE relay spelling only. A denylist matches an exact string, so half a denial is no denial ` +
        `under the other wiring.`,
      asymmetric.flatMap((a) => [`  ${a.rel}`, ...a.asym.map((l) => `    ${l}`)]),
    );
  }

  if (problems.length) {
    fail(
      `memory-denylist-check FAILED: ${problems.length} of ${inScope} memory-restricted agent(s) ` +
        `hold memory write tools their denylist does not mention.`,
      [
        ...problems.flatMap((p) => [`  ${p.rel}`, `    missing (${p.missing.length}): ${p.missing.join(", ")}`]),
        "",
        `An agent that denies memory_retain has decided it does not write memory. These tools write ` +
          `memory. Every name must appear under BOTH relay spellings — a denylist matches an exact ` +
          `string, so naming one spelling denies nothing under the other wiring. Required set is ` +
          `derived from plugins/fpl-hsmem/src/lib/tool-names.ts (MEMORY_WRITE_TOOLS) — if one of ` +
          `these is genuinely not a write, take it off that list, say why in the comment above it, ` +
          `and bump EXPECTED_REQUIRED_COUNT in this gate in the same commit.`,
      ],
    );
  }

  if (failed) process.exit(1);

  console.log(
    `Memory denylist OK: ${scanned} agent(s) scanned. ${symmetryChecked} deny at least one memory ` +
      `write tool under BOTH relay spellings, and none names only one. ${inScope} of those have ` +
      `decided they do not write memory at all, and each denies all ${required.length} distinct ` +
      `write tools under both prefixes (${required.length * PREFIXES.length} entries).`,
  );
}

try {
  main();
} catch (err) {
  console.error(`memory-denylist-check FAILED: ${err.message}`);
  process.exit(1);
}
