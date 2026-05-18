import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * File-based state persistence for hooks.
 *
 * Hooks are ephemeral processes — state must survive between invocations.
 * Uses ${CLAUDE_PLUGIN_DATA}/state/ if set (committed plugin path), otherwise
 * falls back to ~/.hindsight/state/.
 */

const STATE_DIR = process.env.CLAUDE_PLUGIN_DATA
  ? join(process.env.CLAUDE_PLUGIN_DATA, "state")
  : join(homedir(), ".hindsight", "state");

const MAX_TRACKED_SESSIONS = 10000;

function ensureDir(): void {
  mkdirSync(STATE_DIR, { recursive: true });
}

function sanitizeName(name: string): string {
  return name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").slice(0, 200) || "state";
}

function statePath(name: string): string {
  ensureDir();
  return join(STATE_DIR, sanitizeName(name));
}

export function readJson<T>(name: string, fallback: T): T {
  const path = statePath(name);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, data: unknown): void {
  const path = statePath(name);
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, path);
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // best-effort
    }
  }
}

function capSessions<V>(data: Record<string, V>): void {
  const keys = Object.keys(data);
  if (keys.length <= MAX_TRACKED_SESSIONS) return;
  const sorted = keys.sort();
  for (const k of sorted.slice(0, Math.floor(sorted.length / 2))) {
    delete data[k];
  }
}

// ─── Turn counter (recall throttling) ─────────────────────

interface TurnsState {
  [sessionId: string]: number;
}

export function incrementTurnCount(sessionId: string): number {
  const turns = readJson<TurnsState>("turns.json", {});
  turns[sessionId] = (turns[sessionId] ?? 0) + 1;
  capSessions(turns);
  writeJson("turns.json", turns);
  return turns[sessionId];
}

// ─── Retention tracking (compaction detection) ────────────

interface RetentionEntry {
  message_count: number;
  chunk: number;
}

interface RetentionState {
  [sessionId: string]: RetentionEntry;
}

export interface RetentionTrack {
  chunkIndex: number;
  compacted: boolean;
}

/**
 * Track session retention and detect compaction.
 *
 * Claude Code can "compact" long conversations — the transcript shrinks
 * mid-session. If we keep the same document_id we'd overwrite the
 * pre-compaction document with a shorter one, losing context.
 *
 * This function compares the current message_count against the last
 * retained count. When the transcript shrinks, increments a chunk counter
 * so the caller can produce a distinct document_id and preserve history.
 */
export function trackRetention(sessionId: string, messageCount: number): RetentionTrack {
  const state = readJson<RetentionState>("retention.json", {});
  const entry = state[sessionId] ?? { message_count: 0, chunk: 0 };
  const lastCount = entry.message_count;
  let chunk = entry.chunk;
  let compacted = false;

  if (messageCount < lastCount) {
    chunk += 1;
    compacted = true;
  }

  state[sessionId] = { message_count: messageCount, chunk };
  capSessions(state);
  writeJson("retention.json", state);

  return { chunkIndex: chunk, compacted };
}
