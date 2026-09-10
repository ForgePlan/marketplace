import type { Message, ContentBlock, Role } from "./transcript.js";
import type { RecallResult } from "./client.js";
import { isOwnTool } from "./tool-names.js";

const MESSAGE_TEXT_FIELDS = ["text", "body", "message", "content"] as const;

/**
 * Heuristic for THIRD-PARTY tools: does this name read as an operation rather than a chat message?
 *
 * Two changes from the original. The verb alternatives no longer require a trailing underscore —
 * `create_`, `get_`, `list_` meant every resource-first name (`entity_create`, `page_get`) evaded
 * the pattern and had its arguments treated as chat text. And this is now only the FALLBACK: our
 * own tools are matched by name above, not by guessing from their spelling.
 */
const OPERATIONAL_TOOL_PATTERN =
  /\b(?:recall|retain|reflect|search|extract|query|fetch|read|write|create|delete|update|patch|get|list|ingest|upload|invalidate|refresh|clear|status|config)\b/i;

/** The markers the recall hook wraps injected memory in. Both directions must know them. */
const MEMORY_MARKERS = ["hindsight_memories", "relevant_memories"] as const;

/**
 * Remove memory envelopes from text on the way IN (before it is retained).
 *
 * The old version removed only MATCHED PAIRS, so a lone closing tag inside retained text survived
 * — and since recall injects memories wrapped in those same markers, one stored `</hindsight_memories>`
 * closed the envelope early and everything after it read as un-delimited instruction, in a
 * privileged position. Memory content is attacker-influenceable by construction: anything the
 * agent reads can end up in the transcript the Stop hook retains.
 *
 * So: paired blocks first, then any surviving bare opening AND closing tags, each on its own.
 */
export function stripMemoryTags(content: string): string {
  let out = content;
  for (const marker of MEMORY_MARKERS) {
    out = out.replace(new RegExp(`<${marker}>[\\s\\S]*?</${marker}>`, "g"), "");
    out = out.replace(new RegExp(`</?${marker}\\b[^>]*>`, "g"), "");
  }
  return out;
}

/**
 * Neutralise envelope markers on the way OUT (as memory is rendered into a prompt).
 *
 * Stripping on the way in cannot be complete — memories retained before this fix are already in
 * the bank. Escaping on the way out is the half that holds regardless of what is stored.
 */
export function escapeMemoryMarkers(text: string): string {
  let out = text;
  for (const marker of MEMORY_MARKERS) {
    out = out.replace(new RegExp(`</?${marker}\\b`, "gi"), (m) => m.replace("<", "&lt;"));
  }
  return out;
}

export function stripChannelEnvelope(content: string): string {
  const match = /<channel\b[^>]*>([\s\S]*?)<\/channel>/.exec(content);
  return match ? match[1].trim() : content;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isChannelMessageTool(block: ContentBlock): boolean {
  const name = block.name ?? "";
  if (!name.startsWith("mcp__")) return false;
  // Our own tools are never chat, whatever their arguments are called. `document_ingest` carries
  // its payload in a field named `content`, so under the old spelling-only test every ingest was
  // classified as a message and the whole document was spliced into the retained transcript — the
  // document went into memory twice, once as itself and once as conversation.
  if (isOwnTool(name)) return false;
  const suffix = name.split("__").pop() ?? "";
  if (OPERATIONAL_TOOL_PATTERN.test(suffix)) return false;
  const input = block.input;
  if (!input || typeof input !== "object") return false;
  return MESSAGE_TEXT_FIELDS.some((f) => {
    const v = (input as Record<string, unknown>)[f];
    return isString(v) && v.trim().length > 0;
  });
}

function extractTextContent(content: string | ContentBlock[], role: Role): string {
  if (isString(content)) return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && block.text) {
      const text = block.text.trim();
      if (text) parts.push(text);
    } else if (block.type === "tool_use" && role === "assistant" && isChannelMessageTool(block)) {
      const input = block.input as Record<string, unknown>;
      for (const field of MESSAGE_TEXT_FIELDS) {
        const val = input[field];
        if (isString(val) && val.trim()) {
          parts.push(val.trim());
          break;
        }
      }
    }
  }
  return parts.join("\n");
}

export function sliceLastTurnsByUserBoundary(messages: Message[], turns: number): Message[] {
  if (!Array.isArray(messages) || messages.length === 0 || turns <= 0) return [];

  let usersSeen = 0;
  let startIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      usersSeen += 1;
      if (usersSeen >= turns) {
        startIndex = i;
        break;
      }
    }
  }
  return startIndex === -1 ? [...messages] : messages.slice(startIndex);
}

export function composeRecallQuery(
  latestQuery: string,
  messages: Message[],
  contextTurns: number,
  allowedRoles: string[] = ["user", "assistant"],
): string {
  const latest = latestQuery.trim();
  if (contextTurns <= 1 || !Array.isArray(messages) || messages.length === 0) {
    return latest;
  }

  const allowed = new Set(allowedRoles);
  const slice = sliceLastTurnsByUserBoundary(messages, contextTurns);

  const lines: string[] = [];
  for (const msg of slice) {
    if (!allowed.has(msg.role)) continue;
    let content = extractTextContent(msg.content, msg.role);
    content = stripChannelEnvelope(content);
    content = stripMemoryTags(content).trim();
    if (!content) continue;
    if (msg.role === "user" && content === latest) continue;
    lines.push(`${msg.role}: ${content}`);
  }

  if (lines.length === 0) return latest;
  return ["Prior context:", lines.join("\n"), latest].join("\n\n");
}

