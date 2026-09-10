import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The plugin's version, from the ONE file that decides it.
 *
 * WHY THIS EXISTS. Three places carried a version and all three disagreed: `plugin.json` said
 * 3.2.0, `package.json` said 2.0.0, and the string handed to the MCP client at handshake said
 * 3.0.0 — hardcoded, and updated by hand only when someone remembered. The drift widened with
 * every release: two steps by 3.2.0, and this plugin's own ARCHITECTURE.md had already recorded
 * the same defect back at 2.2.0 without it being fixed.
 *
 * It matters because the handshake version is the only thing that says WHICH BUNDLE IS ACTUALLY
 * LOADED. When hooks and tools disagree — a stale binary pinned in a plugin cache, say — that
 * string is the evidence, and a hardcoded one lies exactly when it is needed.
 *
 * `.claude-plugin/plugin.json` is the source: it is what the marketplace catalog publishes and
 * what the runtime installs by. `package.json` is kept in step by a test, not by hope.
 */
export function pluginVersion(): string {
  const candidates = [
    join(__dirname, "..", "..", ".claude-plugin", "plugin.json"), // from src/lib (dev)
    join(__dirname, "..", ".claude-plugin", "plugin.json"), // from dist (bundled)
  ];
  for (const p of candidates) {
    try {
      const v = JSON.parse(readFileSync(p, "utf-8")).version;
      if (typeof v === "string" && v) return v;
    } catch {
      // try the next candidate
    }
  }
  // Deliberately not "0.0.0": a plausible-looking version is worse than one that says it is unknown,
  // because the whole point of the string is to identify the running bundle.
  return "unknown";
}
