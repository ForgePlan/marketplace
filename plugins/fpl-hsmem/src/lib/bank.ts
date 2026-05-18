import { execFileSync } from "node:child_process";
import { basename, normalize, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

interface McpJson {
  mcpServers?: Record<string, { env?: Record<string, string> }>;
}

/**
 * Resolve the project's "name" (basename of the main repo or the cwd).
 *
 * For git repos with worktrees, all worktrees of the same repo resolve to the
 * same name — so memory does not fragment across short-lived branches.
 */
export function resolveProjectName(cwd: string, resolveWorktrees = true): string {
  if (!cwd) return "unknown";

  if (!resolveWorktrees) {
    return basename(normalize(cwd));
  }

  try {
    const out = execFileSync(
      "git",
      ["-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 },
    ).trim();
    if (out) {
      const mainRepoPath = out.replace(/\/\.git\/?$/, "");
      const name = basename(mainRepoPath);
      if (name) return name;
    }
  } catch {
    // not a git repo, git unavailable, or timeout — fall through
  }

  return basename(normalize(cwd));
}

/**
 * Read the bank_id declared in the project's .mcp.json (single source of truth).
 *
 * Falls back to resolveProjectName(cwd) if no .mcp.json or no bank declared.
 */
export function deriveBankId(cwd: string): string {
  const path = join(cwd, ".mcp.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as McpJson;
      const declared = raw.mcpServers?.hindsight?.env?.HINDSIGHT_BANK_ID;
      if (declared && declared.trim()) return declared.trim();
    } catch {
      // ignore malformed .mcp.json
    }
  }
  return resolveProjectName(cwd);
}
