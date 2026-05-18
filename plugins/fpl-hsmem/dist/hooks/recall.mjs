#!/usr/bin/env node

// src/lib/transcript.ts
import { readFileSync, existsSync } from "node:fs";
function readTranscript(path) {
  if (!path || !existsSync(path)) return [];
  const messages = [];
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return [];
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if ((entry.type === "user" || entry.type === "assistant") && entry.message) {
      const msg = entry.message;
      if (msg.role && msg.content !== void 0) {
        messages.push({ role: msg.role, content: msg.content });
      }
    } else if (entry.role && entry.content !== void 0) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }
  return messages;
}

// src/lib/client.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = dirname(fileURLToPath(import.meta.url));
function readPackageVersion() {
  try {
    const pkgPath = join(__dirname, "..", "..", "package.json");
    return JSON.parse(readFileSync2(pkgPath, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var USER_AGENT = `hindsight-mcp/${readPackageVersion()}`;
var HindsightClient = class {
  url;
  apiKey;
  bankId;
  constructor(url, bankId, apiKey = "") {
    this.url = url.replace(/\/$/, "");
    this.bankId = bankId;
    this.apiKey = apiKey;
  }
  get bank() {
    return this.bankId;
  }
  headers() {
    const h = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }
  bankPath(bankId) {
    return `/v1/default/banks/${encodeURIComponent(bankId ?? this.bankId)}`;
  }
  async request(method, path, body, timeoutMs = 15e3) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.url}${path}`, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${path}: ${text}`);
      }
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timer);
    }
  }
  async health(timeoutMs = 5e3) {
    try {
      await this.request("GET", "/health", void 0, timeoutMs);
      return true;
    } catch {
      return false;
    }
  }
  async retain(items, options = {}) {
    const list = Array.isArray(items) ? items : [items];
    return this.request(
      "POST",
      `${this.bankPath(options.bankId)}/memories`,
      { items: list, async: options.async ?? true },
      options.timeoutMs ?? 15e3
    );
  }
  async recall(query, options = {}) {
    const body = {
      query,
      max_tokens: options.maxTokens ?? 1024
    };
    if (options.budget) body.budget = options.budget;
    if (options.types && options.types.length > 0) body.types = options.types;
    return this.request(
      "POST",
      `${this.bankPath(options.bankId)}/memories/recall`,
      body,
      options.timeoutMs ?? 1e4
    );
  }
  async reflect(query, timeoutMs = 3e4) {
    return this.request("POST", `${this.bankPath()}/reflect`, { query }, timeoutMs);
  }
  async stats(timeoutMs = 5e3) {
    return this.request("GET", `${this.bankPath()}/stats`, void 0, timeoutMs);
  }
  async listMentalModels(detail = "metadata") {
    return this.request("GET", `${this.bankPath()}/mental-models?detail=${detail}`);
  }
  async getMentalModel(id, detail = "content") {
    return this.request("GET", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}?detail=${detail}`);
  }
  async createMentalModel(args) {
    return this.request("POST", `${this.bankPath()}/mental-models`, {
      id: args.id,
      name: args.name,
      source_query: args.sourceQuery,
      max_tokens: args.maxTokens ?? 4096,
      trigger: {
        mode: "delta",
        refresh_after_consolidation: true,
        fact_types: ["observation"],
        exclude_mental_models: true
      }
    });
  }
  async updateMentalModel(id, updates) {
    const body = {};
    if (updates.name) body.name = updates.name;
    if (updates.sourceQuery) body.source_query = updates.sourceQuery;
    return this.request("PATCH", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}`, body);
  }
  async deleteMentalModel(id) {
    return this.request("DELETE", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}`);
  }
  async setMission(mission, retainMission) {
    const updates = { reflect_mission: mission };
    if (retainMission) updates.retain_mission = retainMission;
    return this.request("PATCH", `${this.bankPath()}/config`, { updates });
  }
};

// src/lib/config.ts
import { readFileSync as readFileSync4, existsSync as existsSync3 } from "node:fs";
import { join as join3 } from "node:path";
import { homedir } from "node:os";

// src/lib/bank.ts
import { execFileSync } from "node:child_process";
import { basename, normalize, join as join2 } from "node:path";
import { readFileSync as readFileSync3, existsSync as existsSync2 } from "node:fs";
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
function deriveBankId(cwd) {
  const path = join2(cwd, ".mcp.json");
  if (existsSync2(path)) {
    try {
      const raw = JSON.parse(readFileSync3(path, "utf-8"));
      const declared = raw.mcpServers?.hindsight?.env?.HINDSIGHT_BANK_ID;
      if (declared && declared.trim()) return declared.trim();
    } catch {
    }
  }
  return resolveProjectName(cwd);
}

// src/lib/config.ts
var DEFAULTS = {
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
  recallPromptPreamble: "Relevant memories from past conversations (prioritize recent when conflicting). Only use memories that are directly useful to continue this conversation; ignore the rest:",
  retainEveryNTurns: 10,
  retainOverlapTurns: 2,
  retainRoles: ["user", "assistant"],
  retainToolCalls: false,
  retainContext: "claude-code",
  retainTags: ["{session_id}"],
  bankMission: "",
  retainMission: "",
  debug: false
};
var ENV_MAP = {
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
  HINDSIGHT_DEBUG: ["debug", "boolean"]
};
function castEnv(value, type) {
  switch (type) {
    case "boolean":
      return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? n : void 0;
    }
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return void 0;
      }
    default:
      return value;
  }
}
function loadJsonFile(path) {
  if (!existsSync3(path)) return null;
  try {
    return JSON.parse(readFileSync4(path, "utf-8"));
  } catch {
    return null;
  }
}
function readMcpJsonBank(cwd) {
  const path = join3(cwd, ".mcp.json");
  if (!existsSync3(path)) return {};
  try {
    const raw = JSON.parse(readFileSync4(path, "utf-8"));
    const env = raw.mcpServers?.hindsight?.env ?? {};
    return {
      url: env.HINDSIGHT_URL,
      bankId: env.HINDSIGHT_BANK_ID,
      apiKey: env.HINDSIGHT_API_KEY
    };
  } catch {
    return {};
  }
}
function isDisabled(cwd = process.cwd()) {
  if (existsSync3(join3(cwd, ".hindsight-disabled"))) return true;
  const env = process.env.HINDSIGHT_DISABLED ?? "";
  return ["1", "true", "yes", "on"].includes(env.toLowerCase());
}
function loadConfig(cwd = process.cwd()) {
  const config = { ...DEFAULTS };
  const userConfig = loadJsonFile(join3(homedir(), ".hindsight", "config.json"));
  if (userConfig) Object.assign(config, userConfig);
  const mcpBank = readMcpJsonBank(cwd);
  if (mcpBank.url) config.url = mcpBank.url;
  if (mcpBank.bankId) config.bankId = mcpBank.bankId;
  if (mcpBank.apiKey) config.apiKey = mcpBank.apiKey;
  const projectConfig = loadJsonFile(join3(cwd, ".hindsight.json"));
  if (projectConfig) Object.assign(config, projectConfig);
  for (const [envName, [key, type]] of Object.entries(ENV_MAP)) {
    const raw = process.env[envName];
    if (raw === void 0) continue;
    const value = castEnv(raw, type);
    if (value !== void 0) config[key] = value;
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
function debugLog(config, ...args) {
  if (config.debug) {
    console.error("[Hindsight]", ...args);
  }
}

// src/lib/content.ts
var MESSAGE_TEXT_FIELDS = ["text", "body", "message", "content"];
var OPERATIONAL_TOOL_PATTERN = /(?:recall|retain|reflect|search|extract|create_|delete_|update_|get_|list_)/i;
function stripMemoryTags(content) {
  return content.replace(/<hindsight_memories>[\s\S]*?<\/hindsight_memories>/g, "").replace(/<relevant_memories>[\s\S]*?<\/relevant_memories>/g, "");
}
function stripChannelEnvelope(content) {
  const match = /<channel\b[^>]*>([\s\S]*?)<\/channel>/.exec(content);
  return match ? match[1].trim() : content;
}
function isString(v) {
  return typeof v === "string";
}
function isChannelMessageTool(block) {
  const name = block.name ?? "";
  if (!name.startsWith("mcp__")) return false;
  const suffix = name.split("__").pop() ?? "";
  if (OPERATIONAL_TOOL_PATTERN.test(suffix)) return false;
  const input = block.input;
  if (!input || typeof input !== "object") return false;
  return MESSAGE_TEXT_FIELDS.some((f) => {
    const v = input[f];
    return isString(v) && v.trim().length > 0;
  });
}
function extractTextContent(content, role) {
  if (isString(content)) return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && block.text) {
      const text = block.text.trim();
      if (text) parts.push(text);
    } else if (block.type === "tool_use" && role === "assistant" && isChannelMessageTool(block)) {
      const input = block.input;
      for (const field of MESSAGE_TEXT_FIELDS) {
        const val = input[field];
        if (isString(val) && val.trim()) {
          parts.push(val.trim());
          break;
        }
      }
    }
  }
  return parts.join("\n");
}
function sliceLastTurnsByUserBoundary(messages, turns) {
  if (!Array.isArray(messages) || messages.length === 0 || turns <= 0) return [];
  let usersSeen = 0;
  let startIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      usersSeen += 1;
      if (usersSeen >= turns) {
        startIndex = i;
        break;
      }
    }
  }
  return startIndex === -1 ? [...messages] : messages.slice(startIndex);
}
function composeRecallQuery(latestQuery, messages, contextTurns, allowedRoles = ["user", "assistant"]) {
  const latest = latestQuery.trim();
  if (contextTurns <= 1 || !Array.isArray(messages) || messages.length === 0) {
    return latest;
  }
  const allowed = new Set(allowedRoles);
  const slice = sliceLastTurnsByUserBoundary(messages, contextTurns);
  const lines = [];
  for (const msg of slice) {
    if (!allowed.has(msg.role)) continue;
    let content = extractTextContent(msg.content, msg.role);
    content = stripChannelEnvelope(content);
    content = stripMemoryTags(content).trim();
    if (!content) continue;
    if (msg.role === "user" && content === latest) continue;
    lines.push(`${msg.role}: ${content}`);
  }
  if (lines.length === 0) return latest;
  return ["Prior context:", lines.join("\n"), latest].join("\n\n");
}
function truncateRecallQuery(query, latestQuery, maxChars) {
  if (maxChars <= 0) return query;
  const latest = latestQuery.trim();
  if (query.length <= maxChars) return query;
  const latestOnly = latest.length > maxChars ? latest.slice(0, maxChars) : latest;
  if (!query.includes("Prior context:")) return latestOnly;
  const marker = "Prior context:\n\n";
  const markerIdx = query.indexOf(marker);
  if (markerIdx === -1) return latestOnly;
  const suffixMarker = `

${latest}`;
  const suffixIdx = query.lastIndexOf(suffixMarker);
  if (suffixIdx === -1) return latestOnly;
  const suffix = query.slice(suffixIdx);
  if (suffix.length >= maxChars) return latestOnly;
  const contextBody = query.slice(markerIdx + marker.length, suffixIdx);
  const contextLines = contextBody.split("\n").filter((l) => l.length > 0);
  const kept = [];
  for (let i = contextLines.length - 1; i >= 0; i--) {
    kept.unshift(contextLines[i]);
    const candidate = `${marker}${kept.join("\n")}${suffix}`;
    if (candidate.length > maxChars) {
      kept.shift();
      break;
    }
  }
  return kept.length > 0 ? `${marker}${kept.join("\n")}${suffix}` : latestOnly;
}
function formatMemories(results) {
  if (!results || results.length === 0) return "";
  const lines = results.map((r) => {
    const text = r.text ?? "";
    const typeStr = r.type ? ` [${r.type}]` : "";
    const dateStr = r.mentioned_at ? ` (${r.mentioned_at})` : "";
    return `- ${text}${typeStr}${dateStr}`;
  });
  return lines.join("\n\n");
}
function formatCurrentTime() {
  const now = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(
    now.getUTCHours()
  )}:${pad(now.getUTCMinutes())}`;
}