export function truncateRecallQuery(query: string, latestQuery: string, maxChars: number): string {
  if (maxChars <= 0) return query;
  const latest = latestQuery.trim();
  if (query.length <= maxChars) return query;

  const latestOnly = latest.length > maxChars ? latest.slice(0, maxChars) : latest;
  if (!query.includes("Prior context:")) return latestOnly;

  const marker = "Prior context:\n\n";
  const markerIdx = query.indexOf(marker);
  if (markerIdx === -1) return latestOnly;

  const suffixMarker = `\n\n${latest}`;
  const suffixIdx = query.lastIndexOf(suffixMarker);
  if (suffixIdx === -1) return latestOnly;

  const suffix = query.slice(suffixIdx);
  if (suffix.length >= maxChars) return latestOnly;

  const contextBody = query.slice(markerIdx + marker.length, suffixIdx);
  const contextLines = contextBody.split("\n").filter((l) => l.length > 0);

  const kept: string[] = [];
  for (let i = contextLines.length - 1; i >= 0; i--) {
    kept.unshift(contextLines[i]);
    const candidate = `${marker}${kept.join("\n")}${suffix}`;
    if (candidate.length > maxChars) {
      kept.shift();
      break;
    }
  }
  return kept.length > 0 ? `${marker}${kept.join("\n")}${suffix}` : latestOnly;
}

export function formatMemories(results: RecallResult[]): string {
  if (!results || results.length === 0) return "";
  const lines = results.map((r) => {
    // Recalled memory is UNTRUSTED DATA rendered into a privileged position. It may not carry a
    // marker that terminates the envelope around it.
    const text = escapeMemoryMarkers(r.text ?? "");
    const typeStr = r.type ? ` [${r.type}]` : "";
    const dateStr = r.mentioned_at ? ` (${r.mentioned_at})` : "";
    return `- ${text}${typeStr}${dateStr}`;
  });
  return lines.join("\n\n");
}

export function formatCurrentTime(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(
    now.getUTCHours(),
  )}:${pad(now.getUTCMinutes())}`;
}

export interface RetentionResult {
  transcript: string;
  messageCount: number;
}

export function prepareRetentionTranscript(
  messages: Message[],
  options: {
    allowedRoles?: string[];
    fullWindow?: boolean;
    includeToolCalls?: boolean;
  } = {},
): RetentionResult | null {
  const allowed = new Set(options.allowedRoles ?? ["user", "assistant"]);
  const fullWindow = options.fullWindow ?? true;
  const includeToolCalls = options.includeToolCalls ?? false;

  if (messages.length === 0) return null;

  let target: Message[];
  if (fullWindow) {
    target = messages;
  } else {
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return null;
    target = messages.slice(lastUserIdx);
  }

  if (includeToolCalls) return prepareJsonTranscript(target, allowed);
  return prepareTextTranscript(target, allowed);
}

function prepareTextTranscript(messages: Message[], allowed: Set<string>): RetentionResult | null {
  const parts: string[] = [];
  for (const msg of messages) {
    if (!allowed.has(msg.role)) continue;
    let content = extractTextContent(msg.content, msg.role);
    content = stripChannelEnvelope(content);
    content = stripMemoryTags(content).trim();
    if (!content) continue;
    parts.push(`[role: ${msg.role}]\n${content}\n[${msg.role}:end]`);
  }
  if (parts.length === 0) return null;
  const transcript = parts.join("\n\n");
  if (transcript.trim().length < 10) return null;
  return { transcript, messageCount: parts.length };
}

function extractMessageBlocks(content: string | ContentBlock[], role: Role): ContentBlock[] {
  if (isString(content)) {
    const cleaned = stripChannelEnvelope(stripMemoryTags(content)).trim();
    return cleaned ? [{ type: "text", text: cleaned }] : [];
  }
  if (!Array.isArray(content)) return [];

  const blocks: ContentBlock[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const t = block.type;

    if (t === "text" && block.text) {
      const text = stripChannelEnvelope(stripMemoryTags(block.text)).trim();
      if (text) blocks.push({ type: "text", text });
    } else if (t === "tool_use" && role === "assistant") {
      if (isChannelMessageTool(block)) {
        const input = (block.input ?? {}) as Record<string, unknown>;
        for (const field of MESSAGE_TEXT_FIELDS) {
          const val = input[field];
          if (isString(val) && val.trim()) {
            blocks.push({ type: "text", text: val.trim() });
            break;
          }
        }
      } else {
        const name = block.name ?? "unknown";
        const suffix = name.split("__").pop() ?? "";
        if (name.startsWith("mcp__") && OPERATIONAL_TOOL_PATTERN.test(suffix)) continue;
        blocks.push({ type: "tool_use", name, input: block.input ?? {} });
      }
    } else if (t === "tool_result") {
      let result = block.content;
      if (Array.isArray(result)) {
        const parts: string[] = [];
        for (const item of result) {
          if (item && typeof item === "object" && item.type === "text" && item.text) {
            parts.push(item.text.trim());
          }
        }
        result = parts.join("\n");
      }
      if (isString(result) && result.trim()) {
        let text = result.trim();
        if (text.length > 2000) text = `${text.slice(0, 2000)}... (truncated)`;
        blocks.push({ type: "tool_result", tool_use_id: block.tool_use_id ?? "", content: text });
      }
    }
  }
  return blocks;
}

function prepareJsonTranscript(messages: Message[], allowed: Set<string>): RetentionResult | null {
  const structured: { role: Role; content: ContentBlock[] }[] = [];
  for (const msg of messages) {
    if (!allowed.has(msg.role)) continue;
    const blocks = extractMessageBlocks(msg.content, msg.role);
    if (blocks.length === 0) continue;
    structured.push({ role: msg.role, content: blocks });
  }
  if (structured.length === 0) return null;
  const transcript = JSON.stringify(structured);
  if (transcript.trim().length < 10) return null;
  return { transcript, messageCount: structured.length };
}
