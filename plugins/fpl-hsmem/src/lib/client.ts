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
    return `/v1/default/banks/${encodeURIComponent(bankId ?? this.bankId)}`;
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
      const res = await fetch(`${this.url}${path}`, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
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

  async reflect(query: string, timeoutMs = 30000): Promise<{ response?: string; [k: string]: unknown }> {
    return this.request("POST", `${this.bankPath()}/reflect`, { query }, timeoutMs);
  }

  async stats(timeoutMs = 5000): Promise<Record<string, unknown>> {
    return this.request("GET", `${this.bankPath()}/stats`, undefined, timeoutMs);
  }

  async listMentalModels(detail: "metadata" | "content" | "full" = "metadata"): Promise<unknown> {
    return this.request("GET", `${this.bankPath()}/mental-models?detail=${detail}`);
  }

  async getMentalModel(id: string, detail: "metadata" | "content" | "full" = "content"): Promise<unknown> {
    return this.request("GET", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}?detail=${detail}`);
  }

  async createMentalModel(args: {
    id: string;
    name: string;
    sourceQuery: string;
    maxTokens?: number;
  }): Promise<unknown> {
    return this.request("POST", `${this.bankPath()}/mental-models`, {
      id: args.id,
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
    return this.request("PATCH", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}`, body);
  }

  async deleteMentalModel(id: string): Promise<unknown> {
    return this.request("DELETE", `${this.bankPath()}/mental-models/${encodeURIComponent(id)}`);
  }

  async setMission(mission: string, retainMission?: string): Promise<unknown> {
    const updates: Record<string, string> = { reflect_mission: mission };
    if (retainMission) updates.retain_mission = retainMission;
    return this.request("PATCH", `${this.bankPath()}/config`, { updates });
  }
}
