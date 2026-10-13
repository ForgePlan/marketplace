import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  type Stats,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { TOOL_NAMES } from "./tool-names.js";

/**
 * Project-only, opt-in configuration.
 *
 * WHY THIS IS STRICT. Upstream resolved a bank from five sources (built-in defaults,
 * `~/.hindsight/config.json`, `.mcp.json`, `.hindsight.json`, env) and, when none named a bank,
 * derived one from the directory name. That made the plugin active in every project on the machine
 * — including personal ones — and every new directory silently created an orphan bank on first
 * write. There is exactly one source of truth: a `.hindsight.json` found by walking up
 * from cwd — no further than the repository's git toplevel, and never in the home directory. No
 * file, no plugin: the MCP server lists no tools and every hook is a no-op.
 *
 * WHY THE CONFIG IS NOT TRUSTED BLINDLY. A `.hindsight.json` can be committed by whoever controls
 * the repository, and it names both the server and where the token comes from. So it may only read
 * a token file inside its own directory, may run a `tokenCommand` only when the user opted in via
 * HINDSIGHT_ALLOW_TOKEN_COMMAND=1, and never receives the user's env token (HINDSIGHT_API_KEY)
 * unless the user also chose the server (HINDSIGHT_URL). Otherwise a cloned repo could point the
 * plugin at its own host and collect any readable file, or the user's key, as a bearer token.
 *
 * Schema (`.hindsight.json`):
 *   url           string    required. Hindsight API base, e.g. "http://hindsight.example:8888".
 *   banks         string[]  required, non-empty. Allowlist — the only banks any tool may touch.
 *   defaultBank   string    required, must be in `banks`. Used when a tool call omits `bank`, and
 *                           the only bank the recall hook ever reads.
 *   tokenFile     string    optional. Path to a file holding the bearer token; relative paths are
 *                           resolved against the directory containing `.hindsight.json`, and the
 *                           real path (symlinks followed) must stay inside that directory.
 *   tokenCommand  string[]  optional. argv (no shell) whose stdout is the token. Used only when
 *                           `tokenFile` is absent, and only with HINDSIGHT_ALLOW_TOKEN_COMMAND=1.
 *   allowTools    string[]  optional. Tool policy: when present, only these tools are listed.
 *   denyTools     string[]  optional. Tool policy: these tools are never listed. Both name tools
 *                           from TOOL_NAMES; an unknown name invalidates the config.
 *   autoRecall    boolean   optional, default false. Inject recalled memories before each prompt.
 *   autoRetain    boolean   optional, default false. Capture the session transcript on Stop /
 *                           SessionEnd. Off by default on purpose — see CONFIGURATION.md.
 *   ...tuning     optional  recallBudget, recallMaxTokens, recallTypes, recallContextTurns,
 *                           recallMaxQueryChars, recallRoles, recallPromptPreamble,
 *                           retainEveryNTurns, retainRoles, retainToolCalls, retainContext,
 *                           retainTags, debug, enrichMaxChars (≤ 2000).
 *   routing       object    optional. Batch enrichment only (memory_retain_batch / enrich.mjs):
 *                           maps a repository name or glob (`*`, `?`) to a bank, used for a
 *                           candidate that names no `bank`. Every target must be in `banks`.
 *
 * Environment variables may override `url` (HINDSIGHT_URL) of a project that is ALREADY configured,
 * and supply the token (HINDSIGHT_API_KEY) — but only together with HINDSIGHT_URL. They can never
 * enable a project: without the file, env is ignored.
 */
export const CONFIG_FILE = ".hindsight.json";

/** The ceiling for `enrichMaxChars` and the CLI's `--max-chars`: an item, not a document. */
export const ENRICH_MAX_CHARS_LIMIT = 2000;

/** The opt-in a user (never a repository) gives before a config may run a token command. */
export const ALLOW_TOKEN_COMMAND_ENV = "HINDSIGHT_ALLOW_TOKEN_COMMAND";

