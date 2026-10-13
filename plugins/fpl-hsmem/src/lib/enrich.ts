import { createHash } from "node:crypto";
import { assertPathId, type HindsightClient, type RetainItem } from "./client.js";
import { redact, secretKinds } from "./redact.js";

/**
 * Batch enrichment: a JSONL file of curated candidate items → memories, one bank per item.
 *
 * WHAT A CANDIDATE IS. Memory is not a document store. A candidate is one short, self-contained
 * item distilled from a source — a decision and why, a rejected option and why, a lesson, a
 * pitfall, a rule — that links back to the stable artifact it came from. Never a copy of the
 * document, never a transcript. One line of the file:
 *
 *   {"bank"?, "kind", "content", "context", "timestamp", "document_id", "tags"?, "metadata"?}
 *
 * WHY EVERY LINE IS CHECKED BEFORE ANYTHING IS SENT. The server stores what it is given and
 * extracts from it in the background; a wrong bank, a pasted credential or a document-sized blob
 * is cheap to refuse here and expensive to find later. So the file is validated, routed, scanned
 * and compared with what the server already holds — and only then, when the caller says so,
 * written. A refused line is reported with its number and reason and never sent; the rest of the
 * file is unaffected.
 *
 * IDEMPOTENCE. Every item carries a stable `document_id` and is written with
 * `update_mode: "replace"`, so re-running the same file replaces the same documents instead of
 * accumulating duplicates. That is also why a duplicate `document_id` inside one file is refused:
 * two items fighting over one document would leave whichever happened to be processed last.
 *
 * WHAT APPLY MAY REPLACE. Replace is destructive: it deletes the document's earlier memories. So
 * every item is written with the tag `source-tool:enrich`, and apply replaces only documents that
 * carry it — documents this pipeline wrote. A `document_id` that collides with anything else (a
 * captured transcript, an ingested document, a manual retain) is refused per line unless the
 * caller passes `allowReplaceForeign`. The tag is a guard against accidents, not an access control:
 * anyone who can write memory can set any tag.
 *
 * WHY APPLY CARRIES A DIGEST. The dry run returns a digest of the file's bytes and of the resolved
 * plan (banks, routing, refusals, which documents exist). Apply recomputes it and refuses unless
 * the caller passes the same value, proving only that the file and plan are still fresh. A matching
 * digest never proves human authorization, ownership, or permission to write; apply remains a
 * separately authorized operator action.
 */

/** Tag carried by every item this pipeline writes; apply replaces only documents that have it. */
export const ENRICH_SOURCE_TAG = "source-tool:enrich";

export const ENRICH_KINDS = ["decision", "rejected", "lesson", "pitfall", "rule", "finding"] as const;
const KINDS = new Set<string>(ENRICH_KINDS);
const FIELDS = new Set(["bank", "kind", "content", "context", "timestamp", "document_id", "tags", "metadata"]);

export const DEFAULT_BATCH_SIZE = 20;
export const MAX_BATCH_SIZE = 100;
/** Parallel document-existence lookups per bank during planning. */
const LOOKUP_CONCURRENCY = 8;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shapes refused on top of the credential shapes in `redact.ts`. Ordered by kind; a hit reports the
 * kind and the field, never the matched text — the report itself must not become the leak.
 */
const EXTRA_RULES: { kind: string; re: RegExp }[] = [
  // Any value at all after `password=` — redact.ts's catch-all wants 8+ characters, and a short
  // password is still a password.
  { kind: "password-assignment", re: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i },
  // Credentials inside a URL: scheme://user:secret@host.
  { kind: "connection-string", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i },
  // Database / broker DSNs name internal hosts even without a password.
  { kind: "connection-string", re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|mssql|sqlserver|clickhouse):\/\/\S+/i },
  { kind: "connection-string", re: /\bjdbc:[a-z0-9]+:\S+/i },
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/ },
];

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const GIT_SHA_RE = /\b[0-9a-f]{40}\b/gi;

