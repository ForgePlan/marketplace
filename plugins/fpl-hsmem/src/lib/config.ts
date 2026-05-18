import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveProjectName } from "./bank.js";

export interface HindsightConfig {
  url: string;
  bankId: string;
  apiKey: string;
  enabled: boolean;
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
  bankMission: string;
  retainMission: string;
  debug: boolean;
}

const DEFAULTS: HindsightConfig = {
  url: "http://localhost:8888",
  bankId: "",
  apiKey: "",
  enabled: true,
  autoRecall: true,
  autoRetain: true,
  recallBudget: "mid",
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
  bankMission: "",
  retainMission: "",
  debug: false,
};

const ENV_MAP: Record<string, [keyof HindsightConfig, "string" | "number" | "boolean" | "json"]> = {
  HINDSIGHT_URL: ["url", "string"],
  HINDSIGHT_BANK_ID: ["bankId", "string"],
  HINDSIGHT_API_KEY: ["apiKey", "string"],
  HINDSIGHT_AUTO_RECALL: ["autoRecall", "boolean"],
  HINDSIGHT_AUTO_RETAIN: ["autoRetain", "boolean"],
  HINDSIGHT_RECALL_BUDGET: ["recallBudget", "string"],
  HINDSIGHT_RECALL_MAX_TOKENS: ["recallMaxTokens", "number"],
  HINDSIGHT_RECALL_TYPES: ["recallTypes", "json"],
  HINDSIGHT_RECALL_CONTEXT_TURNS: ["recallContextTurns", "number"],
  HINDSIGHT_RECALL_MAX_QUERY_CHARS: ["recallMaxQueryChars", "number"],
  HINDSIGHT_RETAIN_EVERY_N_TURNS: ["retainEveryNTurns", "number"],
  HINDSIGHT_RETAIN_OVERLAP_TURNS: ["retainOverlapTurns", "number"],
  HINDSIGHT_RETAIN_TOOL_CALLS: ["retainToolCalls", "boolean"],
  HINDSIGHT_RETAIN_CONTEXT: ["retainContext", "string"],
  HINDSIGHT_BANK_MISSION: ["bankMission", "string"],
  HINDSIGHT_RETAIN_MISSION: ["retainMission", "string"],
  HINDSIGHT_DEBUG: ["debug", "boolean"],
};

function castEnv(value: string, type: "string" | "number" | "boolean" | "json"): unknown {
  switch (type) {
    case "boolean":
      return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    default:
      return value;
  }
}

function loadJsonFile(path: string): Partial<HindsightConfig> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Partial<HindsightConfig>;
  } catch {
    return null;
  }
}

function readMcpJsonBank(cwd: string): { url?: string; bankId?: string; apiKey?: string } {
  const path = join(cwd, ".mcp.json");
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as {
      mcpServers?: Record<string, { env?: Record<string, string> }>;
    };
    const env = raw.mcpServers?.hindsight?.env ?? {};
    return {
      url: env.HINDSIGHT_URL,
      bankId: env.HINDSIGHT_BANK_ID,
      apiKey: env.HINDSIGHT_API_KEY,
    };
  } catch {
    return {};
  }
}

/**
 * Check whether the user has opted out of Hindsight for this project.
 *
 * Opt-out signals (any one of them disables auto-recall/retain + MCP):
 *   - `.hindsight-disabled` marker file in the project root
 *   - `HINDSIGHT_DISABLED=true` environment variable
 */
export function isDisabled(cwd: string = process.cwd()): boolean {
  if (existsSync(join(cwd, ".hindsight-disabled"))) return true;
  const env = process.env.HINDSIGHT_DISABLED ?? "";
  return ["1", "true", "yes", "on"].includes(env.toLowerCase());
}

/**
 * Resolution order (later wins):
 *   1. Built-in defaults
 *   2. ~/.hindsight/config.json (user-wide)
 *   3. <cwd>/.mcp.json → mcpServers.hindsight.env (project — explicit override)
 *   4. <cwd>/.hindsight.json (project overrides)
 *   5. Environment variables
 *
 * If bankId remains unset after all sources, it is derived from the project
 * directory name (git worktree-aware). This is the standard path when running
 * as a plugin without an explicit per-project .mcp.json.
 */
export function loadConfig(cwd: string = process.cwd()): HindsightConfig {
  const config: HindsightConfig = { ...DEFAULTS };

  const userConfig = loadJsonFile(join(homedir(), ".hindsight", "config.json"));
  if (userConfig) Object.assign(config, userConfig);

  const mcpBank = readMcpJsonBank(cwd);
  if (mcpBank.url) config.url = mcpBank.url;
  if (mcpBank.bankId) config.bankId = mcpBank.bankId;
  if (mcpBank.apiKey) config.apiKey = mcpBank.apiKey;

  const projectConfig = loadJsonFile(join(cwd, ".hindsight.json"));
  if (projectConfig) Object.assign(config, projectConfig);

  for (const [envName, [key, type]] of Object.entries(ENV_MAP)) {
    const raw = process.env[envName];
    if (raw === undefined) continue;
    const value = castEnv(raw, type);
    if (value !== undefined) (config as unknown as Record<string, unknown>)[key] = value;
  }

  if (!config.bankId) {
    config.bankId = resolveProjectName(cwd);
  }

  if (isDisabled(cwd)) {
    config.enabled = false;
    config.autoRecall = false;
    config.autoRetain = false;
  }

  return config;
}

export function debugLog(config: HindsightConfig, ...args: unknown[]): void {
  if (config.debug) {
    console.error("[Hindsight]", ...args);
  }
}
