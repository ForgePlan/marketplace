import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readPackageVersion(): string {
  try {
    const pkgPath = join(__dirname, "..", "..", "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const USER_AGENT = `hindsight-mcp/${readPackageVersion()}`;

/**
 * A path-segment id we are willing to interpolate into a URL.
 *
 * The leading-character clause is the whole point. `encodeURIComponent` does NOT encode a dot, so
 * `..` survives verbatim, and `new URL()` then resolves the dot segment in-process — a delete
 * addressed at `mental-models/..` lands on the bank base, where DELETE is delete_bank. A plain
 * `[A-Za-z0-9._~-]+` accepts `..`; requiring the first character to be alphanumeric or `_` is what
 * rejects it. Do not "simplify" this pattern.
 */
const PATH_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9._~-]*$/;

export function assertPathId(value: unknown, what = "id"): string {
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
      `${what} must start with a letter, digit or underscore and contain only ` +
        `letters, digits, dot, underscore, tilde or hyphen (got ${JSON.stringify(value)})`,
    );
  }
  return value;
}

/**
 * Bank ids need a DIFFERENT, permissive validator: they are derived from directory basenames, so
 * "my project" and "föö" are legitimate and must survive. Only the characters that would change
 * the shape of the URL are refused.
 */
export function assertBankId(value: unknown): string {
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
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) {
    throw new Error("bank id may not contain control characters");
  }
  if (v.length > 200) {
    throw new Error(`bank id is too long (${v.length} chars, max 200)`);
  }
  return v;
}

export interface RecallResult {
  text: string;
  type?: string;
  mentioned_at?: string;
  entities?: string[];
  [key: string]: unknown;
}

export interface RecallResponse {
  results?: RecallResult[];
  [key: string]: unknown;
}

export interface RetainItem {
  content: string;
  document_id?: string;
  /**
   * INTERNAL — never a caller argument. The API default is `replace`, which deletes the document's
   * prior data and reprocesses from scratch, so every call site states its choice explicitly.
   */
  update_mode?: "replace" | "append";
  context?: string;
  metadata?: Record<string, string>;
  tags?: string[];
}

export interface RetainResponse {
  success?: boolean;
  usage?: { total_tokens?: number };
  [key: string]: unknown;
}