/**
 * A long opaque token: a run of token characters holding a segment of 16+ characters that mixes
 * letters and digits. Slugs (`ADR-001-single-intent-flow`) and identifiers split into short or
 * single-class segments and pass; UUIDs and full git SHAs are stripped first because they are
 * identifiers, not credentials.
 */
function hasLongToken(text: string): boolean {
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

/** Kinds of secret / personal data found in one string. Exported for the test surface. */
export function scanSensitive(text: string): string[] {
  const kinds = new Set(secretKinds(text));
  for (const rule of EXTRA_RULES) if (rule.re.test(text)) kinds.add(rule.kind);
  if (hasLongToken(text)) kinds.add("long-token");
  return [...kinds];
}

/**
 * The bank for a repository: an exact key wins, then the first glob (`*`, `?`) in declaration
 * order. Undefined when nothing matches — the caller refuses the line rather than guessing.
 */
export function routeBank(repo: string, routing: Record<string, string>): string | undefined {
  if (Object.hasOwn(routing, repo)) return routing[repo];
  for (const [pattern, bank] of Object.entries(routing)) {
    if (!/[*?]/.test(pattern)) continue;
    const source = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    if (new RegExp(`^${source}$`).test(repo)) return bank;
  }
  return undefined;
}

export interface EnrichCandidate {
  line: number;
  bank: string;
  kind: string;
  item: RetainItem & { document_id: string };
}

export interface EnrichRefusal {
  line: number;
  documentId?: string;
  reasons: string[];
}

export interface ParsedCandidates {
  /** Non-blank lines in the file. */
  lines: number;
  candidates: EnrichCandidate[];
  refused: EnrichRefusal[];
}

export interface EnrichOptions {
  maxChars: number;
  routing: Record<string, string>;
  /** Replace existing documents that were not written by this pipeline. Off by default. */
  allowReplaceForeign?: boolean;
}

/** Validate, route and scan every line. Pure: no network, no filesystem. */
export function parseCandidates(text: string, opts: EnrichOptions): ParsedCandidates {
  const out: ParsedCandidates = { lines: 0, candidates: [], refused: [] };
  const firstLineOf = new Map<string, number>();
  const rows = text.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i].trim();
    if (!raw) continue;
    out.lines++;
    const line = i + 1;
    let obj: unknown;
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
    const c = obj as Record<string, unknown>;
    const reasons: string[] = [];
    const docId = typeof c.document_id === "string" ? c.document_id : undefined;

    const unknown = Object.keys(c).filter((k) => !FIELDS.has(k));
    if (unknown.length) reasons.push(`unknown field(s) ${unknown.join(", ")}`);

    if (typeof c.kind !== "string" || !KINDS.has(c.kind)) {
      reasons.push(`kind must be one of ${ENRICH_KINDS.join("|")} (got ${JSON.stringify(c.kind ?? null)})`);
    }
    if (typeof c.content !== "string" || !c.content.trim()) {
      reasons.push("content is required");
    } else {
      const len = [...c.content].length;
      if (len > opts.maxChars) reasons.push(`content is ${len} chars, over the ${opts.maxChars}-char cap — distil it`);
    }
    if (typeof c.context !== "string" || !c.context.trim()) reasons.push("context is required");
    if (typeof c.timestamp !== "string" || !ISO_DATE_RE.test(c.timestamp) || Number.isNaN(Date.parse(c.timestamp))) {
      reasons.push("timestamp is required as an ISO 8601 date or datetime (when it was decided)");
    }
    if (docId === undefined) {
      reasons.push("document_id is required");
    } else {
      try {
        assertPathId(docId, "document_id", true);
      } catch (err) {
        reasons.push((err as Error).message);
      }
      const first = firstLineOf.get(docId);
      if (first !== undefined) reasons.push(`duplicate document_id (first at line ${first})`);
      else firstLineOf.set(docId, line);
    }
    const tagsOk = c.tags === undefined || (Array.isArray(c.tags) && c.tags.every((t) => typeof t === "string" && t.length > 0));
    if (!tagsOk) reasons.push("tags must be an array of non-empty strings");
    const metaOk =
      c.metadata === undefined ||
      (!!c.metadata &&
        typeof c.metadata === "object" &&
        !Array.isArray(c.metadata) &&
        Object.values(c.metadata).every((v) => typeof v === "string"));
    if (!metaOk) reasons.push("metadata must be an object of string values");

    // Bank: explicit, else routed from metadata.repo. Allowlist and existence are checked later,
    // per bank, against the server.
    let bank: string | undefined;
    if (c.bank !== undefined) {
      if (typeof c.bank === "string" && c.bank) bank = c.bank;
      else reasons.push("bank, when present, must be a non-empty string");
    } else {
      const repo = metaOk ? (c.metadata as Record<string, string> | undefined)?.repo : undefined;
      bank = repo ? routeBank(repo, opts.routing) : undefined;
      if (!bank) {
        reasons.push(
          repo
            ? `no bank: the line names none and no \`routing\` entry matches repo "${repo}"`
            : "no bank: the line names none and has no metadata.repo to route by",
        );
      }
    }

    const fields: [string, unknown][] = [
      ["content", c.content],
      ["context", c.context],
      ["document_id", c.document_id],
      ["tags", tagsOk && c.tags ? (c.tags as string[]).join(" ") : ""],
      ["metadata", metaOk && c.metadata ? Object.values(c.metadata as Record<string, string>).join(" ") : ""],
    ];
    const hits = fields.flatMap(([name, v]) =>
      typeof v === "string" && v ? scanSensitive(v).map((k) => `${k} in ${name}`) : [],
    );
    if (hits.length) reasons.push(`secret/PII scan: ${hits.join(", ")}`);

    if (reasons.length) {
      out.refused.push({ line, documentId: docId, reasons });
      continue;
    }
    const kind = c.kind as string;
    const tags = [...new Set([...((c.tags as string[] | undefined) ?? []), `kind:${kind}`, ENRICH_SOURCE_TAG])];
    const ts = c.timestamp as string;
    out.candidates.push({
      line,
      bank: bank as string,
      kind,
      item: {
        content: c.content as string,
        context: c.context as string,
        // Hindsight wants a datetime; a bare date means the start of that day, UTC.
        timestamp: DATE_ONLY_RE.test(ts) ? `${ts}T00:00:00Z` : ts,
        document_id: docId as string,
        tags,
        ...(c.metadata ? { metadata: c.metadata as Record<string, string> } : {}),
        update_mode: "replace",
        observation_scopes: "shared",
      },
    });
  }
  return out;
}

