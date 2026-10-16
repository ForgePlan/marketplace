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

import { basename } from "node:path";
import { readTranscript } from "../lib/transcript.js";
import { HindsightClient } from "../lib/client.js";
import { loadProjectConfig, debugLog } from "../lib/config.js";
import { prepareRetentionTranscript } from "../lib/content.js";
import { incrementTurnCount, trackRetention } from "../lib/state.js";
import { redact } from "../lib/redact.js";

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
  // Configuration is classified before any token is acquired or network request is made.
  const loaded = loadProjectConfig(cwd);
  if (loaded.state === "missing" || loaded.state === "disabled") return;
  if (loaded.state === "invalid") {
    process.stderr.write(`[Hindsight] Retain skipped: invalid configuration: ${redact(loaded.reason)}\n`);
    return;
  }

  // Transcript capture is OFF unless the project sets `autoRetain: true`. Memory is for curated
  // facts and decisions, not a store of raw conversation: transcripts carry pasted secrets and
  // noise, and every captured session becomes an extraction job and a document someone must audit.
  if (!loaded.config.autoRetain) {
    debugLog(loaded.config, "autoRetain disabled, skipping");
    return;
  }
  const { config } = loaded;

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

  const bankId = config.defaultBank;
  const client = new HindsightClient(config.url, bankId, config.getApiKey);

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
    // Never let a retain create a bank: Hindsight creates one implicitly on first write.
    if (!(await client.bankExists(bankId))) {
      process.stderr.write(`[Hindsight] Retain skipped: bank '${bankId}' does not exist on the server\n`);
      return;
    }
    await client.retain(
      {
        content: prepared.transcript,
        document_id: documentId,
        // `replace` on purpose: this re-retains a GROWING transcript under one id every cycle, so

        // `append` would duplicate the whole conversation each time. Stated, never inherited.

        update_mode: "replace" as const,
        context: config.retainContext,
        metadata,
        tags: tags.length > 0 ? tags : undefined,
      },
      { async: true, timeoutMs: 15000 },
    );
  } catch (e) {
    process.stderr.write(`[Hindsight] Retain failed: ${redact((e as Error).message)}\n`);
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

const isDirect = basename(process.argv[1] ?? "") === "retain.mjs";
if (isDirect) {
  main().catch((e: Error) => {
    process.stderr.write(`[Hindsight] retain hook error: ${e.message}\n`);
    process.exit(0);
  });
}