// src/hooks/recall.ts
async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
async function main() {
  const stdinRaw = await readStdin();
  let hookInput = {};
  if (stdinRaw.trim()) {
    try {
      hookInput = JSON.parse(stdinRaw);
    } catch {
      process.stderr.write("[Hindsight] Failed to parse hook input\n");
      return;
    }
  }
  const cwd = hookInput.cwd ?? process.cwd();
  const config = loadConfig(cwd);
  if (!config.autoRecall) {
    debugLog(config, "autoRecall disabled, skipping");
    return;
  }
  const prompt = (hookInput.prompt ?? hookInput.user_prompt ?? "").trim();
  if (!prompt || prompt.length < 5) {
    debugLog(config, "Prompt too short for recall");
    return;
  }
  const bankId = deriveBankId(cwd);
  const client = new HindsightClient(config.url, bankId, config.apiKey);
  let query = prompt;
  if (config.recallContextTurns > 1) {
    const messages = readTranscript(hookInput.transcript_path);
    query = composeRecallQuery(prompt, messages, config.recallContextTurns, config.recallRoles);
  }
  query = truncateRecallQuery(query, prompt, config.recallMaxQueryChars);
  if (query.length > config.recallMaxQueryChars) {
    query = query.slice(0, config.recallMaxQueryChars);
  }
  debugLog(config, `Recall from bank '${bankId}', query length: ${query.length}`);
  let results;
  try {
    const response = await client.recall(query, {
      maxTokens: config.recallMaxTokens,
      budget: config.recallBudget,
      types: config.recallTypes,
      timeoutMs: 1e4
    });
    results = response.results ?? [];
  } catch (e) {
    process.stderr.write(`[Hindsight] Recall failed: ${e.message}
`);
    return;
  }
  if (results.length === 0) {
    debugLog(config, "No memories found");
    return;
  }
  const formatted = formatMemories(results);
  const block = [
    "<hindsight_memories>",
    config.recallPromptPreamble,
    `Current time - ${formatCurrentTime()}`,
    "",
    formatted,
    "</hindsight_memories>"
  ].join("\n");
  const output = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: block
    }
  };
  process.stdout.write(JSON.stringify(output));
}
main().catch((e) => {
  process.stderr.write(`[Hindsight] recall hook error: ${e.message}
`);
  process.exit(0);
});
