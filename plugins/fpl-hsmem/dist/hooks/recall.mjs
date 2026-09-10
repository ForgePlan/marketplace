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
var PATH_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9._~-]*$/;
function assertPathId(value, what = "id") {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${what} must be a non-empty string`);
  }
  if (value.length > 200) {
    throw new Error(`${what} is too long (${value.length} chars, max 200)`);
  }
  if (value.includes("..")) {
    throw new Error(`${what} may not contain ".." (path traversal)`);
  }
  if (!PATH_ID_RE.test(value)) {
    throw new Error(
      `${what} must start with a letter, digit or underscore and contain only letters, digits, dot, underscore, tilde or hyphen (got ${JSON.stringify(value)})`
    );
  }
  return value;
}
function assertBankId(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("bank id must be a non-empty string");
  }
  const v = value.trim();
  if (v === "." || v === ".." || v.includes("..")) {
    throw new Error(`bank id may not be a dot segment (got ${JSON.stringify(value)})`);
  }
  if (/[/\\%]/.test(v)) {
    throw new Error(`bank id may not contain / \\ or % (got ${JSON.stringify(value)})`);
  }
  if (/[\u0000-\u001f\u007f]/.test(v)) {
    throw new Error("bank id may not contain control characters");
  }
  if (v.length > 200) {
    throw new Error(`bank id is too long (${v.length} chars, max 200)`);
  }
  return v;
}
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
    return `/v1/default/banks/${encodeURIComponent(assertBankId(bankId ?? this.bankId))}`;
  }
  /**
   * Build a bank-scoped path from an ARRAY of segments, never a joined string. Each segment is
   * validated and encoded separately, and the assembled path is then checked to still sit under
   * the bank prefix — so a segment that somehow escapes validation still cannot re-address the
   * request at the bank base or above it.
   */
  bankUrl(segments, query, bankId) {
    const prefix = this.bankPath(bankId);
    const tail = segments.map((s, i) => encodeURIComponent(assertPathId(s, `segment ${i}`))).join("/");
    const path = tail ? `${prefix}/${tail}` : prefix;
    if (!path.startsWith(`${prefix}/`) || path.length <= prefix.length + 1) {
      throw new Error(`refusing to build a request outside ${prefix}`);
    }
    const qs = query ? "?" + Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&") : "";
    return path + qs;
  }
  async request(method, path, body, timeoutMs = 15e3) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res;
      try {
        res = await fetch(`${this.url}${path}`, {
          method,
          headers: this.headers(),
          body: body ? JSON.stringify(body) : void 0,
          signal: controller.signal,
          redirect: "error"
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/redirect/i.test(msg)) {
          throw new Error(
            `${method} ${path} was answered with a redirect, which this client refuses to follow (a redirect can downgrade the scheme and silently drop the Authorization header)`
          );
        }
        throw err;
      }
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
  /**
   * Upstream reflect measured 49-70 s; the old 30 s ceiling aborted real answers and reported them
   * as empty. The response field is `text` (ReflectResponse in the live OpenAPI), not `response`.
   */
  async reflect(query, options = {}) {
    const body = { query };
    if (options.maxTokens) body.max_tokens = options.maxTokens;
    return this.request("POST", `${this.bankPath()}/reflect`, body, options.timeoutMs ?? 12e4);
  }
  /** Exact-id document lookup. The `q` list filter matches substrings, which is not existence. */
  async getDocument(id) {
    try {
      return await this.request(
        "GET",
        this.bankUrl(["documents", id]),
        void 0,
        1e4
      );
    } catch (err) {
      if (err instanceof Error && /HTTP 404/.test(err.message)) return null;
      throw err;
    }
  }
  async stats(timeoutMs = 5e3) {
    return this.request("GET", `${this.bankPath()}/stats`, void 0, timeoutMs);
  }
  async listMentalModels(detail = "metadata") {
    return this.request("GET", `${this.bankPath()}/mental-models?detail=${detail}`);
  }
  async getMentalModel(id, detail = "content") {
    return this.request("GET", this.bankUrl(["mental-models", id], { detail }));
  }
  async createMentalModel(args) {
    return this.request("POST", `${this.bankPath()}/mental-models`, {
      id: assertPathId(args.id, "mental model id"),
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
    return this.request("PATCH", this.bankUrl(["mental-models", id]), body);
  }
  async deleteMentalModel(id) {
    return this.request("DELETE", this.bankUrl(["mental-models", id]));
  }
  /**
   * Only `reflect_mission`. `retain_mission` steers WHAT GETS EXTRACTED on every future retain, so
   * an agent able to set it can rewrite the memory rules for everything that follows — through a
   * tool that reads as cosmetic. Extraction control is an operator setting, not a tool argument.
   */
  async setMission(mission) {
    return this.request("PATCH", `${this.bankPath()}/config`, {
      updates: { reflect_mission: mission }
    });
  }
  // ---------------------------------------------------------------------------------------------
  // Browsing and correcting individual memories.
  //
  // `recall` answers "what is relevant to this question" and is what the hook calls on every
  // prompt. These answer a different question — "which stored row is the wrong one" — and that is
  // the question you must answer before you can correct anything. Without them the relay could
  // add facts and never fix one.
  // ---------------------------------------------------------------------------------------------
  /**
   * Enumerate stored memories by structured filter. `q` is a literal substring, not a search.
   *
   * Parameter names are MEASURED against the live API, not transcribed from documentation. Three
   * plausible spellings are silently ignored by the server — it answers 200 and returns the
   * unfiltered set — so a tool built on them would report "showing world facts" while showing
   * everything. Verified honoured: `type` (SINGULAR — `types` is ignored), `state`, `document_id`,
   * `q`, `tags`. Verified ignored: `types`, `fact_type`.
   */
  async listMemories(options = {}) {
    const query = {
      limit: String(options.limit ?? 10),
      offset: String(options.offset ?? 0)
    };
    if (options.q) query.q = options.q;
    if (options.type) query.type = options.type;
    if (options.state && options.state !== "all") query.state = options.state;
    if (options.documentId) query.document_id = assertPathId(options.documentId, "document_id");
    if (options.tags?.length) query.tags = options.tags.join(",");
    return this.request(
      "GET",
      this.bankUrl(["memories", "list"], query),
      void 0,
      options.timeoutMs ?? 2e4
    );
  }
  async getMemory(id) {
    return this.request("GET", this.bankUrl(["memories", id]), void 0, 15e3);
  }
  /**
   * Mark a memory invalid, or restore one.
   *
   * This is deliberately the ONLY memory mutation the relay exposes. Rewriting a memory's text is
   * irreversible upstream — it re-embeds, drops the derived observations and re-consolidates — so
   * the correction path is "retire the wrong fact, write the right one", which leaves the wrong
   * one readable and undoable. `reason` is what a future reader sees instead of a silent gap.
   */
  async invalidateMemory(id, reason, restore = false) {
    const body = restore ? { state: "valid" } : { state: "invalidated", ...reason ? { invalidation_reason: reason } : {} };
    return this.request("PATCH", this.bankUrl(["memories", id]), body, 15e3);
  }
  /**
   * Drop one memory's derived observations so consolidation rebuilds them.
   *
   * The memory itself survives. Use after invalidating a fact that a belief was built on — the
   * belief does not notice on its own, and recall keeps returning the conclusion drawn from the
   * fact you just retired.
   */
  async reconsolidateMemory(id) {
    return this.request("DELETE", this.bankUrl(["memories", id, "observations"]), void 0, 2e4);
  }
  // ---------------------------------------------------------------------------------------------
  // Asynchronous work. Retain returns before the server has finished thinking; these say whether
  // it finished, and that is the answer to "why does recall still return the old fact".
  // ---------------------------------------------------------------------------------------------
  /**
   * List async operations. The response array is `operations`, NOT `items` — this endpoint is
   * shaped differently from every other list on the API.
   *
   * `status` is the only filter the server honours (measured: `status=failed` narrowed 1085 → 6).
   * Filtering by kind is deliberately absent: `task_type`, `operation_type` and `kind` are all
   * accepted with a 200 and then ignored, so offering a kind filter would mean reporting a
   * narrowed view that was never narrowed. Callers that need it filter the returned page.
   */
  async listOperations(options = {}) {
    const query = {
      limit: String(options.limit ?? 20),
      offset: String(options.offset ?? 0)
    };
    if (options.status) query.status = options.status;
    return this.request("GET", this.bankUrl(["operations"], query), void 0, 2e4);
  }
  async getOperation(id) {
    return this.request("GET", this.bankUrl(["operations", id]), void 0, 15e3);
  }
  // ---------------------------------------------------------------------------------------------
  // Mental models: the two lifecycle operations that were missing.
  // ---------------------------------------------------------------------------------------------
  /** Force a rebuild now instead of waiting for consolidation. Returns an operation id. */
  async refreshMentalModel(id) {
    return this.request("POST", this.bankUrl(["mental-models", id, "refresh"]), {}, 2e4);
  }
  /**
   * Blank a page's content, keeping its configuration.
   *
   * Our pages are created in `delta` mode, which edits existing content rather than regenerating
   * it — so a page that has drifted keeps drifting. Clearing removes the baseline, and the next
   * refresh is a full rebuild. POST, not DELETE: DELETE on this resource removes the page itself.
   */
  async clearMentalModel(id) {
    return this.request("POST", this.bankUrl(["mental-models", id, "clear"]), {}, 2e4);
  }
  // ---------------------------------------------------------------------------------------------
  // Directives — standing instructions that govern synthesis. Without them every reflect is
  // ungoverned, which is the state this bank is in today.
  // ---------------------------------------------------------------------------------------------
  async listDirectives() {
    return this.request("GET", this.bankUrl(["directives"]), void 0, 15e3);
  }
  async createDirective(args) {
    const body = { name: args.name, content: args.content };
    if (args.priority !== void 0) body.priority = args.priority;
    if (args.isActive !== void 0) body.is_active = args.isActive;
    if (args.tags?.length) body.tags = args.tags;
    return this.request("POST", this.bankUrl(["directives"]), body, 15e3);
  }
  async deleteDirective(id) {
    return this.request("DELETE", this.bankUrl(["directives", id]), void 0, 15e3);
  }
  // ---------------------------------------------------------------------------------------------
  // Bank configuration. `GET /profile` (which upstream's `get_bank` maps to) returns the name and
  // mission; the behavioural switches live here and were unreachable from any tool.
  // ---------------------------------------------------------------------------------------------
  async getBankConfig() {
    return this.request("GET", `${this.bankPath()}/config`, void 0, 15e3);
  }
  /**
   * Write behavioural settings. The caller decides WHICH keys are allowed — see the allowlist in
   * `index.ts`. This method deliberately does not police key names: one policy, one place, and
   * that place is the tool handler where the refusal can be explained to the caller.
   */
  async setBankConfig(updates) {
    return this.request("PATCH", `${this.bankPath()}/config`, { updates }, 15e3);
  }
  // ---------------------------------------------------------------------------------------------
  // Documents. `memory_unit_count` is the blast-radius number nothing else provides: it is how
  // many memories die with the document.
  // ---------------------------------------------------------------------------------------------
  async listDocuments(options = {}) {
    const query = {
      limit: String(options.limit ?? 10),
      offset: String(options.offset ?? 0)
    };
    if (options.q) query.q = options.q;
    return this.request("GET", this.bankUrl(["documents"], query), void 0, 2e4);
  }
  /** Irreversible. Cascades to every memory extracted from the document. */
  async deleteDocument(id) {
    return this.request("DELETE", this.bankUrl(["documents", id]), void 0, 3e4);
  }
};

// src/lib/config.ts
import { readFileSync as readFileSync4, existsSync as existsSync3 } from "node:fs";
import { join as join3 } from "node:path";
import { homedir } from "node:os";

// src/lib/bank.ts
import { execFileSync } from "node:child_process";
import { basename, dirname as dirname2, normalize, join as join2 } from "node:path";
import { readFileSync as readFileSync3, existsSync as existsSync2 } from "node:fs";
function resolveProjectRoot(cwd) {
  if (!cwd) return process.cwd();
  let dir = normalize(cwd);
  for (; ; ) {
    if (existsSync2(join2(dir, ".mcp.json")) || existsSync2(join2(dir, ".hindsight.json"))) return dir;
    const parent = dirname2(dir);
    if (parent === dir) break;
    dir = parent;
  }
  try {
    const out = execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5e3
    }).trim();
    if (out) return out;
  } catch {
  }
  return normalize(cwd);
}
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

// src/lib/config.ts
var DEFAULTS = {
  bankIdSource: "derived-from-directory",
  projectRoot: "",
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
  const root = resolveProjectRoot(cwd);
  config.projectRoot = root;
  let source = "derived-from-directory";
  const userConfig = loadJsonFile(join3(homedir(), ".hindsight", "config.json"));
  if (userConfig) {
    Object.assign(config, userConfig);
    if (userConfig.bankId) source = "user-config";
  }
  const mcpBank = readMcpJsonBank(root);
  if (mcpBank.url) config.url = mcpBank.url;
  if (mcpBank.bankId) {
    config.bankId = mcpBank.bankId;
    source = "mcp.json";
  }
  if (mcpBank.apiKey) config.apiKey = mcpBank.apiKey;
  const projectConfig = loadJsonFile(join3(root, ".hindsight.json"));
  if (projectConfig) {
    Object.assign(config, projectConfig);
    if (projectConfig.bankId) source = "hindsight.json";
  }
  for (const [envName, [key, type]] of Object.entries(ENV_MAP)) {
    const raw = process.env[envName];
    if (raw === void 0) continue;
    const value = castEnv(raw, type);
    if (value !== void 0) {
      config[key] = value;
      if (key === "bankId") source = "env";
    }
  }
  if (!config.bankId) {
    config.bankId = resolveProjectName(root);
    source = "derived-from-directory";
  }
  config.bankIdSource = source;
  if (isDisabled(root)) {
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

// src/lib/tool-names.ts
var TOOL_NAMES = [
  // memory — write and read
  "memory_retain",
  "memory_recall",
  "memory_reflect",
  "memory_status",
  "memory_get_current_bank",
  "memory_set_mission",
  // memory — browse and correct
  "memory_list",
  "memory_get",
  "memory_invalidate",
  "memory_reconsolidate",
  "memory_operations",
  // mental models
  "mental_model_list",
  "mental_model_get",
  "mental_model_create",
  "mental_model_update",
  "mental_model_delete",
  "mental_model_refresh",
  "mental_model_clear",
  // directives
  "directive_list",
  "directive_create",
  "directive_delete",
  // bank configuration
  "bank_config_get",
  "bank_config_set",
  // documents
  "document_ingest",
  "document_ingest_file",
  "document_list",
  "document_delete"
];
var NAME_SET = new Set(TOOL_NAMES);
function isOwnTool(name) {
  if (!name) return false;
  if (NAME_SET.has(name)) return true;
  const suffix = name.split("__").pop() ?? "";
  return NAME_SET.has(suffix);
}

// src/lib/content.ts
var MESSAGE_TEXT_FIELDS = ["text", "body", "message", "content"];
var OPERATIONAL_TOOL_PATTERN = /\b(?:recall|retain|reflect|search|extract|query|fetch|read|write|create|delete|update|patch|get|list|ingest|upload|invalidate|refresh|clear|status|config)\b/i;
var MEMORY_MARKERS = ["hindsight_memories", "relevant_memories"];
function stripMemoryTags(content) {
  let out = content;
  for (const marker of MEMORY_MARKERS) {
    out = out.replace(new RegExp(`<${marker}>[\\s\\S]*?</${marker}>`, "g"), "");
    out = out.replace(new RegExp(`</?${marker}\\b[^>]*>`, "g"), "");
  }
  return out;
}
function escapeMemoryMarkers(text) {
  let out = text;
  for (const marker of MEMORY_MARKERS) {
    out = out.replace(new RegExp(`</?${marker}\\b`, "gi"), (m) => m.replace("<", "&lt;"));
  }
  return out;
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
  if (isOwnTool(name)) return false;
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
    const text = escapeMemoryMarkers(r.text ?? "");
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
  const bankId = config.bankId;
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
