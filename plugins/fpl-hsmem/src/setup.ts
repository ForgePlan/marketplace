#!/usr/bin/env node
/**
 * Hindsight MCP onboarding CLI.
 *
 * Run inside a project to scaffold:
 *   .mcp.json                          — MCP server registration (per-project bank)
 *   .claude/settings.local.json        — local hooks (default, gitignored)
 *   .claude/settings.json              — committed hooks (with --committed flag)
 *   .claude/rules/hindsight.md         — project-specific Hindsight usage rules
 *
 * Usage:
 *   node /path/to/hindsight-mcp/dist/setup.js [options]
 *
 * Options:
 *   --bank <id>           Bank ID (default: derived from git/cwd)
 *   --url <url>           Hindsight URL (default: http://localhost:8888)
 *   --committed           Write .claude/settings.json (visible to team via git)
 *   --no-hooks            Skip writing hook settings
 *   --no-rules            Skip writing .claude/rules/hindsight.md
 *   --force               Overwrite existing files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProjectName } from "./lib/bank.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HINDSIGHT_MCP_PATH = resolve(__dirname, "..");

interface Options {
  bank?: string;
  url: string;
  committed: boolean;
  noHooks: boolean;
  noRules: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    url: "http://localhost:8888",
    committed: false,
    noHooks: false,
    noRules: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--bank":
        opts.bank = argv[++i];
        break;
      case "--url":
        opts.url = argv[++i];
        break;
      case "--committed":
        opts.committed = true;
        break;
      case "--no-hooks":
        opts.noHooks = true;
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
  return opts;
}

function printHelp(): void {
  console.log(`hindsight-mcp setup

Scaffold .mcp.json + Claude Code hook settings + Hindsight usage rules
into the current project.

Options:
  --bank <id>      Bank ID (default: derived from project name)
  --url <url>      Hindsight URL (default: http://localhost:8888)
  --committed      Write .claude/settings.json (visible to team via git)
                   Default: .claude/settings.local.json (your machine only)
  --no-hooks       Skip hook registration
  --no-rules       Skip writing .claude/rules/hindsight.md
  --force          Overwrite existing files
  -h, --help       Show this help
`);
}

function renderTemplate(name: string, vars: Record<string, string>): string {
  const path = join(HINDSIGHT_MCP_PATH, "templates", name);
  let raw = readFileSync(path, "utf-8");
  for (const [k, v] of Object.entries(vars)) {
    raw = raw.replaceAll(`{{${k}}}`, v);
  }
  return raw;
}

function writeFile(path: string, content: string, force: boolean): "written" | "skipped" {
  if (existsSync(path) && !force) {
    return "skipped";
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return "written";
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const bankId = opts.bank ?? resolveProjectName(cwd);

  console.log("🧠 Hindsight MCP setup");
  console.log("──────────────────────");
  console.log(`📍 Project:        ${cwd}`);
  console.log(`🏦 Bank ID:        ${bankId}`);
  console.log(`🌐 Hindsight URL:  ${opts.url}`);
  console.log(`📦 MCP path:       ${HINDSIGHT_MCP_PATH}`);
  console.log("");

  const vars = {
    HINDSIGHT_MCP_PATH,
    HINDSIGHT_URL: opts.url,
    BANK_ID: bankId,
  };

  const mcpContent = renderTemplate("mcp.json.template", vars);
  const mcpPath = join(cwd, ".mcp.json");
  const mcpStatus = writeFile(mcpPath, mcpContent, opts.force);
  console.log(`  .mcp.json                       ${mcpStatus}`);

  if (!opts.noHooks) {
    const hookContent = renderTemplate("claude-settings.json.template", vars);
    const hookFile = opts.committed ? "settings.json" : "settings.local.json";
    const hookPath = join(cwd, ".claude", hookFile);
    const hookStatus = writeFile(hookPath, hookContent, opts.force);
    console.log(`  .claude/${hookFile.padEnd(24)}${hookStatus}`);

    if (!opts.committed) {
      const gitignorePath = join(cwd, ".gitignore");
      if (existsSync(gitignorePath)) {
        const gi = readFileSync(gitignorePath, "utf-8");
        if (!gi.includes(".claude/settings.local.json")) {
          writeFileSync(gitignorePath, `${gi.replace(/\n?$/, "\n")}.claude/settings.local.json\n`);
          console.log("  .gitignore                      updated");
        }
      }
    }
  }

  if (!opts.noRules) {
    const rulesContent = renderTemplate("hindsight-rules.md.template", vars);
    const rulesPath = join(cwd, ".claude", "rules", "hindsight.md");
    const rulesStatus = writeFile(rulesPath, rulesContent, opts.force);
    console.log(`  .claude/rules/hindsight.md      ${rulesStatus}`);
  }

  console.log("");
  console.log("✅ Done. Next steps:");
  console.log(`   1. Make sure Hindsight is running:  curl ${opts.url}/health`);
  console.log("   2. Restart Claude Code in this project");
  console.log("   3. Try: 'memory_status' tool to verify connection");
  if (mcpStatus === "skipped") {
    console.log("");
    console.log("⚠️  .mcp.json already exists — use --force to overwrite");
  }
}

main();
