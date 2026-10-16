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

// src/lib/version.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = dirname(fileURLToPath(import.meta.url));
function pluginVersion() {
  const candidates = [
    join(__dirname, "..", "..", ".claude-plugin", "plugin.json"),
    // from src/lib (dev)
    join(__dirname, "..", ".claude-plugin", "plugin.json")
    // from dist (bundled)
  ];
  for (const p of candidates) {
    try {
      const v = JSON.parse(readFileSync2(p, "utf-8")).version;
      if (typeof v === "string" && v) return v;
    } catch {
    }
  }
  return "unknown";
}

// src/lib/compatibility.ts
var HINDSIGHT_API_RANGE = ">=0.10.2 and <0.11.0";
var HindsightCompatibilityGate = class {
  result;
  assertCompatible(readVersion) {
    if (!this.result) this.result = this.check(readVersion);
    return this.result;
  }
  async check(readVersion) {
    let response;
    try {
      response = await readVersion();
    } catch {
      throw new Error(
        `Hindsight compatibility check failed: /version could not be read; fpl-hsmem 3.7.0 requires API ${HINDSIGHT_API_RANGE}. No bank request was sent.`
      );
    }
    const supplied = response !== null && typeof response === "object" ? response.api_version : void 0;
    if (typeof supplied !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(supplied)) {
      throw new Error(
        `Unsupported Hindsight API version (missing or malformed); fpl-hsmem 3.7.0 requires ${HINDSIGHT_API_RANGE}. No bank request was sent.`
      );
    }
    const [major, minor, patch] = supplied.split(".").map(Number);
    if (major !== 0 || minor !== 10 || !Number.isSafeInteger(patch) || patch < 2) {
      throw new Error(
        `Unsupported Hindsight API version ${supplied}; fpl-hsmem 3.7.0 requires ${HINDSIGHT_API_RANGE}. No bank request was sent.`
      );
    }
  }
};