export class HindsightClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly bankId: string;

  constructor(url: string, bankId: string, apiKey: string = "") {
    this.url = url.replace(/\/$/, "");
    this.bankId = bankId;
    this.apiKey = apiKey;
  }

  get bank(): string {
    return this.bankId;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  private bankPath(bankId?: string): string {
    return `/v1/default/banks/${encodeURIComponent(assertBankId(bankId ?? this.bankId))}`;
  }

  /**
   * Build a bank-scoped path from an ARRAY of segments, never a joined string. Each segment is
   * validated and encoded separately, and the assembled path is then checked to still sit under
   * the bank prefix — so a segment that somehow escapes validation still cannot re-address the
   * request at the bank base or above it.
   */
  private bankUrl(segments: string[], query?: Record<string, string>, bankId?: string): string {
    const prefix = this.bankPath(bankId);
    const tail = segments.map((s, i) => encodeURIComponent(assertPathId(s, `segment ${i}`))).join("/");
    const path = tail ? `${prefix}/${tail}` : prefix;
    if (!path.startsWith(`${prefix}/`) || path.length <= prefix.length + 1) {
      throw new Error(`refusing to build a request outside ${prefix}`);
    }
    const qs = query
      ? "?" + Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
      : "";
    return path + qs;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 15000,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // `redirect: "error"` on purpose. The deployment answers the bank base with a 307 whose
      // Location downgrades https -> http; following it drops the Authorization header
      // cross-origin, which has been masking a traversal rather than preventing one. Refuse the
      // redirect outright instead of relying on that accident.
      let res: Response;
      try {
        res = await fetch(`${this.url}${path}`, {
          method,
          headers: this.headers(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          redirect: "error",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/redirect/i.test(msg)) {
          throw new Error(
            `${method} ${path} was answered with a redirect, which this client refuses to follow ` +
              `(a redirect can downgrade the scheme and silently drop the Authorization header)`,
          );
        }
        throw err;
      }
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${path}: ${text}`);
      }
      return text ? (JSON.parse(text) as T) : ({} as T);
    } finally {
      clearTimeout(timer);
    }
  }

  async health(timeoutMs = 5000): Promise<boolean> {
    try {
      await this.request("GET", "/health", undefined, timeoutMs);
      return true;
    } catch {
      return false;
    }
  }

  async retain(
    items: RetainItem | RetainItem[],
    options: { async?: boolean; bankId?: string; timeoutMs?: number } = {},
  ): Promise<RetainResponse> {
    const list = Array.isArray(items) ? items : [items];
    return this.request<RetainResponse>(
      "POST",
      `${this.bankPath(options.bankId)}/memories`,
      { items: list, async: options.async ?? true },
      options.timeoutMs ?? 15000,
    );
  }

  async recall(
    query: string,
    options: {
      maxTokens?: number;
      budget?: "low" | "mid" | "high";
      types?: string[];
      bankId?: string;
      timeoutMs?: number;
    } = {},
  ): Promise<RecallResponse> {
    const body: Record<string, unknown> = {
      query,
      max_tokens: options.maxTokens ?? 1024,
    };
    if (options.budget) body.budget = options.budget;
    if (options.types && options.types.length > 0) body.types = options.types;
    return this.request<RecallResponse>(
      "POST",
      `${this.bankPath(options.bankId)}/memories/recall`,
      body,
      options.timeoutMs ?? 10000,
    );
  }

  /**
   * Upstream reflect measured 49-70 s; the old 30 s ceiling aborted real answers and reported them
   * as empty. The response field is `text` (ReflectResponse in the live OpenAPI), not `response`.
   */
  async reflect(
    query: string,
    options: { timeoutMs?: number; maxTokens?: number } = {},
  ): Promise<{ text?: string; [k: string]: unknown }> {
    const body: Record<string, unknown> = { query };
    if (options.maxTokens) body.max_tokens = options.maxTokens;
    return this.request("POST", `${this.bankPath()}/reflect`, body, options.timeoutMs ?? 120000);
  }

  /** Exact-id document lookup. The `q` list filter matches substrings, which is not existence. */
  async getDocument(id: string): Promise<{ memory_unit_count?: number; [k: string]: unknown } | null> {
    try {
      return await this.request(
        "GET",
        this.bankUrl(["documents", id]),
        undefined,
        10000,
      );
    } catch (err) {
      if (err instanceof Error && /HTTP 404/.test(err.message)) return null;
      throw err;
    }
  }

  async stats(timeoutMs = 5000): Promise<Record<string, unknown>> {
    return this.request("GET", `${this.bankPath()}/stats`, undefined, timeoutMs);
  }

  async listMentalModels(detail: "metadata" | "content" | "full" = "metadata"): Promise<unknown> {
    return this.request("GET", `${this.bankPath()}/mental-models?detail=${detail}`);
  }

  async getMentalModel(id: string, detail: "metadata" | "content" | "full" = "content"): Promise<unknown> {
    return this.request("GET", this.bankUrl(["mental-models", id], { detail }));
  }

  async createMentalModel(args: {
    id: string;
    name: string;
    sourceQuery: string;
    maxTokens?: number;
  }): Promise<unknown> {
    return this.request("POST", `${this.bankPath()}/mental-models`, {
      id: assertPathId(args.id, "mental model id"),
      name: args.name,
      source_query: args.sourceQuery,
      max_tokens: args.maxTokens ?? 4096,
      trigger: {
        mode: "delta",
        refresh_after_consolidation: true,
        fact_types: ["observation"],
        exclude_mental_models: true,
      },
    });
  }

  async updateMentalModel(id: string, updates: { name?: string; sourceQuery?: string }): Promise<unknown> {
    const body: Record<string, unknown> = {};
    if (updates.name) body.name = updates.name;
    if (updates.sourceQuery) body.source_query = updates.sourceQuery;
    return this.request("PATCH", this.bankUrl(["mental-models", id]), body);
  }

  async deleteMentalModel(id: string): Promise<unknown> {
    return this.request("DELETE", this.bankUrl(["mental-models", id]));
  }

  /**
   * Only `reflect_mission`. `retain_mission` steers WHAT GETS EXTRACTED on every future retain, so
   * an agent able to set it can rewrite the memory rules for everything that follows — through a
   * tool that reads as cosmetic. Extraction control is an operator setting, not a tool argument.
   */
  async setMission(mission: string): Promise<unknown> {
    return this.request("PATCH", `${this.bankPath()}/config`, {
      updates: { reflect_mission: mission },
    });
  }
}
