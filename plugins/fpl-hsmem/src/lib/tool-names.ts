/**
 * The canonical list of tool names this relay exposes — one source, three consumers.
 *
 * It lives in its own module rather than in `index.ts` because `content.ts` needs it too, and
 * importing the server entrypoint from a library module would make a cycle. The three consumers:
 *
 *   1. `index.ts` asserts at startup that its tool definitions and its handler map both cover
 *      exactly this set. At thirteen tools a human noticed drift; at twenty-seven nobody will.
 *   2. `content.ts` uses it to recognise this relay's own tool calls in a transcript, so their
 *      arguments are never mistaken for chat messages and spliced back into memory. That was a
 *      live defect: `document_ingest` carries its payload in a field literally named `content`,
 *      so every ingest re-injected the whole document into the retained transcript.
 *   3. The skills pin their `allowed-tools` against it.
 *
 * Adding a tool means adding it here first. The startup assertion turns a forgotten handler into
 * a loud crash instead of a tool that lists and then fails on call.
 */
export const TOOL_NAMES = [
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
  "document_delete",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * The memory tools an agent that is NOT trusted to write memory must not hold.
 *
 * WHY THIS LIST EXISTS. Across the marketplace, an agent's `disallowedTools` denylist expresses
 * "this role does not write memory" by naming the write tools one by one. That worked while there
 * were three of them. When this relay went from 13 tools to 27, every one of those denylists kept
 * naming the old three — so a surface that grew for good reasons silently widened what 27 agents
 * could do to a bank, including deleting a document (irreversible, cascades to every fact
 * extracted from it) and rewriting the bank's behavioural configuration.
 *
 * A denylist that enumerates by hand goes stale the moment the thing it enumerates grows. So the
 * list lives here, next to the tools, and `scripts/ci/memory-denylist-check.js` reads it — the
 * next tool added to the relay is either on this list or deliberately off it, and CI says which.
 *
 * DELIBERATELY NOT ON THIS LIST, and why:
 *  - `document_ingest` / `document_ingest_file` — Profile A creators legitimately file artifacts
 *    into the bank; that is authorship, not curation.
 *  - `mental_model_refresh` — rebuilds a page from facts that are already there. It writes nothing
 *    a reader did not already have.
 *  - every `*_list` / `*_get`, `memory_recall`, `memory_reflect`, `memory_status`,
 *    `memory_get_current_bank`, `bank_config_get` — reads. Restricting reads would stop an agent
 *    from checking which bank it is in before acting, which is the opposite of safe.
 */
export const MEMORY_WRITE_TOOLS = [
  "memory_retain",
  "memory_set_mission",
  "memory_invalidate",
  "memory_reconsolidate",
  "mental_model_create",
  "mental_model_update",
  "mental_model_delete",
  "mental_model_clear",
  "directive_create",
  "directive_delete",
  "bank_config_set",
  "document_delete",
] as const;

const NAME_SET: ReadonlySet<string> = new Set(TOOL_NAMES);

/**
 * Is this the name of one of our own tools?
 *
 * Accepts both the bare name and any runtime's prefixed form. The `mcp__server__tool` prefix is
 * Claude Code's; other runtimes spell it differently or not at all, so matching on the suffix
 * after the last separator is the portable test.
 */
export function isOwnTool(name: string): boolean {
  if (!name) return false;
  if (NAME_SET.has(name)) return true;
  const suffix = name.split("__").pop() ?? "";
  return NAME_SET.has(suffix);
}