// src/lib/client.ts
var USER_AGENT = `hindsight-mcp/${pluginVersion()}`;
var PATH_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9._~-]*$/;
var DOCUMENT_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9._~:-]*$/;
function assertPathId(value, what = "id", colon = false) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${what} must be a non-empty string`);
  }
  if (value.length > 200) {
    throw new Error(`${what} is too long (${value.length} chars, max 200)`);
  }
  if (value.includes("..")) {
    throw new Error(`${what} may not contain ".." (path traversal)`);
  }
  if (!(colon ? DOCUMENT_ID_RE : PATH_ID_RE).test(value)) {
    throw new Error(
      `${what} must start with a letter, digit or underscore and contain only letters, digits, dot, underscore, tilde${colon ? ", colon" : ""} or hyphen (got ${JSON.stringify(value)})`
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
  compatibility;
  constructor(url, bankId, apiKey = "", compatibility = new HindsightCompatibilityGate()) {
    this.url = url.replace(/\/$/, "");
    this.bankId = bankId;
    this.apiKey = typeof apiKey === "function" ? apiKey : () => apiKey;
    this.compatibility = compatibility;
  }
  get bank() {
    return this.bankId;
  }
  /** Фактическое назначение запросов; callers хешируют его, не выводя credentials из URL. */
  get endpoint() {
    return this.url;
  }
  headers() {
    const h = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    };
    const apiKey = this.apiKey();
    if (apiKey) h["Authorization"] = `Bearer ${apiKey}`;
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
    const qs = query ? "?" + Object.entries(query).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((x) => `${encodeURIComponent(k)}=${encodeURIComponent(x)}`)).join("&") : "";
    return path + qs;
  }
  async request(method, path, body, timeoutMs = 15e3) {
    if (path === "/v1/default/banks" || path.startsWith("/v1/default/banks?") || path.startsWith("/v1/default/banks/")) {
      await this.compatibility.assertCompatible(
        () => this.rawRequest("GET", "/version", void 0, 5e3)
      );
    }
    return this.rawRequest(method, path, body, timeoutMs);
  }
  async rawRequest(method, path, body, timeoutMs) {
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
  /**
   * Whether `bankId` exists on the server, without creating it.
   *
   * Hindsight creates a bank implicitly on the first bank-scoped write (and several reads), so
   * "just try it" is how orphan banks are born. This asks the bank list instead — `GET
   * /v1/default/banks?q=` is a substring filter, so the match is checked exactly here. This is an
   * observed existence check, not a claim that server-side reads are universally non-mutating.
   */
  async bankExists(bankId, timeoutMs = 1e4) {
    const res = await this.request(
      "GET",
      `/v1/default/banks?q=${encodeURIComponent(assertBankId(bankId))}&limit=1000`,
      void 0,
      timeoutMs
    );
    return (res.banks ?? []).some((b) => b.bank_id === bankId);
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
  /**
   * Exact-id document lookup. The `q` list filter matches substrings, which is not existence.
   * Document ids may carry `:` (see DOCUMENT_ID_RE), so the segment is validated here rather than
   * by `bankUrl`.
   */
  async getDocument(id) {
    try {
      const document = await this.request(
        "GET",
        `${this.bankPath()}/documents/${encodeURIComponent(assertPathId(id, "document id", true))}`,
        void 0,
        1e4
      );
      if (document === null || typeof document !== "object" || Array.isArray(document)) {
        throw new Error("Invalid response from document lookup");
      }
      return document;
    } catch (err) {
      if (err instanceof Error && /^HTTP 404 from /.test(err.message)) return null;
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
   *
   * Hindsight 0.10: `PATCH /config {"updates":{"reflect_mission":…}}` — never the removed
   * `PUT /profile` / `POST /background`, which now answer 410.
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
    if (options.documentId) query.document_id = assertPathId(options.documentId, "document_id", true);
    if (options.tags?.length) query.tags = options.tags;
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
  // Bank configuration. Hindsight 0.10 removed `GET/PUT /profile` and `POST /background` (both
  // answer 410); the mission now lives here as `reflect_mission`, next to the behavioural switches.
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
    return this.request(
      "DELETE",
      `${this.bankPath()}/documents/${encodeURIComponent(assertPathId(id, "document id", true))}`,
      void 0,
      3e4
    );
  }
};

// src/lib/banks.ts
var BANK_EXISTS_TTL_MS = 5 * 60 * 1e3;
var BankGate = class {
  constructor(config, opts = {}) {
    this.config = config;
    this.ttlMs = opts.ttlMs ?? BANK_EXISTS_TTL_MS;
    this.now = opts.now ?? Date.now;
  }
  config;
  /** One client per bank, created on first use. */
  clients = /* @__PURE__ */ new Map();
  /**
   * When each bank was last confirmed to exist. Only positives are cached, and only for `ttlMs`: a
   * bank an operator deleted must stop being accepted, or the next write would recreate it.
   */
  confirmedAt = /* @__PURE__ */ new Map();
  /** One compatibility request shared by every bank client for this active configuration. */
  compatibility = new HindsightCompatibilityGate();
  ttlMs;
  now;
  /** A client for the default bank without the existence check — for tools that never touch a bank. */
  defaultClient() {
    return this.clientFor(this.config.defaultBank);
  }
  clientFor(bank) {
    let client = this.clients.get(bank);
    if (!client) {
      client = new HindsightClient(this.config.url, bank, this.config.getApiKey, this.compatibility);
      this.clients.set(bank, client);
    }
    return client;
  }
  /**
   * Resolve `requested` (empty → `defaultBank`) to a client, or to a refusal message. May throw on
   * a network failure while checking existence; callers turn that into an explained error.
   */
  async resolve(requested) {
    const bank = requested === void 0 || requested === null || requested === "" ? this.config.defaultBank : requested;
    if (typeof bank !== "string") return "Error: bank must be a string";
    if (!this.config.banks.includes(bank)) {
      return `Refusing: bank "${bank}" is not in this project's allowlist (${this.config.banks.join(", ")}). Allowed banks are declared in ${this.config.configPath}.`;
    }
    const client = this.clientFor(bank);
    const at = this.confirmedAt.get(bank);
    if (at === void 0 || this.now() - at >= this.ttlMs) {
      if (!await client.bankExists(bank)) {
        this.confirmedAt.delete(bank);
        return `Refusing: bank "${bank}" does not exist on the configured Hindsight server. This client will not create it; an authorized operator must provision it separately.`;
      }
      this.confirmedAt.set(bank, this.now());
    }
    return client;
  }
};

