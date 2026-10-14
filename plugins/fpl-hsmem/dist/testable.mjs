// src/lib/version.ts
import { readFileSync } from "node:fs";
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
      const v = JSON.parse(readFileSync(p, "utf-8")).version;
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

// src/lib/content.ts
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
      const sep3 = String(args[rule.keep + 1] ?? "=");
      return `${kept}${sep3}[redacted:${rule.kind}]`;
    });
  }
  return out;
}
function redactionCount(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_SCAN) return 0;
  let n = 0;
  for (const rule of RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    n += (text.match(re) ?? []).length;
  }
  return n;
}
function secretKinds(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  if (text.length > MAX_SCAN) return ["unscannable-length"];
  const kinds = /* @__PURE__ */ new Set();
  for (const rule of RULES) {
    if (new RegExp(rule.re.source, rule.re.flags.replace("g", "")).test(text)) kinds.add(rule.kind);
  }
  return [...kinds];
}
function redactDeep(value, depth = 0) {
  if (depth > 12) return value;
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

// src/lib/config.ts
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  openSync,
  readFileSync as readFileSync2,
  realpathSync,
  statSync
} from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname as dirname2, isAbsolute, join as join2, normalize, resolve, sep } from "node:path";
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
    if (existsSync(join2(dir, ".git"))) return dir;
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
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname2(dir);
    if (dir === stop || parent === dir) return null;
    dir = parent;
  }
}
function isDisabled(cwd = process.cwd(), configDir) {
  if (existsSync(join2(cwd, ".hindsight-disabled"))) return true;
  if (configDir && existsSync(join2(configDir, ".hindsight-disabled"))) return true;
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
            text = readFileSync2(fd, "utf-8");
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
    const parsed = JSON.parse(readFileSync2(configPath, "utf-8"));
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

// src/lib/paths.ts
import { closeSync as closeSync2, constants as constants2, fstatSync as fstatSync2, lstatSync, openSync as openSync2, readSync, realpathSync as realpathSync2 } from "node:fs";
import { isAbsolute as isAbsolute2, relative, resolve as resolve2, sep as sep2 } from "node:path";
var MAX_PROJECT_FILE_BYTES = 2 * 1024 * 1024;
var ProjectFileError = class extends Error {
};
function contained(path, root) {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep2}`) && !isAbsolute2(rel);
}
function unchanged(before, after) {
  return after.isFile() && before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs;
}
function readProjectFile(input, projectRoot) {
  try {
    const rootInput = resolve2(projectRoot);
    const root = realpathSync2(rootInput);
    const requested = resolve2(input);
    const path = realpathSync2(requested);
    if (!contained(path, root)) {
      throw new ProjectFileError("refusing to read project file outside the project root");
    }
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile()) {
      throw new ProjectFileError("refusing to read project file: not a regular file");
    }
    if (before.size > BigInt(MAX_PROJECT_FILE_BYTES)) {
      throw new ProjectFileError(`refusing to read project file: exceeds the ${MAX_PROJECT_FILE_BYTES}-byte cap`);
    }
    const fd = openSync2(path, constants2.O_RDONLY | (constants2.O_NOFOLLOW ?? 0) | (constants2.O_NONBLOCK ?? 0));
    try {
      const verify = () => {
        if (!unchanged(before, fstatSync2(fd, { bigint: true })) || realpathSync2(rootInput) !== root || realpathSync2(requested) !== path || realpathSync2(path) !== path || !contained(path, root) || !unchanged(before, lstatSync(path, { bigint: true }))) {
          throw new ProjectFileError("refusing to read project file: file changed while reading");
        }
      };
      verify();
      const size = Number(before.size);
      const bytes = Buffer.allocUnsafe(size + 1);
      let length = 0;
      while (length <= size) {
        const count = readSync(fd, bytes, length, bytes.length - length, length);
        if (count === 0) break;
        length += count;
      }
      if (length !== size) {
        throw new ProjectFileError("refusing to read project file: file changed while reading");
      }
      verify();
      return { path, bytes: bytes.subarray(0, length) };
    } finally {
      closeSync2(fd);
    }
  } catch (error) {
    if (error instanceof ProjectFileError) throw error;
    throw new ProjectFileError("refusing to read project file: unavailable or changed file");
  }
}

// src/lib/enrich.ts
import { createHash } from "node:crypto";
var ENRICH_SOURCE_TAG = "source-tool:enrich";
var ENRICH_KINDS = ["decision", "rejected", "lesson", "pitfall", "rule", "finding"];
var KINDS = new Set(ENRICH_KINDS);
var FIELDS = /* @__PURE__ */ new Set(["bank", "kind", "content", "context", "timestamp", "document_id", "tags", "metadata"]);
var LOOKUP_CONCURRENCY = 8;
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
var DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
var EXTRA_RULES = [
  // Any value at all after `password=` — redact.ts's catch-all wants 8+ characters, and a short
  // password is still a password.
  { kind: "password-assignment", re: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i },
  // Credentials inside a URL: scheme://user:secret@host.
  { kind: "connection-string", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i },
  // Database / broker DSNs name internal hosts even without a password.
  { kind: "connection-string", re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|mssql|sqlserver|clickhouse):\/\/\S+/i },
  { kind: "connection-string", re: /\bjdbc:[a-z0-9]+:\S+/i },
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/ }
];
var UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
var GIT_SHA_RE = /\b[0-9a-f]{40}\b/gi;
function hasLongToken(text) {
  const cleaned = text.replace(UUID_RE, " ").replace(GIT_SHA_RE, " ");
  for (const run of cleaned.match(/[A-Za-z0-9_+/=-]{20,}/g) ?? []) {
    for (const seg of run.split(/[-_/+=]/)) {
      if (seg.length < 16) continue;
      const digits = seg.replace(/\D/g, "").length;
      const letters = seg.replace(/[^A-Za-z]/g, "").length;
      if (digits >= 2 && letters >= 2) return true;
    }
  }
  return false;
}
function scanSensitive(text) {
  const kinds = new Set(secretKinds(text));
  for (const rule of EXTRA_RULES) if (rule.re.test(text)) kinds.add(rule.kind);
  if (hasLongToken(text)) kinds.add("long-token");
  return [...kinds];
}
function routeBank(repo, routing) {
  if (Object.hasOwn(routing, repo)) return routing[repo];
  for (const [pattern, bank] of Object.entries(routing)) {
    if (!/[*?]/.test(pattern)) continue;
    const source = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    if (new RegExp(`^${source}$`).test(repo)) return bank;
  }
  return void 0;
}
function parseCandidates(text, opts) {
  const out = { lines: 0, candidates: [], refused: [] };
  const firstLineOf = /* @__PURE__ */ new Map();
  const rows = text.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i].trim();
    if (!raw) continue;
    out.lines++;
    const line = i + 1;
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      out.refused.push({ line, reasons: ["not valid JSON"] });
      continue;
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      out.refused.push({ line, reasons: ["not a JSON object"] });
      continue;
    }
    const c = obj;
    const reasons = [];
    const docId = typeof c.document_id === "string" ? c.document_id : void 0;
    let reportDocId;
    if (Object.keys(c).some((k) => !FIELDS.has(k))) reasons.push("unknown field(s) present");
    if (typeof c.kind !== "string" || !KINDS.has(c.kind)) {
      reasons.push(`kind must be one of ${ENRICH_KINDS.join("|")}`);
    }
    if (typeof c.content !== "string" || !c.content.trim()) {
      reasons.push("content is required");
    } else {
      const len = [...c.content].length;
      if (len > opts.maxChars) reasons.push(`content is ${len} chars, over the ${opts.maxChars}-char cap \u2014 distil it`);
    }
    if (typeof c.context !== "string" || !c.context.trim()) reasons.push("context is required");
    if (typeof c.timestamp !== "string" || !ISO_DATE_RE.test(c.timestamp) || Number.isNaN(Date.parse(c.timestamp))) {
      reasons.push("timestamp is required as an ISO 8601 date or datetime (when it was decided)");
    }
    if (docId === void 0) {
      reasons.push("document_id is required");
    } else {
      try {
        assertPathId(docId, "document_id", true);
        reportDocId = docId;
      } catch {
        reasons.push("document_id must be a valid stable identifier (max 200 chars, no path traversal)");
      }
      const first = firstLineOf.get(docId);
      if (first !== void 0) reasons.push(`duplicate document_id (first at line ${first})`);
      else firstLineOf.set(docId, line);
    }
    const tagsOk = c.tags === void 0 || Array.isArray(c.tags) && c.tags.every((t) => typeof t === "string" && t.length > 0);
    if (!tagsOk) reasons.push("tags must be an array of non-empty strings");
    const metaOk = c.metadata === void 0 || !!c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata) && Object.values(c.metadata).every((v) => typeof v === "string");
    if (!metaOk) reasons.push("metadata must be an object of string values");
    let bank;
    if (c.bank !== void 0) {
      if (typeof c.bank === "string" && c.bank) bank = c.bank;
      else reasons.push("bank, when present, must be a non-empty string");
    } else {
      const repo = metaOk ? c.metadata?.repo : void 0;
      bank = repo ? routeBank(repo, opts.routing) : void 0;
      if (!bank) {
        reasons.push(
          repo ? "no bank: the line names none and no `routing` entry matches metadata.repo" : "no bank: the line names none and has no metadata.repo to route by"
        );
      }
    }
    const fields = [
      ["bank", bank],
      ["content", c.content],
      ["context", c.context],
      ["document_id", c.document_id],
      ["tags", tagsOk && c.tags ? c.tags.join(" ") : ""],
      ["metadata", metaOk && c.metadata ? Object.values(c.metadata).join(" ") : ""]
    ];
    if (c.metadata && typeof c.metadata === "object" && !Array.isArray(c.metadata)) {
      for (const key of Object.keys(c.metadata)) fields.push(["metadata key", key]);
    }
    const hits = [];
    for (const [name, value] of fields) {
      if (typeof value !== "string" || !value) continue;
      const kinds = scanSensitive(value);
      if (name === "document_id" && kinds.length) reportDocId = void 0;
      hits.push(...kinds.map((kind2) => `${kind2} in ${name}`));
    }
    if (hits.length) reasons.push(`secret/PII scan: ${hits.join(", ")}`);
    if (reasons.length) {
      out.refused.push({ line, ...reportDocId ? { documentId: reportDocId } : {}, reasons });
      continue;
    }
    const kind = c.kind;
    const tags = [.../* @__PURE__ */ new Set([...c.tags ?? [], `kind:${kind}`, ENRICH_SOURCE_TAG])];
    const ts = c.timestamp;
    out.candidates.push({
      line,
      bank,
      kind,
      item: {
        content: c.content,
        context: c.context,
        // Hindsight wants a datetime; a bare date means the start of that day, UTC.
        timestamp: DATE_ONLY_RE.test(ts) ? `${ts}T00:00:00Z` : ts,
        document_id: docId,
        tags,
        ...c.metadata ? { metadata: c.metadata } : {},
        update_mode: "replace",
        observation_scopes: "shared"
      }
    });
  }
  return out;
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
async function planEnrich(bytes, opts, resolve3) {
  const parsed = parseCandidates(new TextDecoder().decode(bytes), opts);
  const byBank = /* @__PURE__ */ new Map();
  for (const c of parsed.candidates) {
    const list = byBank.get(c.bank);
    if (list) list.push(c);
    else byBank.set(c.bank, [c]);
  }
  const refused = [...parsed.refused];
  const banks = [];
  const destinations = [];
  for (const [bank, all] of byBank) {
    const client = await resolve3(bank);
    if (typeof client === "string") {
      for (const c of all) refused.push({ line: c.line, documentId: c.item.document_id, reasons: [client] });
      continue;
    }
    destinations.push({ bank, fingerprint: createHash("sha256").update(client.endpoint).digest("hex") });
    const found = await mapLimit(all, LOOKUP_CONCURRENCY, (c) => client.getDocument(c.item.document_id));
    const candidates = [];
    const existing = [];
    const foreign = [];
    for (const [i, c] of all.entries()) {
      const doc = found[i];
      const id = c.item.document_id;
      if (doc === null) {
        candidates.push(c);
        continue;
      }
      const ours = Array.isArray(doc.tags) && doc.tags.includes(ENRICH_SOURCE_TAG);
      if (!ours && !opts.allowReplaceForeign) {
        const units = typeof doc.memory_unit_count === "number" ? `${doc.memory_unit_count} memory unit(s)` : "its memories";
        refused.push({
          line: c.line,
          documentId: id,
          reasons: [
            `document "${id}" already exists in bank "${bank}" and was not written by enrich \u2014 replacing it would delete ${units}. Choose another document_id. A separately authorized operator may use CLI --allow-replace-foreign and dry-run again if replacement is intended`
          ]
        });
        continue;
      }
      candidates.push(c);
      existing.push(id);
      if (!ours) foreign.push(id);
    }
    if (candidates.length) banks.push({ bank, client, candidates, existing, foreign });
  }
  refused.sort((a, b) => a.line - b.line);
  const resolved = {
    v: 2,
    file: createHash("sha256").update(bytes).digest("hex"),
    allowReplaceForeign: opts.allowReplaceForeign === true,
    destinations,
    banks: banks.map((b) => ({
      bank: b.bank,
      items: b.candidates.map((c) => c.item.document_id),
      existing: [...b.existing].sort(),
      foreign: [...b.foreign].sort()
    })),
    refused: refused.map((r) => [r.line, r.documentId ?? null, r.reasons])
  };
  const digest = createHash("sha256").update(JSON.stringify(resolved)).digest("hex");
  return { lines: parsed.lines, refused, banks, destinations, digest };
}
function confirmRefusal(plan, confirm) {
  if (typeof confirm !== "string" || !confirm) {
    return "Refusing to apply: apply requires the freshness digest printed by the dry run of this exact file. The digest does not grant authorization, ownership, or permission to write. Nothing was written.";
  }
  if (confirm.trim().toLowerCase() !== plan.digest) {
    return "Refusing to apply: the file or the resolved plan changed since the dry run that produced this digest (an edited line, a different destination or routing, or documents created or removed on the server). Dry-run again. A matching digest would prove freshness only, not authorization. Nothing was written.";
  }
  return null;
}
export {
  BankGate,
  ENRICH_MAX_CHARS_LIMIT,
  ENRICH_SOURCE_TAG,
  MAX_PROJECT_FILE_BYTES,
  TOOL_NAMES,
  assertBankId,
  assertPathId,
  confirmRefusal,
  escapeMemoryMarkers,
  findConfigFile,
  isOwnTool,
  loadProjectConfig,
  parseCandidates,
  planEnrich,
  readProjectFile,
  redact,
  redactDeep,
  redactionCount,
  routeBank,
  scanSensitive,
  secretKinds,
  stripMemoryTags
};
