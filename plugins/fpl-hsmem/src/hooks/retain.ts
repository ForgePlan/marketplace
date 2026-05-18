#!/usr/bin/env node
/**
 * Claude Code Stop hook.
 *
 * Flow:
 *   1. Read hook input + transcript JSONL
 *   2. Throttle by retainEveryNTurns (unless force=true)
 *   3. Detect compaction (transcript shrank? bump chunk index)
 *   4. Format transcript (strip memory tags, filter roles)
 *   5. POST to Hindsight retain (async on server side)
 *
 * Exported as runRetain so SessionEnd can call it with force=true.
 */

import { readTranscript } from "../lib/transcript.js";
import { HindsightClient } from "../lib/client.js";
import { loadConfig, debugLog, type HindsightConfig } from "../lib/config.js";
import { deriveBankId } from "../lib/bank.js";
import { prepareRetentionTranscript } from "../lib/content.js";
import { incrementTurnCount, trackRetention } from "../lib/state.js";

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function resolveTemplate(value: string, vars: Record<string, string>): string {
  let out = value;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}

export async function runRetain(hookInput: HookInput, force = false): Promise<void> {
  const cwd = hookInput.cwd ?? process.cwd();
  const config: HindsightConfig = loadConfig(cwd);

  if (!config.autoRetain) {
    debugLog(config, "autoRetain disabled, skipping");
    return;
  }

  const sessionId = hookInput.session_id ?? "unknown";
  const messages = readTranscript(hookInput.transcript_path);
  if (messages.length === 0) {
    debugLog(config, "Empty transcript");
    return;
  }

  if (config.retainEveryNTurns > 1 && !force) {
    const turn = incrementTurnCount(sessionId);
    if (turn % config.retainEveryNTurns !== 0) {
      const next = (Math.floor(turn / config.retainEveryNTurns) + 1) * config.retainEveryNTurns;
      debugLog(config, `Turn ${turn}, next retain at ${next}`);
      return;
    }
  }

  const prepared = prepareRetentionTranscript(messages, {
    allowedRoles: config.retainRoles,
    fullWindow: true,
    includeToolCalls: config.retainToolCalls,
  });
  if (!prepared) {
    debugLog(config, "Empty transcript after formatting");
    return;
  }

  // Compaction detection: if message count shrank vs last retain, bump chunk index
  // so the previous (longer) document is preserved instead of being overwritten.
  const { chunkIndex, compacted } = trackRetention(sessionId, messages.length);
  if (compacted) {
    debugLog(
      config,
      `Compaction detected for session ${sessionId}: transcript shrank, advancing to chunk ${chunkIndex}`,
    );
  }
  const documentId = chunkIndex === 0 ? sessionId : `${sessionId}-c${chunkIndex}`;

  const bankId = deriveBankId(cwd);
  const client = new HindsightClient(config.url, bankId, config.apiKey);

  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const templateVars: Record<string, string> = {
    session_id: sessionId,
    bank_id: bankId,
    timestamp,
  };

  const tags: string[] = [];
  for (const raw of config.retainTags) {
    const resolved = resolveTemplate(raw, templateVars);
    if (resolved.includes(":") && resolved.split(":", 2)[1] === "") continue;
    tags.push(resolved);
  }

  const metadata: Record<string, string> = {
    retained_at: timestamp,
    message_count: String(prepared.messageCount),
    session_id: sessionId,
    chunk: String(chunkIndex),
  };

  debugLog(
    config,
    `Retain to bank '${bankId}', doc '${documentId}', ${prepared.messageCount} msgs, ${prepared.transcript.length} chars${force ? " [forced]" : ""}`,
  );

  try {
    await client.retain(
      {
        content: prepared.transcript,
        document_id: documentId,
        context: config.retainContext,
        metadata,
        tags: tags.length > 0 ? tags : undefined,
      },
      { async: true, timeoutMs: 15000 },
    );
  } catch (e) {
    process.stderr.write(`[Hindsight] Retain failed: ${(e as Error).message}\n`);
  }
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let hookInput: HookInput = {};
  if (raw.trim()) {
    try {
      hookInput = JSON.parse(raw) as HookInput;
    } catch {
      process.stderr.write("[Hindsight] Failed to parse hook input\n");
      return;
    }
  }
  await runRetain(hookInput, false);
}

const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  main().catch((e: Error) => {
    process.stderr.write(`[Hindsight] retain hook error: ${e.message}\n`);
    process.exit(0);
  });
}