export interface HindsightConfig {
  url: string;
  banks: string[];
  defaultBank: string;
  /** Acquire the credential only when a network request is about to be sent. */
  getApiKey: () => string;
  autoRecall: boolean;
  autoRetain: boolean;
  recallBudget: "low" | "mid" | "high";
  recallMaxTokens: number;
  recallTypes: string[];
  recallContextTurns: number;
  recallMaxQueryChars: number;
  recallRoles: string[];
  recallPromptPreamble: string;
  retainEveryNTurns: number;
  retainOverlapTurns: number;
  retainRoles: string[];
  retainToolCalls: boolean;
  retainContext: string;
  retainTags: string[];
  debug: boolean;
  /** Batch enrichment: the longest `content` a candidate item may carry. */
  enrichMaxChars: number;
  /**
   * Batch enrichment: repository name or glob → bank, for candidates without an explicit `bank`.
   * Declaration order is kept; an exact name beats a glob, and the first matching glob wins.
   */
  routing: Record<string, string>;
  /** Tools this project exposes, after `allowTools` / `denyTools`. In TOOL_NAMES order. */
  enabledTools: string[];
  /** Absolute path of the `.hindsight.json` that configured this project. */
  configPath: string;
  /** The directory containing it — the project root for ingest path checks. */
  projectRoot: string;
  /** Where the token came from, for memory_status. Never the token itself. */
  tokenSource: "env" | "tokenFile" | "tokenCommand" | "none";
}

export type LoadResult =
  | { state: "active"; config: HindsightConfig }
  | { state: "missing"; reason: string }
  | { state: "disabled"; reason: string; configPath: string }
  | { state: "invalid"; reason: string; configPath: string };

const TUNING_DEFAULTS = {
  autoRecall: false,
  autoRetain: false,
  recallBudget: "mid" as const,
  recallMaxTokens: 1024,
  recallTypes: ["world", "experience"],
  recallContextTurns: 1,
  recallMaxQueryChars: 800,
  recallRoles: ["user", "assistant"],
  recallPromptPreamble:
    "Relevant memories from past conversations (prioritize recent when conflicting). Only use memories that are directly useful to continue this conversation; ignore the rest:",
  retainEveryNTurns: 10,
  retainOverlapTurns: 2,
  retainRoles: ["user", "assistant"],
  retainToolCalls: false,
  retainContext: "claude-code",
  retainTags: ["{session_id}"],
  debug: false,
  enrichMaxChars: 900,
};

type Tuning = typeof TUNING_DEFAULTS;
const TUNING_TYPES: Record<keyof Tuning, "boolean" | "number" | "string" | "string[]"> = {
  autoRecall: "boolean",
  autoRetain: "boolean",
  recallBudget: "string",
  recallMaxTokens: "number",
  recallTypes: "string[]",
  recallContextTurns: "number",
  recallMaxQueryChars: "number",
  recallRoles: "string[]",
  recallPromptPreamble: "string",
  retainEveryNTurns: "number",
  retainOverlapTurns: "number",
  retainRoles: "string[]",
  retainToolCalls: "boolean",
  retainContext: "string",
  retainTags: "string[]",
  debug: "boolean",
  enrichMaxChars: "number",
};

/**
 * Keys accepted before 3.7.0 that would reintroduce what was removed. Refused loudly rather than
 * ignored: a config that says `bankId: "x"` and silently gets `defaultBank` instead is the
 * split-memory bug in a new form.
 */
const LEGACY_KEYS: Record<string, string> = {
  bankId: "use `banks` + `defaultBank`",
  apiKey: "never put the token in the config file; use `tokenFile` or `tokenCommand`",
  bankMission: "missions are set with memory_set_mission (reflect_mission), not from config",
  retainMission: "retain_mission is an operator setting on the server, not a client config key",
  enabled: "presence of the file is the switch; delete it (or add .hindsight-disabled) to turn off",
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x.length > 0);
}

