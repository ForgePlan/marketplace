#!/usr/bin/env node
/**
 * esbuild bundle script.
 *
 * Bundles each entrypoint (MCP server, hooks, setup CLI) into a single
 * self-contained .js file under dist/. No node_modules needed at runtime —
 * the plugin can be installed without npm install.
 */

import { build } from "esbuild";
import { chmodSync } from "node:fs";
import { join } from "node:path";

const entrypoints = [
  { in: "src/index.ts", out: "dist/index.mjs" },
  { in: "src/hooks/recall.ts", out: "dist/hooks/recall.mjs" },
  { in: "src/hooks/retain.ts", out: "dist/hooks/retain.mjs" },
  { in: "src/hooks/session-end.ts", out: "dist/hooks/session-end.mjs" },
  { in: "src/setup.ts", out: "dist/setup.mjs" },
];

await Promise.all(
  entrypoints.map((e) =>
    build({
      entryPoints: [e.in],
      outfile: e.out,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      logLevel: "info",
      // Keep node:* builtins external; bundle everything else (including SDK).
      external: ["node:*"],
    }),
  ),
);

for (const e of entrypoints) {
  chmodSync(join(process.cwd(), e.out), 0o755);
}

console.log(`✓ bundled ${entrypoints.length} entrypoints to dist/`);
