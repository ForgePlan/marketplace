// src/lib/client.ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = dirname(fileURLToPath(import.meta.url));
function readPackageVersion() {
  try {
    const pkgPath = join(__dirname, "..", "..", "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version ?? "0.0.0";
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
      const sep = String(args[rule.keep + 1] ?? "=");
      return `${kept}${sep}[redacted:${rule.kind}]`;
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
export {
  TOOL_NAMES,
  assertBankId,
  assertPathId,
  escapeMemoryMarkers,
  isOwnTool,
  redact,
  redactDeep,
  redactionCount,
  stripMemoryTags
};