// src/lib/config.ts
import {
  closeSync,
  constants,
  existsSync as existsSync2,
  fstatSync,
  openSync,
  readFileSync as readFileSync3,
  realpathSync,
  statSync
} from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname as dirname2, isAbsolute, join as join2, normalize, resolve, sep } from "node:path";

// src/lib/tool-names.ts
var TOOL_NAMES = [
  // memory — write and read
  "memory_retain",
  "memory_retain_batch",
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

// src/lib/config.ts
var CONFIG_FILE = ".hindsight.json";
var ENRICH_MAX_CHARS_LIMIT = 2e3;
var ALLOW_TOKEN_COMMAND_ENV = "HINDSIGHT_ALLOW_TOKEN_COMMAND";
var TUNING_DEFAULTS = {
  autoRecall: false,
  autoRetain: false,
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
  debug: false,
  enrichMaxChars: 900
};
var TUNING_TYPES = {
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
  enrichMaxChars: "number"
};
var LEGACY_KEYS = {
  bankId: "use `banks` + `defaultBank`",
  apiKey: "never put the token in the config file; use `tokenFile` or `tokenCommand`",
  bankMission: "missions are set with memory_set_mission (reflect_mission), not from config",
  retainMission: "retain_mission is an operator setting on the server, not a client config key",
  enabled: "presence of the file is the switch; delete it (or add .hindsight-disabled) to turn off"
};
function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x.length > 0);
}
function isWithin(path, root) {
  return path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);
}
function gitToplevel(start, home) {
  let dir = start;
  for (; ; ) {
    if (existsSync2(join2(dir, ".git"))) return dir;
    const parent = dirname2(dir);
    if (dir === home || parent === dir) return null;
    dir = parent;
  }
}
function findConfigFile(cwd) {
  const start = normalize(resolve(cwd || process.cwd()));
  const home = normalize(resolve(process.env.HOME || homedir()));
  const stop = gitToplevel(start, home) ?? (isWithin(start, home) ? home : start);
  let dir = start;
  for (; ; ) {
    if (dir !== home) {
      const candidate = join2(dir, CONFIG_FILE);
      if (existsSync2(candidate)) return candidate;
    }
    const parent = dirname2(dir);
    if (dir === stop || parent === dir) return null;
    dir = parent;
  }
}
function isDisabled(cwd = process.cwd(), configDir) {
  if (existsSync2(join2(cwd, ".hindsight-disabled"))) return true;
  if (configDir && existsSync2(join2(configDir, ".hindsight-disabled"))) return true;
  const env = process.env.HINDSIGHT_DISABLED ?? "";
  return ["1", "true", "yes", "on"].includes(env.toLowerCase());
}
function bindToken(raw, configDir) {
  const envKey = process.env.HINDSIGHT_API_KEY?.trim();
  if (envKey && process.env.HINDSIGHT_URL) return { source: "env", load: () => envKey };
  if (raw.tokenFile !== void 0) {
    if (typeof raw.tokenFile !== "string" || !raw.tokenFile) {
      throw new Error("`tokenFile` must be a non-empty string");
    }
    const path = isAbsolute(raw.tokenFile) ? raw.tokenFile : resolve(configDir, raw.tokenFile);
    let real;
    let root;
    try {
      real = realpathSync(path);
      root = realpathSync(configDir);
    } catch {
      throw new Error("`tokenFile` could not be resolved");
    }
    if (real === root || !isWithin(real, root)) {
      throw new Error("`tokenFile` must resolve to a file inside the project");
    }
    let expected;
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
        let fd;
        try {
          const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
          const nonBlock = typeof constants.O_NONBLOCK === "number" ? constants.O_NONBLOCK : 0;
          fd = openSync(real, constants.O_RDONLY | noFollow | nonBlock);
        } catch {
          throw new Error("`tokenFile` identity changed or is no longer safely readable");
        }
        try {
          let opened;
          try {
            opened = fstatSync(fd);
          } catch {
            throw new Error("`tokenFile` identity could not be verified");
          }
          if (!opened.isFile() || opened.dev !== expected.dev || opened.ino !== expected.ino) {
            throw new Error("`tokenFile` identity changed after configuration load");
          }
          let text;
          try {
            text = readFileSync3(fd, "utf-8");
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
          }
        }
      }
    };
  }
  if (raw.tokenCommand !== void 0) {
    if (!isStringArray(raw.tokenCommand) || raw.tokenCommand.length === 0) {
      throw new Error("`tokenCommand` must be a non-empty array of strings (argv, no shell)");
    }
    if (process.env[ALLOW_TOKEN_COMMAND_ENV] !== "1") {
      throw new Error(
        `\`tokenCommand\` runs only when ${ALLOW_TOKEN_COMMAND_ENV}=1 is set in your environment \u2014 a config file a repository can commit must not run commands on its own`
      );
    }
    const [cmd, ...args] = raw.tokenCommand;
    return {
      source: "tokenCommand",
      load: () => {
        let out;
        try {
          out = execFileSync(cmd, args, {
            cwd: configDir,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 1e4
          });
        } catch {
          throw new Error("`tokenCommand` failed");
        }
        const token = out.trim();
        if (!token) throw new Error("`tokenCommand` produced no token");
        return token;
      }
    };
  }
  return { source: "none", load: () => "" };
}
function toolList(raw, key, problems) {
  const v = raw[key];
  if (v === void 0) return void 0;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.length > 0)) {
    problems.push(`\`${key}\` must be an array of tool names`);
    return void 0;
  }
  const known = new Set(TOOL_NAMES);
  if (v.some((name) => !known.has(name))) {
    problems.push(`\`${key}\` contains an unknown tool name`);
  }
  return new Set(v);
}
function loadProjectConfig(cwd = process.cwd()) {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return {
      state: "missing",
      reason: `no ${CONFIG_FILE} at or above ${resolve(cwd || process.cwd())}`
    };
  }
  const configDir = dirname2(configPath);
  if (isDisabled(cwd, configDir)) {
    return {
      state: "disabled",
      reason: "disabled by .hindsight-disabled or HINDSIGHT_DISABLED",
      configPath
    };
  }
  let raw;
  try {
    const parsed = JSON.parse(readFileSync3(configPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    raw = parsed;
  } catch {
    return {
      state: "invalid",
      reason: `${CONFIG_FILE} is not valid JSON`,
      configPath
    };
  }
  const problems = [];
  for (const [key, rule] of Object.entries(LEGACY_KEYS)) {
    if (key in raw) problems.push(`\`${key}\` is not supported \u2014 ${rule}`);
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
  const tuning = { ...TUNING_DEFAULTS };
  for (const [key, type] of Object.entries(TUNING_TYPES)) {
    if (!(key in raw)) continue;
    const value = raw[key];
    const okType = type === "string[]" ? isStringArray(value) : typeof value === type;
    if (!okType) {
      problems.push(`\`${key}\` must be a ${type}`);
      continue;
    }
    tuning[key] = value;
  }
  if (!["low", "mid", "high"].includes(tuning.recallBudget)) {
    problems.push("`recallBudget` must be low, mid or high");
  }
  if (!Number.isInteger(tuning.enrichMaxChars) || tuning.enrichMaxChars < 1 || tuning.enrichMaxChars > ENRICH_MAX_CHARS_LIMIT) {
    problems.push(`\`enrichMaxChars\` must be an integer from 1 to ${ENRICH_MAX_CHARS_LIMIT}`);
  }
  const allow = toolList(raw, "allowTools", problems);
  const deny = toolList(raw, "denyTools", problems);
  const enabledTools = TOOL_NAMES.filter((name) => (!allow || allow.has(name)) && !deny?.has(name));
  const routing = {};
  if (raw.routing !== void 0) {
    if (!raw.routing || typeof raw.routing !== "object" || Array.isArray(raw.routing)) {
      problems.push("`routing` must be an object mapping a repository name or glob to a bank");
    } else {
      for (const [pattern, bank] of Object.entries(raw.routing)) {
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
  let tokenBinding;
  try {
    tokenBinding = bindToken(raw, configDir);
  } catch (err) {
    problems.push(err.message);
  }
  if (problems.length > 0 || !tokenBinding) {
    return {
      state: "invalid",
      reason: `${CONFIG_FILE}: ${problems.join("; ")}`,
      configPath
    };
  }
  const activeTokenBinding = tokenBinding;
  const envUrl = process.env.HINDSIGHT_URL;
  const debugEnv = (process.env.HINDSIGHT_DEBUG ?? "").toLowerCase();
  let cachedToken;
  const config = {
    ...tuning,
    debug: tuning.debug || ["1", "true", "yes", "on"].includes(debugEnv),
    url: (envUrl || url).replace(/\/$/, ""),
    banks,
    defaultBank,
    getApiKey: () => {
      if (cachedToken === void 0) cachedToken = activeTokenBinding.load();
      return cachedToken;
    },
    tokenSource: activeTokenBinding.source,
    configPath,
    projectRoot: configDir,
    routing,
    enabledTools
  };
  return { state: "active", config };
}
function debugLog(config, ...args) {
  if (config?.debug) {
    console.error("[Hindsight]", ...args);
  }
}

// src/lib/redact.ts
var RULES = [
  { kind: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
  { kind: "github-token", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { kind: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "aws-key-id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: "hindsight-key", re: /\bhsk_[A-Za-z0-9_-]{16,}\b/g },
  { kind: "google-key", re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { kind: "bearer", re: /\b[Bb]earer\s+[A-Za-z0-9._~+/-]{16,}={0,2}/g },
  {
    // The catch-all: a credential-ish NAME, an assignment, and a long-enough value. The name and
    // the separator are kept so the reader can still see WHAT was redacted — a line that reads
    // `[redacted]` alone tells a debugging human nothing.
    kind: "assigned-secret",
    re: /\b(api[_-]?key|apikey|password|passwd|pwd|secret|token|access[_-]?key|private[_-]?key|client[_-]?secret)\b(\s*[:=]\s*|"\s*:\s*")(?!\s)([^\s"',;]{8,})/gi,
    keep: 1
  }
];
var MAX_SCAN = 512 * 1024;
function redact(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  if (text.length > MAX_SCAN) {
    return `[not redacted: ${text.length} chars exceeds the ${MAX_SCAN}-char scan limit]`;
  }
  let out = text;
  for (const rule of RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    out = out.replace(re, (...args) => {
      if (rule.keep === void 0) return `[redacted:${rule.kind}]`;
      const kept = String(args[rule.keep] ?? "");
      const sep2 = String(args[rule.keep + 1] ?? "=");
      return `${kept}${sep2}[redacted:${rule.kind}]`;
    });
  }
  return out;
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
  const loaded = loadProjectConfig(cwd);
  if (loaded.state === "missing" || loaded.state === "disabled") return;
  if (loaded.state === "invalid") {
    process.stderr.write(`[Hindsight] Recall skipped: invalid configuration: ${redact(loaded.reason)}
`);
    return;
  }
  if (!loaded.config.autoRecall) {
    debugLog(loaded.config, "autoRecall disabled, skipping");
    return;
  }
  const { config } = loaded;
  const prompt = (hookInput.prompt ?? hookInput.user_prompt ?? "").trim();
  if (!prompt || prompt.length < 5) {
    debugLog(config, "Prompt too short for recall");
    return;
  }
  const bankId = config.defaultBank;
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
    const client = await new BankGate(config).resolve(bankId);
    if (typeof client === "string") {
      process.stderr.write(`[Hindsight] Recall skipped: ${client}
`);
      return;
    }
    const response = await client.recall(query, {
      maxTokens: config.recallMaxTokens,
      budget: config.recallBudget,
      types: config.recallTypes,
      timeoutMs: 1e4
    });
    results = response.results ?? [];
  } catch (e) {
    process.stderr.write(`[Hindsight] Recall failed: ${redact(e.message)}
`);
    return;
  }
  if (results.length === 0) {
    debugLog(config, "No memories found");
    return;
  }
  const formatted = redact(formatMemories(results));
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
