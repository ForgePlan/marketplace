#!/usr/bin/env node
/**
 * Claude Code SessionEnd hook.
 *
 * Fires once when a session terminates. Forces a final retain so short sessions
 * (fewer turns than retainEveryNTurns) still land on disk, then exits.
 *
 * This is the safety net for the throttled retain hook — without it, a session
 * that ends before reaching the N-th turn boundary would lose its conversation.
 */

import { runRetain } from "./retain.js";
import { loadProjectConfig, debugLog } from "../lib/config.js";
import { redact } from "../lib/redact.js";

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  reason?: string;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
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

  // Configuration is classified before any token is acquired or network request is made.
  const loaded = loadProjectConfig(hookInput.cwd ?? process.cwd());
  if (loaded.state === "missing" || loaded.state === "disabled") return;
  if (loaded.state === "invalid") {
    process.stderr.write(`[Hindsight] SessionEnd skipped: invalid configuration: ${redact(loaded.reason)}\n`);
    return;
  }
  const { config } = loaded;
  debugLog(config, `SessionEnd, reason: ${hookInput.reason ?? "unknown"}`);

  if (!config.autoRetain) {
    debugLog(config, "autoRetain disabled, skipping final retain");
    return;
  }
  if (!hookInput.transcript_path) {
    debugLog(config, "No transcript_path, skipping final retain");
    return;
  }

  try {
    await runRetain(hookInput, true);
  } catch (e) {
    process.stderr.write(`[Hindsight] SessionEnd final retain failed: ${redact((e as Error).message)}\n`);
  }
}

main().catch((e: Error) => {
  process.stderr.write(`[Hindsight] session-end hook error: ${redact(e.message)}\n`);
  process.exit(0);
});