export interface BankPlan {
  bank: string;
  client: HindsightClient;
  candidates: EnrichCandidate[];
  /** document_ids of candidates the server already holds — apply replaces them. */
  existing: string[];
  /** The subset of `existing` not written by this pipeline (only with allowReplaceForeign). */
  foreign: string[];
}

export interface EnrichPlan {
  lines: number;
  refused: EnrichRefusal[];
  banks: BankPlan[];
  /** sha256 of the file bytes and resolved plan; an anti-TOCTOU check, never write authorization. */
  digest: string;
}

/** Resolves a bank to a client, or to a refusal message (allowlist / existence). */
export type BankResolver = (bank: string) => Promise<HindsightClient | string>;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
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

/**
 * Everything short of writing: parse, gate each bank (client allowlist + observed server
 * existence), look up which document_ids already exist and who wrote them, and digest the result.
 * Reads only from the client's perspective. Throws on a network or server failure — a plan built
 * on a failed lookup would misreport what an operator apply is about to replace.
 */
export async function planEnrich(bytes: Uint8Array, opts: EnrichOptions, resolve: BankResolver): Promise<EnrichPlan> {
  const parsed = parseCandidates(new TextDecoder().decode(bytes), opts);
  const byBank = new Map<string, EnrichCandidate[]>();
  for (const c of parsed.candidates) {
    const list = byBank.get(c.bank);
    if (list) list.push(c);
    else byBank.set(c.bank, [c]);
  }
  const refused = [...parsed.refused];
  const banks: BankPlan[] = [];
  for (const [bank, all] of byBank) {
    const client = await resolve(bank);
    if (typeof client === "string") {
      for (const c of all) refused.push({ line: c.line, documentId: c.item.document_id, reasons: [client] });
      continue;
    }
    const found = await mapLimit(all, LOOKUP_CONCURRENCY, (c) => client.getDocument(c.item.document_id));
    const candidates: EnrichCandidate[] = [];
    const existing: string[] = [];
    const foreign: string[] = [];
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
            `document "${id}" already exists in bank "${bank}" and was not written by enrich — replacing ` +
              `it would delete ${units}. Choose another document_id. A separately authorized operator ` +
              `may use CLI --allow-replace-foreign and dry-run again if replacement is intended`,
          ],
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
    v: 1,
    file: createHash("sha256").update(bytes).digest("hex"),
    allowReplaceForeign: opts.allowReplaceForeign === true,
    banks: banks.map((b) => ({
      bank: b.bank,
      items: b.candidates.map((c) => c.item.document_id),
      existing: [...b.existing].sort(),
      foreign: [...b.foreign].sort(),
    })),
    refused: refused.map((r) => [r.line, r.documentId ?? null, r.reasons]),
  };
  const digest = createHash("sha256").update(JSON.stringify(resolved)).digest("hex");
  return { lines: parsed.lines, refused, banks, digest };
}

