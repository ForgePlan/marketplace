#!/usr/bin/env node
/**
 * Batch enrichment CLI — the same pipeline as the `memory_retain_batch` tool, for a human at a
 * shell or a bot host that runs commands rather than MCP tools.
 *
 *   node dist/enrich.mjs <candidates.jsonl> [--apply --confirm <digest>] [--allow-replace-foreign]
 *                        [--max-chars N] [--batch-size N] [--samples N] [--json]
 *
 * Configuration is the project's `.hindsight.json`, found walking up from the working directory —
 * the same file, allowlist and `routing` the MCP server uses, and the same rule that the file must
 * be inside the project. Dry run is the default: nothing is written without `--apply`. The digest
 * supplied with `--confirm` proves only that the file and resolved plan are still fresh; it does
 * not grant authorization, ownership, or permission to write. The operator must be independently
 * authorized to invoke apply.
 *
 * Exit codes: 0 — every line accepted (and, with --apply, every batch queued); 3 — some lines
 * refused (the rest were planned / written); 1 — config, file, server, confirmation or batch
 * failure; 2 — usage.
 */

import { readFileSync } from "node:fs";
import { BankGate } from "./lib/banks.js";
import { ENRICH_MAX_CHARS_LIMIT, loadProjectConfig } from "./lib/config.js";
import {
  DEFAULT_BATCH_SIZE,
  applyEnrichPlan,
  confirmRefusal,
  enrichSummary,
  formatEnrichReport,
  planEnrich,
} from "./lib/enrich.js";
import { assertInsideProject } from "./lib/paths.js";
import { redact } from "./lib/redact.js";

const USAGE =
  "usage: enrich.mjs <candidates.jsonl> [--apply --confirm <digest>] [--allow-replace-foreign] " +
  `[--max-chars N (≤ ${ENRICH_MAX_CHARS_LIMIT})] [--batch-size N] [--samples N] [--json]`;

function fail(code: number, message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

const argv = process.argv.slice(2);
let file: string | undefined;
let apply = false;
let confirm: string | undefined;
let allowReplaceForeign = false;
let json = false;
let maxChars: number | undefined;
let batchSize = DEFAULT_BATCH_SIZE;
let samples = 2;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const num = () => {
    const n = Number(argv[++i]);
    if (!Number.isInteger(n) || n < 0) fail(2, `${a} needs a non-negative integer\n${USAGE}`);
    return n;
  };
  if (a === "--apply") apply = true;
  else if (a === "--confirm") {
    confirm = argv[++i];
    if (!confirm) fail(2, `--confirm needs the digest from the dry run\n${USAGE}`);
  } else if (a === "--allow-replace-foreign") allowReplaceForeign = true;
  else if (a === "--json") json = true;
  else if (a === "--max-chars") {
    maxChars = num();
    if (maxChars < 1 || maxChars > ENRICH_MAX_CHARS_LIMIT) fail(2, `--max-chars must be 1..${ENRICH_MAX_CHARS_LIMIT}\n${USAGE}`);
  } else if (a === "--batch-size") batchSize = num();
  else if (a === "--samples") samples = num();
  else if (a === "-h" || a === "--help") fail(0, USAGE);
  else if (a.startsWith("-")) fail(2, `unknown option ${a}\n${USAGE}`);
  else if (file === undefined) file = a;
  else fail(2, `one file at a time\n${USAGE}`);
}
if (!file) fail(2, USAGE);
if (confirm !== undefined && !apply) fail(2, `--confirm only makes sense with --apply\n${USAGE}`);

const loaded = loadProjectConfig(process.cwd());
if (loaded.state === "missing") {
  fail(1, `Hindsight is not configured: ${redact(loaded.reason)}`);
}
if (loaded.state === "disabled") {
  fail(1, `Hindsight configuration is disabled: ${redact(loaded.reason)}`);
}
if (loaded.state === "invalid") {
  fail(1, `Hindsight configuration is invalid: ${redact(loaded.reason)}`);
}
const config = loaded.config;

let path: string;
let bytes: Buffer;
try {
  // The same rule as the MCP tool: only a file inside the project, symlinks followed, size-capped.
  path = assertInsideProject(file, config.projectRoot);
  bytes = readFileSync(path);
} catch (err) {
  fail(1, (err as Error).message);
}

const gate = new BankGate(config);
try {
  const plan = await planEnrich(
    bytes,
    { maxChars: maxChars ?? config.enrichMaxChars, routing: config.routing, allowReplaceForeign },
    (b) => gate.resolve(b),
  );
  if (apply) {
    const refusal = confirmRefusal(plan, confirm);
    if (refusal) fail(1, refusal);
  }
  const applied = apply ? await applyEnrichPlan(plan, batchSize) : undefined;
  process.stdout.write(
    (json
      ? JSON.stringify(enrichSummary(path, plan, applied), null, 2)
      : formatEnrichReport(path, plan, applied, {
          samples,
          batchSize,
          applyHint:
            `Digest ${plan.digest} proves only file/plan freshness and grants no authorization. ` +
            `If separately authorized to write, an operator may re-run with --apply --confirm ${plan.digest}` +
            (allowReplaceForeign ? " --allow-replace-foreign" : "") +
            (maxChars !== undefined ? ` --max-chars ${maxChars}` : ""),
        })) + "\n",
  );
  if (applied?.some((r) => r.error)) process.exit(1);
  process.exit(plan.refused.length ? 3 : 0);
} catch (err) {
  fail(1, `enrich failed: ${redact((err as Error).message).slice(0, 500)}`);
}
