/**
 * The pieces the security self-test drives, re-exported as a bundled entrypoint.
 *
 * WHY THIS FILE EXISTS. `dist/index.mjs` is the MCP server entrypoint: it exports nothing, so a
 * test can only reach these functions by bundling the TypeScript source — which needs `esbuild`,
 * which lives in `node_modules`, which is not committed. The first version of the test did exactly
 * that and therefore SKIPPED on every clean checkout, meaning it would never once have run in CI.
 * A test that always skips is decoration.
 *
 * So the test surface is built like every other entrypoint and committed alongside them. It adds
 * no capability: these are pure validators and string functions, no network, no filesystem, no
 * server. It is not wired into the MCP surface and no tool calls it.
 */
export { assertPathId, assertBankId } from "./lib/client.js";
export { stripMemoryTags, escapeMemoryMarkers } from "./lib/content.js";
