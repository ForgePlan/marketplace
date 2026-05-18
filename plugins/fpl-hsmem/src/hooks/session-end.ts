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
import { loadConfig, debugLog } from "../lib/config.js";

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

  const config = loadConfig(hookInput.cwd ?? process.cwd());
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
    process.stderr.write(`[Hindsight] SessionEnd final retain failed: ${(e as Error).message}\n`);
  }
}

main().catch((e: Error) => {
  process.stderr.write(`[Hindsight] session-end hook error: ${e.message}\n`);
  process.exit(0);
});
