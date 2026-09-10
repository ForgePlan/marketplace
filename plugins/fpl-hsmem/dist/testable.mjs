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
export {
  assertBankId,
  assertPathId,
  escapeMemoryMarkers,
  stripMemoryTags
};
