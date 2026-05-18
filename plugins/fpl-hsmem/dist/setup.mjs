#!/usr/bin/env node

// src/setup.ts
import { readFileSync as readFileSync2, writeFileSync, existsSync as existsSync2, mkdirSync } from "node:fs";
import { dirname, join as join2, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/lib/bank.ts
import { execFileSync } from "node:child_process";
import { basename, normalize, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
function resolveProjectName(cwd, resolveWorktrees = true) {
  if (!cwd) return "unknown";
  if (!resolveWorktrees) {
    return basename(normalize(cwd));
  }
  try {
    const out = execFileSync(
      "git",
      ["-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: 5e3 }
    ).trim();
    if (out) {
      const mainRepoPath = out.replace(/\/\.git\/?$/, "");
      const name = basename(mainRepoPath);
      if (name) return name;
    }
  } catch {
  }
  return basename(normalize(cwd));
}

// src/setup.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var HINDSIGHT_MCP_PATH = resolve(__dirname, "..");
function parseArgs(argv) {
  const opts = {
    url: "http://localhost:8888",
    committed: false,
    noHooks: false,
    noRules: false,
    force: false
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
function printHelp() {
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
function renderTemplate(name, vars) {
  const path = join2(HINDSIGHT_MCP_PATH, "templates", name);
  let raw = readFileSync2(path, "utf-8");
  for (const [k, v] of Object.entries(vars)) {
    raw = raw.replaceAll(`{{${k}}}`, v);
  }
  return raw;
}
function writeFile(path, content, force) {
  if (existsSync2(path) && !force) {
    return "skipped";
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return "written";
}
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const bankId = opts.bank ?? resolveProjectName(cwd);
  console.log("\u{1F9E0} Hindsight MCP setup");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  console.log(`\u{1F4CD} Project:        ${cwd}`);
  console.log(`\u{1F3E6} Bank ID:        ${bankId}`);
  console.log(`\u{1F310} Hindsight URL:  ${opts.url}`);
  console.log(`\u{1F4E6} MCP path:       ${HINDSIGHT_MCP_PATH}`);
  console.log("");
  const vars = {
    HINDSIGHT_MCP_PATH,
    HINDSIGHT_URL: opts.url,
    BANK_ID: bankId
  };
  const mcpContent = renderTemplate("mcp.json.template", vars);
  const mcpPath = join2(cwd, ".mcp.json");
  const mcpStatus = writeFile(mcpPath, mcpContent, opts.force);
  console.log(`  .mcp.json                       ${mcpStatus}`);
  if (!opts.noHooks) {
    const hookContent = renderTemplate("claude-settings.json.template", vars);
    const hookFile = opts.committed ? "settings.json" : "settings.local.json";
    const hookPath = join2(cwd, ".claude", hookFile);
    const hookStatus = writeFile(hookPath, hookContent, opts.force);
    console.log(`  .claude/${hookFile.padEnd(24)}${hookStatus}`);
    if (!opts.committed) {
      const gitignorePath = join2(cwd, ".gitignore");
      if (existsSync2(gitignorePath)) {
        const gi = readFileSync2(gitignorePath, "utf-8");
        if (!gi.includes(".claude/settings.local.json")) {
          writeFileSync(gitignorePath, `${gi.replace(/\n?$/, "\n")}.claude/settings.local.json
`);
          console.log("  .gitignore                      updated");
        }
      }
    }
  }
  if (!opts.noRules) {
    const rulesContent = renderTemplate("hindsight-rules.md.template", vars);
    const rulesPath = join2(cwd, ".claude", "rules", "hindsight.md");
    const rulesStatus = writeFile(rulesPath, rulesContent, opts.force);
    console.log(`  .claude/rules/hindsight.md      ${rulesStatus}`);
  }
  console.log("");
  console.log("\u2705 Done. Next steps:");
  console.log(`   1. Make sure Hindsight is running:  curl ${opts.url}/health`);
  console.log("   2. Restart Claude Code in this project");
  console.log("   3. Try: 'memory_status' tool to verify connection");
  if (mcpStatus === "skipped") {
    console.log("");
    console.log("\u26A0\uFE0F  .mcp.json already exists \u2014 use --force to overwrite");
  }
}
main();