/**
 * Null when `confirm` matches the plan's digest, else why apply must not proceed. Apply recomputes
 * the plan from the file as it is now, so any edit to the file — or a change on the server that
 * alters what would be replaced — yields a different digest and is refused. Equality is an
 * anti-TOCTOU freshness check only; callers must gate authorization separately.
 */
export function confirmRefusal(plan: EnrichPlan, confirm: unknown): string | null {
  if (typeof confirm !== "string" || !confirm) {
    return (
      "Refusing to apply: apply requires the freshness digest printed by the dry run of this exact " +
      "file. The digest does not grant authorization, ownership, or permission to write. Nothing was written."
    );
  }
  if (confirm.trim().toLowerCase() !== plan.digest) {
    return (
      "Refusing to apply: the file or the resolved plan changed since the dry run that produced this " +
      "digest (an edited line, a different routing, or documents created or removed on the server). " +
      "Dry-run again. A matching digest would prove freshness only, not authorization. Nothing was written."
    );
  }
  return null;
}

export interface BatchResult {
  bank: string;
  batch: number;
  of: number;
  items: number;
  operationIds: string[];
  error?: string;
}

/**
 * Write the plan: per bank, in batches, asynchronously. A failed batch is recorded and the rest
 * continue — the items are independent, and the report names exactly which batch to re-run (the
 * whole file can simply be re-applied: writes are idempotent by document_id).
 */
export async function applyEnrichPlan(plan: EnrichPlan, batchSize = DEFAULT_BATCH_SIZE): Promise<BatchResult[]> {
  const size = Math.min(Math.max(Math.floor(batchSize), 1), MAX_BATCH_SIZE);
  const results: BatchResult[] = [];
  for (const b of plan.banks) {
    const of = Math.ceil(b.candidates.length / size);
    for (let i = 0; i < of; i++) {
      const items = b.candidates.slice(i * size, (i + 1) * size).map((c) => c.item);
      const r: BatchResult = { bank: b.bank, batch: i + 1, of, items: items.length, operationIds: [] };
      try {
        const res = await b.client.retain(items, { async: true, timeoutMs: 60000 });
        r.operationIds = [...(res.operation_ids ?? []), ...(res.operation_id ? [res.operation_id] : [])];
      } catch (err) {
        r.error = redact((err as Error).message).slice(0, 300);
      }
      results.push(r);
    }
  }
  return results;
}