/** `path` is `root` or below it. Both must already be normalized (or both real paths). */
function isWithin(path: string, root: string): boolean {
  return path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);
}

/** The nearest directory at or above `start` holding `.git` (dir or worktree file), not above home. */
function gitToplevel(start: string, home: string): string | null {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (dir === home || parent === dir) return null;
    dir = parent;
  }
}

/**
 * Nearest `.hindsight.json` at or above `cwd`, or null.
 *
 * The walk stops at the git toplevel of `cwd`; outside a repository it stops at the home directory,
 * and outside both only `cwd` itself is checked. `$HOME/.hindsight.json` is never read: a config
 * there would activate every project under the home directory, which is what this fork removed.
 * A config above the repository is likewise not this repository's decision.
 */
export function findConfigFile(cwd: string): string | null {
  const start = normalize(resolve(cwd || process.cwd()));
  const home = normalize(resolve(process.env.HOME || homedir()));
  const stop = gitToplevel(start, home) ?? (isWithin(start, home) ? home : start);
  let dir = start;
  for (;;) {
    if (dir !== home) {
      const candidate = join(dir, CONFIG_FILE);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (dir === stop || parent === dir) return null;
    dir = parent;
  }
}

/**
 * Opt-out signals on top of the opt-in file:
 *   - `.hindsight-disabled` marker next to `.hindsight.json` (or in cwd)
 *   - `HINDSIGHT_DISABLED=true`
 */
export function isDisabled(cwd: string = process.cwd(), configDir?: string): boolean {
  if (existsSync(join(cwd, ".hindsight-disabled"))) return true;
  if (configDir && existsSync(join(configDir, ".hindsight-disabled"))) return true;
  const env = process.env.HINDSIGHT_DISABLED ?? "";
  return ["1", "true", "yes", "on"].includes(env.toLowerCase());
}

interface TokenBinding {
  source: HindsightConfig["tokenSource"];
  load: () => string;
}

interface FileIdentity {
  dev: number;
  ino: number;
}


/**
 * Validate the token source without acquiring the token. The returned loader is called only by the
 * first network request, after configuration has been classified as active.
 */
function bindToken(raw: Record<string, unknown>, configDir: string): TokenBinding {
  // The env token goes only to a server the user chose too. A repository's config picks `url`; the
  // user's key must never follow a url the user did not set.
  const envKey = process.env.HINDSIGHT_API_KEY?.trim();
  if (envKey && process.env.HINDSIGHT_URL) return { source: "env", load: () => envKey };
  if (raw.tokenFile !== undefined) {
    if (typeof raw.tokenFile !== "string" || !raw.tokenFile) {
      throw new Error("`tokenFile` must be a non-empty string");
    }
    const path = isAbsolute(raw.tokenFile) ? raw.tokenFile : resolve(configDir, raw.tokenFile);
    let real: string;
    let root: string;
    try {
      real = realpathSync(path);
      root = realpathSync(configDir);
    } catch {
      throw new Error("`tokenFile` could not be resolved");
    }
    // Symlinks are followed before the containment check, but the resolved target identity is
    // pinned now. The content itself remains unread until the first network-bound request.
    if (real === root || !isWithin(real, root)) {
      throw new Error("`tokenFile` must resolve to a file inside the project");
    }
    let expected: FileIdentity;
    try {
      const bound = statSync(real);
      if (!bound.isFile()) throw new Error();
      expected = { dev: bound.dev, ino: bound.ino };
    } catch {
      throw new Error("`tokenFile` must resolve to a regular file");
    }
    return {
      source: "tokenFile",
      load: () => {
        let fd: number;
        try {
          // O_NOFOLLOW closes the final-component symlink race on platforms that provide it.
          // Platforms without it remain safe because the descriptor identity is checked below.
          const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
          const nonBlock = typeof constants.O_NONBLOCK === "number" ? constants.O_NONBLOCK : 0;
          // Не ждём writer у подставленного FIFO: fstat ниже отвергнет нерегулярный файл.
          fd = openSync(real, constants.O_RDONLY | noFollow | nonBlock);
        } catch {
          throw new Error("`tokenFile` identity changed or is no longer safely readable");
        }
        try {
          let opened: Stats;
          try {
            opened = fstatSync(fd);
          } catch {
            throw new Error("`tokenFile` identity could not be verified");
          }
          if (!opened.isFile() || opened.dev !== expected.dev || opened.ino !== expected.ino) {
            throw new Error("`tokenFile` identity changed after configuration load");
          }
          let text: string;
          try {
            // Read from the verified descriptor, never by reopening the path.
            text = readFileSync(fd, "utf-8");
          } catch {
            throw new Error("`tokenFile` could not be read");
          }
          const token = text.trim();
          if (!token) throw new Error("`tokenFile` is empty");
          return token;
        } finally {
          try {
            closeSync(fd);
          } catch {
            // The credential was already read or rejected; never replace that result with an
            // OS-specific close error that could expose a path.
          }
        }
      },
    };
  }
  if (raw.tokenCommand !== undefined) {
    if (!isStringArray(raw.tokenCommand) || raw.tokenCommand.length === 0) {
      throw new Error("`tokenCommand` must be a non-empty array of strings (argv, no shell)");
    }
    if (process.env[ALLOW_TOKEN_COMMAND_ENV] !== "1") {
      throw new Error(
        `\`tokenCommand\` runs only when ${ALLOW_TOKEN_COMMAND_ENV}=1 is set in your environment — a ` +
          `config file a repository can commit must not run commands on its own`,
      );
    }
    const [cmd, ...args] = raw.tokenCommand;
    return {
      source: "tokenCommand",
      load: () => {
        let out: string;
        try {
          out = execFileSync(cmd, args, {
            cwd: configDir,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 10000,
          });
        } catch {
          // Never include command output or argv: either may contain a credential.
          throw new Error("`tokenCommand` failed");
        }
        const token = out.trim();
        if (!token) throw new Error("`tokenCommand` produced no token");
        return token;
      },
    };
  }
  return { source: "none", load: () => "" };
}

/** Validate one tool-policy list; unknown names are a config error, never silently ignored. */
function toolList(raw: Record<string, unknown>, key: "allowTools" | "denyTools", problems: string[]): Set<string> | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.length > 0)) {
    problems.push(`\`${key}\` must be an array of tool names`);
    return undefined;
  }
  const known = new Set<string>(TOOL_NAMES);
  if (v.some((name) => !known.has(name))) {
    problems.push(`\`${key}\` contains an unknown tool name`);
  }
  return new Set(v);
}

