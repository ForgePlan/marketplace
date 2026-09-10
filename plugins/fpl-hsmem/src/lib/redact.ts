/**
 * Shape-based masking of credential-looking text on the way OUT of the relay.
 *
 * WHY THIS EXISTS, and what it does not claim to do.
 *
 * This bank stores raw text. `store_document_text` is on, `memory_defense` is null, and the Stop
 * hook uploads whole session transcripts every ten turns. Whatever was pasted into a session is in
 * the corpus verbatim. Enabling masking on the server changes FUTURE writes only — it cleans
 * nothing that is already stored. So the last place a secret can be caught before it re-enters a
 * model's context is here, at the formatter, on the way back out.
 *
 * That makes this a blast-radius reducer, not a control. It matches SHAPES — a JWT looks like a
 * JWT, an AWS key looks like an AWS key. A password that looks like an English word is invisible
 * to it and always will be. Do not treat a redacted transcript as a safe transcript; the only real
 * remediation for an exposed credential is rotation, and the only remediation for an exposed
 * document is deleting it.
 *
 * Applied at every path that emits stored text: recall, list, get, reflect, and truncated upstream
 * error bodies — an error body from this API can quote memory text back at you.
 */

interface Rule {
  kind: string;
  re: RegExp;
  /** Which capture group holds the part that must survive (e.g. the `api_key=` prefix). */
  keep?: number;
}

/**
 * Ordered: the most specific shapes first, so `sk-…` is reported as an OpenAI key rather than
 * being swallowed by the generic assignment rule below it.
 *
 * Every pattern is written with the global flag because `String.replace` needs it, and each is
 * cloned per call (`lastIndex` is stateful on a shared global regex — a shared instance would skip
 * every other match).
 */
const RULES: Rule[] = [
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
    keep: 1,
  },
];

/** Longest single string we will scan. Beyond this, scanning costs more than it protects. */
const MAX_SCAN = 512 * 1024;

/**
 * Mask credential-shaped substrings in `text`.
 *
 * Returns the text unchanged when it contains nothing that matches — this is the common case and
 * costs one pass per rule over the string, no allocation.
 */
export function redact(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  if (text.length > MAX_SCAN) {
    // Refuse to scan rather than silently scanning a prefix: a half-scanned string that LOOKS
    // redacted is worse than one that is visibly not.
    return `[not redacted: ${text.length} chars exceeds the ${MAX_SCAN}-char scan limit]`;
  }
  let out = text;
  for (const rule of RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    out = out.replace(re, (...args: unknown[]) => {
      if (rule.keep === undefined) return `[redacted:${rule.kind}]`;
      // args = [match, ...captureGroups, offset, whole]; capture N is at index N.
      const kept = String(args[rule.keep] ?? "");
      const sep = String(args[rule.keep + 1] ?? "=");
      return `${kept}${sep}[redacted:${rule.kind}]`;
    });
  }
  return out;
}

/** Count what would be masked, without masking. Used by diagnostics, never by a formatter. */
export function redactionCount(text: string): number {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_SCAN) return 0;
  let n = 0;
  for (const rule of RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    n += (text.match(re) ?? []).length;
  }
  return n;
}

/**
 * Redact every string in a structure, in place of `JSON.stringify` on raw API output.
 *
 * Depth-limited on purpose: a cyclic or pathologically nested object must not hang the server, and
 * nothing this relay reads from the API is legitimately deeper than a few levels.
 */
export function redactDeep<T>(value: T, depth = 0): T {
  if (depth > 12) return value;
  if (typeof value === "string") return redact(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v, depth + 1);
    }
    return out as unknown as T;
  }
  return value;
}
