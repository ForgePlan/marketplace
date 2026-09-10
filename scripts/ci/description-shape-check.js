#!/usr/bin/env node
/**
 * A plugin description must be whole, and it must say when to reach for the plugin.
 *
 * THE DEFECT THIS EXISTS TO CATCH. A release script appended a note to several descriptions and
 * capped the result with a slice. Three descriptions were longer than the cap, so it cut them
 * mid-word — "…StructuredOutput-", "…the bot is a membe", "…fixed the _content_s" — and shipped
 * them to the catalog. Nothing noticed: the JSON was valid, the manifest validated, every gate went
 * green. A cap chosen to keep things tidy silently destroyed text.
 *
 * TWO CHECKS, and the second is the one CONTRIBUTING.md actually asks for.
 *
 * 1. WHOLE. A description must end like a sentence. This is the signature of truncation and it is
 *    cheap: a slice almost never lands on a full stop. It is a heuristic, and it is stated as one —
 *    it catches the accident, not every possible mangling.
 *
 * 2. USEFUL. CONTRIBUTING.md says "Brief description of what the plugin does", and the shape the
 *    marketplace actually converged on is: what it is, what it does, and "Use when ...". The last
 *    part is the one that decides whether a reader can tell if this plugin is for them. Missing it
 *    is a WARNING, not a failure — descriptions here have grown into changelogs over many releases
 *    and failing CI on all of them would be a reform, not a gate. The warning names them so the
 *    reform can happen deliberately.
 *
 * Read-only. Never rewrites a description: the last script that "tidied" one destroyed three.
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(repoRoot, "plugins");
const CATALOG = path.join(repoRoot, ".claude-plugin", "marketplace.json");

/** A description that ends like this was almost certainly cut. */
const ENDS_WHOLE = /[.!?)»"'`\]]\s*$/;

function main() {
  if (!fs.existsSync(PLUGINS)) {
    console.error("description-shape-check: no plugins/ directory — refusing to report a pass.");
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  let scanned = 0;

  const dirs = fs.readdirSync(PLUGINS, { withFileTypes: true }).filter((d) => d.isDirectory());
  const fromCatalog = fs.existsSync(CATALOG)
    ? new Map(
        (JSON.parse(fs.readFileSync(CATALOG, "utf8")).plugins ?? [])
          .filter((p) => typeof p.description === "string")
          .map((p) => [p.name, p.description]),
      )
    : new Map();

  for (const d of dirs) {
    const manifest = path.join(PLUGINS, d.name, ".claude-plugin", "plugin.json");
    if (!fs.existsSync(manifest)) continue;
    scanned++;
    const desc = JSON.parse(fs.readFileSync(manifest, "utf8")).description;

    if (typeof desc !== "string" || desc.trim().length === 0) {
      errors.push(`${d.name}: description is missing or empty`);
      continue;
    }
    if (!ENDS_WHOLE.test(desc)) {
      errors.push(
        `${d.name}: description ends mid-sentence — "…${desc.slice(-48)}"\n` +
          `      This is the signature of a truncating slice. Restore the full text; do not re-cut it.`,
      );
    }
    // The catalog is what users read. A row that disagrees with its manifest ships the wrong text.
    const cat = fromCatalog.get(d.name);
    if (cat !== undefined && cat !== desc) {
      errors.push(`${d.name}: the catalog description differs from the manifest — regenerate it`);
    }
    // Look for a sentence that starts with "Use …", not for the literal phrase "use when". The
    // first version of this check demanded the exact words and flagged two descriptions that say
    // "Use only if you already depend on it" and "Use before a review or a merge" — both of which
    // tell a reader exactly when to reach for the plugin. A check that asserts the wording rather
    // than the property is how a gate ends up enforcing a house style nobody agreed to.
    if (!/(^|[.!?]\s+)use\b/i.test(desc) && !/(^|[.!?]\s+)использу/i.test(desc)) {
      warnings.push(`${d.name} (${desc.length} chars): no sentence saying when to use it — a reader cannot tell if it is for them`);
    }
  }

  if (scanned === 0) {
    console.error("description-shape-check scanned NO plugin manifests — refusing to report a pass.");
    process.exit(1);
  }

  if (warnings.length) {
    console.log(`description-shape-check: ${warnings.length} of ${scanned} descriptions do not say when to use the plugin`);
    for (const w of warnings) console.log(`  warn  ${w}`);
    console.log("");
  }

  if (errors.length) {
    console.error(`description-shape-check FAILED: ${errors.length} problem(s) across ${scanned} plugin(s)\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`Description shape OK: ${scanned} description(s) whole and in step with the catalog.`);
}

try {
  main();
} catch (err) {
  console.error(`description-shape-check FAILED: ${err.message}`);
  process.exit(1);
}
