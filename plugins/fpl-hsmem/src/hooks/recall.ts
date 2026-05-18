#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit hook.
 *
 * Flow:
 *   1. Read hook input from stdin
 *   2. Resolve bank_id from project's .mcp.json (or cwd)
 *   3. Compose multi-turn query from transcript if needed
 *   4. Call Hindsight recall
 *   5. Output additionalContext as hookSpecificOutput
 *
 * Exits 0 on any error (graceful degradation — never breaks the prompt flow).
 */

import { readTranscript } from "../lib/transcript.js";
import { HindsightClient, type RecallResult } from "../lib/client.js";
import { loadConfig, debugLog } from "../lib/config.js";
import { deriveBankId } from "../lib/bank.js";
import {
  composeRecallQuery,
  formatCurrentTime,
  formatMemories,
  truncateRecallQuery,
} from "../lib/content.js";

interface HookInput {
  prompt?: string;
  user_prompt?: string;
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

async function main(): Promise<void> {
  const stdinRaw = await readStdin();
  let hookInput: HookInput = {};
  if (stdinRaw.trim()) {
    try {
      hookInput = JSON.parse(stdinRaw) as HookInput;
    } catch {
      process.stderr.write("[Hindsight] Failed to parse hook input\n");
      return;
    }
  }

  const cwd = hookInput.cwd ?? process.cwd();
  const config = loadConfig(cwd);

  if (!config.autoRecall) {
    debugLog(config, "autoRecall disabled, skipping");
    return;
  }

  const prompt = (hookInput.prompt ?? hookInput.user_prompt ?? "").trim();
  if (!prompt || prompt.length < 5) {
    debugLog(config, "Prompt too short for recall");
    return;
  }

  const bankId = deriveBankId(cwd);
  const client = new HindsightClient(config.url, bankId, config.apiKey);

  let query = prompt;
  if (config.recallContextTurns > 1) {
    const messages = readTranscript(hookInput.transcript_path);
    query = composeRecallQuery(prompt, messages, config.recallContextTurns, config.recallRoles);
  }
  query = truncateRecallQuery(query, prompt, config.recallMaxQueryChars);
  if (query.length > config.recallMaxQueryChars) {
    query = query.slice(0, config.recallMaxQueryChars);
  }

  debugLog(config, `Recall from bank '${bankId}', query length: ${query.length}`);

  let results: RecallResult[];
  try {
    const response = await client.recall(query, {
      maxTokens: config.recallMaxTokens,
      budget: config.recallBudget,
      types: config.recallTypes,
      timeoutMs: 10000,
    });
    results = response.results ?? [];
  } catch (e) {
    process.stderr.write(`[Hindsight] Recall failed: ${(e as Error).message}\n`);
    return;
  }

  if (results.length === 0) {
    debugLog(config, "No memories found");
    return;
  }

  const formatted = formatMemories(results);
  const block = [
    "<hindsight_memories>",
    config.recallPromptPreamble,
    `Current time - ${formatCurrentTime()}`,
    "",
    formatted,
    "</hindsight_memories>",
  ].join("\n");

  const output = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: block,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

main().catch((e: Error) => {
  process.stderr.write(`[Hindsight] recall hook error: ${e.message}\n`);
  process.exit(0);
});