/**
 * Resolve the project's configuration. Never throws. The result distinguishes absence, an explicit
 * opt-out, invalid input, and an active configuration so callers can stay silent only when silence
 * is correct. Token content is acquired lazily by `config.getApiKey`, immediately before networking.
 */
export function loadProjectConfig(cwd: string = process.cwd()): LoadResult {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return {
      state: "missing",
      reason: `no ${CONFIG_FILE} at or above ${resolve(cwd || process.cwd())}`,
    };
  }
  const configDir = dirname(configPath);
  if (isDisabled(cwd, configDir)) {
    return {
      state: "disabled",
      reason: "disabled by .hindsight-disabled or HINDSIGHT_DISABLED",
      configPath,
    };
  }

  let raw: Record<string, unknown>;
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    raw = parsed as Record<string, unknown>;
  } catch {
    return {
      state: "invalid",
      reason: `${CONFIG_FILE} is not valid JSON`,
      configPath,
    };
  }

  const problems: string[] = [];
  for (const [key, rule] of Object.entries(LEGACY_KEYS)) {
    if (key in raw) problems.push(`\`${key}\` is not supported — ${rule}`);
  }
  const url = typeof raw.url === "string" && /^https?:\/\//.test(raw.url) ? raw.url : "";
  if (!url) problems.push("`url` must be an http(s) URL");
  const banks = isStringArray(raw.banks) && raw.banks.length > 0 ? [...new Set(raw.banks)] : [];
  if (banks.length === 0) problems.push("`banks` must be a non-empty array of bank ids");
  const defaultBank = typeof raw.defaultBank === "string" && raw.defaultBank ? raw.defaultBank : "";
  if (!defaultBank) problems.push("`defaultBank` is required");
  else if (banks.length > 0 && !banks.includes(defaultBank)) {
    problems.push("`defaultBank` must name an entry in `banks`");
  }
  const tuning: Tuning = { ...TUNING_DEFAULTS };
  for (const [key, type] of Object.entries(TUNING_TYPES) as [keyof Tuning, string][]) {
    if (!(key in raw)) continue;
    const value = raw[key];
    const okType = type === "string[]" ? isStringArray(value) : typeof value === type;
    if (!okType) {
      problems.push(`\`${key}\` must be a ${type}`);
      continue;
    }
    (tuning as Record<string, unknown>)[key] = value;
  }
  if (!["low", "mid", "high"].includes(tuning.recallBudget)) {
    problems.push("`recallBudget` must be low, mid or high");
  }
  if (
    !Number.isInteger(tuning.enrichMaxChars) ||
    tuning.enrichMaxChars < 1 ||
    tuning.enrichMaxChars > ENRICH_MAX_CHARS_LIMIT
  ) {
    problems.push(`\`enrichMaxChars\` must be an integer from 1 to ${ENRICH_MAX_CHARS_LIMIT}`);
  }

  const allow = toolList(raw, "allowTools", problems);
  const deny = toolList(raw, "denyTools", problems);
  const enabledTools = TOOL_NAMES.filter((name) => (!allow || allow.has(name)) && !deny?.has(name));

  // A route to a bank outside the allowlist is a config error, not a per-line refusal later: the
  // mistake is in this file, so this file is where it is reported.
  const routing: Record<string, string> = {};
  if (raw.routing !== undefined) {
    if (!raw.routing || typeof raw.routing !== "object" || Array.isArray(raw.routing)) {
      problems.push("`routing` must be an object mapping a repository name or glob to a bank");
    } else {
      for (const [pattern, bank] of Object.entries(raw.routing as Record<string, unknown>)) {
        if (!pattern || typeof bank !== "string" || !bank) {
          problems.push("`routing` contains an invalid entry");
        } else if (banks.length > 0 && !banks.includes(bank)) {
          problems.push("`routing` targets must be declared in `banks`");
        } else {
          routing[pattern] = bank;
        }
      }
    }
  }

  let tokenBinding: TokenBinding | undefined;
  try {
    tokenBinding = bindToken(raw, configDir);
  } catch (err) {
    problems.push((err as Error).message);
  }
  if (problems.length > 0 || !tokenBinding) {
    return {
      state: "invalid",
      reason: `${CONFIG_FILE}: ${problems.join("; ")}`,
      configPath,
    };
  }
  const activeTokenBinding = tokenBinding;

  const envUrl = process.env.HINDSIGHT_URL;
  const debugEnv = (process.env.HINDSIGHT_DEBUG ?? "").toLowerCase();
  let cachedToken: string | undefined;
  const config: HindsightConfig = {
    ...tuning,
    debug: tuning.debug || ["1", "true", "yes", "on"].includes(debugEnv),
    url: (envUrl || url).replace(/\/$/, ""),
    banks,
    defaultBank,
    getApiKey: () => {
      if (cachedToken === undefined) cachedToken = activeTokenBinding.load();
      return cachedToken;
    },
    tokenSource: activeTokenBinding.source,
    configPath,
    projectRoot: configDir,
    routing,
    enabledTools,
  };
  return { state: "active", config };
}

export function debugLog(config: Pick<HindsightConfig, "debug"> | null | undefined, ...args: unknown[]): void {
  if (config?.debug) {
    console.error("[Hindsight]", ...args);
  }
}
