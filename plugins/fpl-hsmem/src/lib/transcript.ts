import { readFileSync, existsSync } from "node:fs";

export type Role = "user" | "assistant" | "system";

export interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  tool_use_id?: string;
}

export interface Message {
  role: Role;
  content: string | ContentBlock[];
}

interface TranscriptEntry {
  type?: "user" | "assistant" | "system";
  message?: { role?: Role; content?: string | ContentBlock[] };
  role?: Role;
  content?: string | ContentBlock[];
}

/**
 * Parse Claude Code's JSONL transcript format.
 *
 * Each line is a JSON object. The "real" format nests message:
 *   { type: "user", message: { role: "user", content: "..." }, uuid: "...", ... }
 *
 * Also supports the flat format (used in tests / older flows):
 *   { role: "user", content: "..." }
 */
export function readTranscript(path: string | undefined): Message[] {
  if (!path || !existsSync(path)) return [];
  const messages: Message[] = [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return [];
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(trimmed) as TranscriptEntry;
    } catch {
      continue;
    }

    if ((entry.type === "user" || entry.type === "assistant") && entry.message) {
      const msg = entry.message;
      if (msg.role && msg.content !== undefined) {
        messages.push({ role: msg.role, content: msg.content });
      }
    } else if (entry.role && entry.content !== undefined) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }
  return messages;
}
