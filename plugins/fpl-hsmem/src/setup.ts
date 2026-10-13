#!/usr/bin/env node
/**
 * Hindsight onboarding CLI.
 *
 * Run inside a project to scaffold:
 *   .hindsight.json              — the opt-in project config (url, banks, defaultBank, tokenFile)
 *   .claude/rules/hindsight.md   — project-specific Hindsight usage rules
 *
 * The plugin itself registers the MCP server and the hooks; this only opts the project in. There
 * is no default bank: a bank derived from the directory name is how orphan banks were created, so
 * `--bank` is required. The bank must already exist on the server — nothing here creates one.
 *
 * Usage:
 *   node /path/to/fpl-hsmem/dist/setup.mjs --url <url> --bank <id> [--bank <id> ...]
 *        [--token-file <path>] [--no-rules] [--force]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

interface Options {
  banks: string[];
  url?: string;
  tokenFile?: string;
  noRules: boolean;
  force: boolean;
}

function printHelp(): void {
  console.log(`fpl-hsmem setup

Opt the current project in to Hindsight memory by writing .hindsight.json.

Options:
  --url <url>          Hindsight API URL (required)
  --bank <id>          Allowed bank (required; repeat for several — the first is the default)
  --token-file <path>  File holding the bearer token, relative to the project root
  --no-rules           Skip writing .claude/rules/hindsight.md
  --force              Overwrite existing files
  -h, --help           Show this help
`);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { banks: [], noRules: false, force: false };
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

function writeFile(path: string, content: string, force: boolean): "written" | "skipped" {
  if (existsSync(path) && !force) return "skipped";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return "written";
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const config: Record<string, unknown> = {
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
      "document_list",
    ],
  };
  if (opts.tokenFile) config.tokenFile = opts.tokenFile;

  console.log("🧠 fpl-hsmem setup");
  console.log(`📍 Project:  ${cwd}`);
  console.log(`🏦 Banks:    ${opts.banks.join(", ")} (default ${opts.banks[0]})`);
  console.log(`🌐 URL:      ${opts.url}`);

  const cfgStatus = writeFile(join(cwd, ".hindsight.json"), JSON.stringify(config, null, 2) + "\n", opts.force);
  console.log(`  .hindsight.json                 ${cfgStatus}`);

  if (!opts.noRules) {
    let rules = readFileSync(join(PLUGIN_ROOT, "templates", "hindsight-rules.md.template"), "utf-8");
    rules = rules.replaceAll("{{BANK_ID}}", opts.banks[0]);
    const status = writeFile(join(cwd, ".claude", "rules", "hindsight.md"), rules, opts.force);
    console.log(`  .claude/rules/hindsight.md      ${status}`);
  }

  console.log("\n✅ Done. The generated pilot is read-only with both hooks off.");
  console.log("Restart Claude Code here and run memory_get_current_bank to verify.");
  if (cfgStatus === "skipped") console.log("⚠️  .hindsight.json already exists — use --force to overwrite");
}

main();