function kindCounts(candidates: EnrichCandidate[]): string {
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${k} ${n}`).join(", ");
}

/** A machine-readable summary — for `--json` and for hosts that post-process the result. */
export function enrichSummary(file: string, plan: EnrichPlan, applied?: BatchResult[]) {
  return {
    file,
    mode: applied ? "apply" : "dry-run",
    digest: plan.digest,
    lines: plan.lines,
    accepted: plan.banks.reduce((n, b) => n + b.candidates.length, 0),
    refused: plan.refused,
    banks: plan.banks.map((b) => ({
      bank: b.bank,
      items: b.candidates.length,
      kinds: Object.fromEntries(
        ENRICH_KINDS.map((k) => [k, b.candidates.filter((c) => c.kind === k).length]).filter(([, n]) => n),
      ),
      existing: b.existing,
      foreign: b.foreign,
    })),
    ...(applied ? { batches: applied } : {}),
  };
}

/** The human-readable report. Never prints refused content — only line numbers and reasons. */
export function formatEnrichReport(
  file: string,
  plan: EnrichPlan,
  applied?: BatchResult[],
  opts: { samples?: number; batchSize?: number; applyHint?: string } = {},
): string {
  const accepted = plan.banks.reduce((n, b) => n + b.candidates.length, 0);
  const size = Math.min(Math.max(Math.floor(opts.batchSize ?? DEFAULT_BATCH_SIZE), 1), MAX_BATCH_SIZE);
  const out: string[] = [];
  out.push(applied ? `APPLY — ${file}` : `DRY RUN — nothing written — ${file}`);
  out.push(`lines ${plan.lines} · accepted ${accepted} · refused ${plan.refused.length}`);
  out.push(`digest ${plan.digest}`);
  out.push("");
  if (plan.banks.length === 0) out.push("No item is writable.");
  for (const b of plan.banks) {
    out.push(
      `bank "${b.bank}": ${b.candidates.length} item(s) (${kindCounts(b.candidates)}) · ` +
        `already on the server ${b.existing.length} → ${applied ? "replaced" : "would be replaced"} · ` +
        `new ${b.candidates.length - b.existing.length}`,
    );
  }
  if (plan.refused.length) {
    out.push("", `refused (${plan.refused.length}) — never sent:`);
    for (const r of plan.refused) {
      out.push(`  line ${r.line}${r.documentId ? ` [${r.documentId}]` : ""}: ${r.reasons.join("; ")}`);
    }
  }
  const existing = plan.banks.flatMap((b) =>
    b.existing.map((id) => `  ${b.bank}  ${id}${b.foreign.includes(id) ? "  (NOT written by enrich — allowReplaceForeign)" : ""}`),
  );
  if (existing.length) {
    const shown = existing.slice(0, 20);
    out.push("", `already on the server (${existing.length}) — same document_id, ${applied ? "replaced" : "apply replaces them"}:`);
    out.push(...shown);
    if (existing.length > shown.length) out.push(`  … and ${existing.length - shown.length} more`);
  }
  if (applied) {
    out.push("", "batches:");
    for (const r of applied) {
      out.push(
        `  ${r.bank} ${r.batch}/${r.of}: ${r.items} item(s) → ` +
          (r.error ? `FAILED: ${r.error}` : r.operationIds.length ? `operation ${r.operationIds.join(", ")}` : "queued"),
      );
    }
    const failed = applied.filter((r) => r.error);
    out.push(
      "",
      failed.length
        ? `${failed.length} batch(es) failed — fix the cause and re-run the same file; writes are idempotent by document_id.`
        : "Queued. Extraction is asynchronous: check memory_operations (status=failed) before calling this done, then spot-check with memory_recall.",
    );
  } else {
    const samples = opts.samples ?? 2;
    if (samples > 0 && accepted) {
      out.push("", "samples:");
      for (const b of plan.banks) {
        for (const c of b.candidates.slice(0, samples)) {
          const text = c.item.content.replace(/\s+/g, " ");
          out.push(`  [${b.bank}] ${c.kind} ${c.item.document_id} (${c.item.timestamp?.slice(0, 10)})`);
          out.push(`    ${redact(text.length > 240 ? text.slice(0, 240) + "…" : text)}`);
        }
      }
    }
    const requests = plan.banks.reduce((n, b) => n + Math.ceil(b.candidates.length / size), 0);
    out.push(
      "",
      accepted
        ? `Apply would send ${accepted} item(s) in ${requests} request(s). ${opts.applyHint ?? ""}`.trimEnd()
        : "Nothing to apply.",
    );
  }
  return out.join("\n");
}
