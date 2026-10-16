#!/usr/bin/env node

// src/setup.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = dirname(fileURLToPath(import.meta.url));
var PLUGIN_ROOT = resolve(__dirname, "..");
function printHelp() {
  console.log(`fpl-hsmem setup

Opt the current project in to Hindsight memory by writing .hindsight.json.

Options:
  --url <url>          Hindsight API URL (required)
  --bank <id>          Allowed bank (required; repeat for several \u2014 the first is the default)
  --token-file <path>  File holding the bearer token, relative to the project root
  --no-rules           Skip writing .claude/rules/hindsight.md
  --force              Overwrite existing files
  -h, --help           Show this help
`);
}
function parseArgs(argv) {
  const opts = { banks: [], noRules: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--bank":
        opts.banks.push(argv[++i]);
        break;
      case "--url":
        opts.url = argv[++i];
        break;
      case "--token-file":
        opts.tokenFile = argv[++i];
        break;
      case "--no-rules":
        opts.noRules = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }
  if (!opts.url || opts.banks.length === 0) {
    console.error("--url and at least one --bank are required");
    printHelp();
    process.exit(1);
  }
  return opts;
}
function writeFile(path, content, force) {
  if (existsSync(path) && !force) return "skipped";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return "written";
}
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const config = {
    url: opts.url,
    banks: opts.banks,
    defaultBank: opts.banks[0],
    autoRecall: false,
    autoRetain: false,
    // Stage-0 pilot: explicit, minimal, read-only. Writes need a later authorization and policy edit.
    allowTools: [
      "memory_recall",
      "memory_status",
      "memory_get_current_bank",
      "memory_list",
      "memory_get",
      "memory_operations",
      "mental_model_list",
      "mental_model_get",
      "directive_list",
      "bank_config_get",
      "document_list"
    ]
  };
  if (opts.tokenFile) config.tokenFile = opts.tokenFile;
  console.log("\u{1F9E0} fpl-hsmem setup");
  console.log(`\u{1F4CD} Project:  ${cwd}`);
  console.log(`\u{1F3E6} Banks:    ${opts.banks.join(", ")} (default ${opts.banks[0]})`);
  console.log(`\u{1F310} URL:      ${opts.url}`);
  const cfgStatus = writeFile(join(cwd, ".hindsight.json"), JSON.stringify(config, null, 2) + "\n", opts.force);
  console.log(`  .hindsight.json                 ${cfgStatus}`);
  if (!opts.noRules) {
    let rules = readFileSync(join(PLUGIN_ROOT, "templates", "hindsight-rules.md.template"), "utf-8");
    rules = rules.replaceAll("{{BANK_ID}}", opts.banks[0]);
    const status = writeFile(join(cwd, ".claude", "rules", "hindsight.md"), rules, opts.force);
    console.log(`  .claude/rules/hindsight.md      ${status}`);
  }
  console.log("\n\u2705 Done. The generated pilot is read-only with both hooks off.");
  console.log("Restart Claude Code here and run memory_get_current_bank to verify.");
  if (cfgStatus === "skipped") console.log("\u26A0\uFE0F  .hindsight.json already exists \u2014 use --force to overwrite");
}
main();
