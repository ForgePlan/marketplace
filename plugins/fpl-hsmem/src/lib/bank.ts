import { execFileSync } from "node:child_process";
import { basename, dirname, normalize, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

interface McpJson {
  mcpServers?: Record<string, { env?: Record<string, string> }>;
}


/**
 * The directory a project's identity should be anchored to.
 *
 * Anchoring on raw `cwd` means the same project resolves differently depending on which
 * subdirectory an agent happens to be started from — which is how one project ended up with two
 * banks holding 7,011 and 4,684 memories, neither of which could see the other.
 *
 * Order: nearest ancestor declaring config, then the git top level, then cwd.
 */
export function resolveProjectRoot(cwd: string): string {
  if (!cwd) return process.cwd();
  let dir = normalize(cwd);
  for (;;) {
    if (existsSync(join(dir, ".mcp.json")) || existsSync(join(dir, ".hindsight.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  try {
    const out = execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    if (out) return out;
  } catch {
    // not a git repo, git unavailable, or timeout
  }
  return normalize(cwd);
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
 * DEPRECATED — do not call for anything that must agree with the MCP server.
 *
 * This reads ONLY `.mcp.json`, while `loadConfig()` also honours `~/.hindsight/config.json`,
 * `.hindsight.json` and the environment. The two disagreed silently and split one project's memory
 * across two banks. `loadConfig().bankId` is a strict superset; use it. Kept only so an external
 * caller does not break at the import.
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
