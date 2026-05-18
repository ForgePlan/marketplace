#!/usr/bin/env node
/**
 * Hindsight MCP Server
 *
 * Long-term memory tools for Claude Code via Hindsight.
 *
 * Environment variables:
 *   HINDSIGHT_URL     — Hindsight API URL (default: http://localhost:8888)
 *   HINDSIGHT_BANK_ID — memory bank ID (default: "default")
 *   HINDSIGHT_API_KEY — optional bearer token
 */

import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { HindsightClient } from "./lib/client.js";
import { loadConfig, isDisabled } from "./lib/config.js";

interface ToolHandlerArgs {
  [key: string]: unknown;
}

type ToolHandler = (args: ToolHandlerArgs) => Promise<string>;

if (isDisabled()) {
  // Opt-out: silently exit so the MCP server doesn't surface tools in this project.
  process.exit(0);
}

const config = loadConfig();
const client = new HindsightClient(config.url, config.bankId, config.apiKey);

const tools: Tool[] = [
  {
    name: "memory_retain",
    description:
      "Save an arbitrary fact, decision, or lesson into the current bank's long-term memory.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text to save" },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
        context: { type: "string", description: "Optional context/source label" },
      },
      required: ["content"],
    },
  },
  {
    name: "memory_recall",
    description:
      "Semantic search over memories. Returns relevant facts ranked by semantic similarity.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (full natural-language phrase works best)" },
        max_tokens: { type: "number", description: "Token budget (default 1024)" },
        budget: {
          type: "string",
          enum: ["low", "mid", "high"],
          description: "Search thoroughness",
        },
        types: {
          type: "array",
          items: { type: "string" },
          description: "Memory type filter: world / experience / observation",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_reflect",
    description:
      "LLM-synthesized answer over the bank's memories. Use when you want a coherent summary, not raw facts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Question or topic to reflect on" },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_status",
    description: "Health check + statistics for the current bank (memory count, documents, links).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "memory_get_current_bank",
    description: "Returns the bank currently in use. Useful for confirming the resolved bank ID.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "memory_set_mission",
    description:
      "Set the mission/persona for the current bank (one-time). Affects how Hindsight phrases recall/reflect answers.",
    inputSchema: {
      type: "object",
      properties: {
        mission: { type: "string", description: "Bank's role/context description" },
        retain_mission: {
          type: "string",
          description: "Optional: instructions for the fact-extraction LLM",
        },
      },
      required: ["mission"],
    },
  },
  {
    name: "mental_model_list",
    description:
      "List the bank's living knowledge pages (mental models). Each page is auto-re-synthesized after every memory consolidation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mental_model_get",
    description: "Read the contents of a specific mental model by ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Mental model ID" } },
      required: ["id"],
    },
  },
  {
    name: "mental_model_create",
    description:
      "Create a living knowledge page driven by a source_query. Hindsight rebuilds its content from memories after each consolidation.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Unique page ID" },
        name: { type: "string", description: "Human-readable name" },
        source_query: {
          type: "string",
          description: "Query used to regenerate content (e.g. 'What do we know about auth?')",
        },
      },
      required: ["id", "name", "source_query"],
    },
  },
  {
    name: "mental_model_update",
    description: "Update a mental model's name or source_query.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        source_query: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "mental_model_delete",
    description: "Delete a mental model.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "document_ingest",
    description:
      "Ingest a text document (PRD, RFC, note) into the bank as a single unit. The title becomes the document_id (re-ingest overwrites).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document name (becomes document_id)" },
        content: { type: "string", description: "Full text" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "document_ingest_file",
    description: "Read a file from disk and ingest its full content as a document.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute file path" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["path"],
    },
  },
];

const handlers: Record<string, ToolHandler> = {
  memory_retain: async (args) => {
    const content = String(args.content ?? "");
    if (!content) return "Error: content is required";
    const result = await client.retain({
      content,
      tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
      context: typeof args.context === "string" ? args.context : "mcp-manual",
    });
    return `Saved to bank "${client.bank}". Tokens: ${result.usage?.total_tokens ?? "n/a"}`;
  },

  memory_recall: async (args) => {
    const query = String(args.query ?? "");
    if (!query) return "Error: query is required";
    const result = await client.recall(query, {
      maxTokens: typeof args.max_tokens === "number" ? args.max_tokens : config.recallMaxTokens,
      budget: (args.budget as "low" | "mid" | "high" | undefined) ?? config.recallBudget,
      types: Array.isArray(args.types) ? (args.types as string[]) : config.recallTypes,
    });
    const memories = result.results ?? [];
    if (memories.length === 0) return "No memories found for this query.";
    const formatted = memories
      .map(
        (m, i) =>
          `[${i + 1}] ${m.text}\n    type: ${m.type ?? "—"} | entities: ${
            Array.isArray(m.entities) && m.entities.length > 0 ? m.entities.join(", ") : "—"
          }`,
      )
      .join("\n\n");
    return `Found ${memories.length} memories:\n\n${formatted}`;
  },

  memory_reflect: async (args) => {
    const query = String(args.query ?? "");
    if (!query) return "Error: query is required";
    const result = await client.reflect(query);
    return `Reflection:\n\n${result.response ?? JSON.stringify(result, null, 2)}`;
  },

  memory_status: async () => {
    const healthy = await client.health();
    if (!healthy) {
      return `Hindsight is unreachable at ${config.url}. Check:\n  docker ps | grep hindsight\n  curl ${config.url}/health`;
    }
    type Stats = {
      total_nodes?: number;
      total_documents?: number;
      total_links?: number;
      nodes_by_fact_type?: { world?: number; observation?: number; opinion?: number };
    };
    const stats = (await client.stats().catch(() => ({}))) as Stats;
    return [
      "Hindsight status",
      "----------------",
      `Bank:      ${client.bank}`,
      `Memories:  ${stats.total_nodes ?? 0}`,
      `Documents: ${stats.total_documents ?? 0}`,
      `Links:     ${stats.total_links ?? 0}`,
      `By type:   world=${stats.nodes_by_fact_type?.world ?? 0}, observation=${
        stats.nodes_by_fact_type?.observation ?? 0
      }, opinion=${stats.nodes_by_fact_type?.opinion ?? 0}`,
      `URL:       ${config.url}`,
    ].join("\n");
  },

  memory_get_current_bank: async () => {
    return JSON.stringify({ bank_id: client.bank, url: config.url }, null, 2);
  },

  memory_set_mission: async (args) => {
    const mission = String(args.mission ?? "");
    if (!mission) return "Error: mission is required";
    const retainMission = typeof args.retain_mission === "string" ? args.retain_mission : undefined;
    await client.setMission(mission, retainMission);
    return `Mission set for bank "${client.bank}"`;
  },

  mental_model_list: async () => {
    const result = await client.listMentalModels("metadata");
    return JSON.stringify(result, null, 2);
  },

  mental_model_get: async (args) => {
    const id = String(args.id ?? "");
    if (!id) return "Error: id is required";
    const result = await client.getMentalModel(id, "content");
    return JSON.stringify(result, null, 2);
  },

  mental_model_create: async (args) => {
    const id = String(args.id ?? "");
    const name = String(args.name ?? "");
    const sourceQuery = String(args.source_query ?? "");
    if (!id || !name || !sourceQuery) return "Error: id, name, source_query are required";
    const result = await client.createMentalModel({ id, name, sourceQuery });
    return `Mental model created.\n\n${JSON.stringify(result, null, 2)}`;
  },

  mental_model_update: async (args) => {
    const id = String(args.id ?? "");
    if (!id) return "Error: id is required";
    const result = await client.updateMentalModel(id, {
      name: typeof args.name === "string" ? args.name : undefined,
      sourceQuery: typeof args.source_query === "string" ? args.source_query : undefined,
    });
    return `Updated.\n\n${JSON.stringify(result, null, 2)}`;
  },

  mental_model_delete: async (args) => {
    const id = String(args.id ?? "");
    if (!id) return "Error: id is required";
    await client.deleteMentalModel(id);
    return `Deleted mental model "${id}"`;
  },

  document_ingest: async (args) => {
    const title = String(args.title ?? "");
    const content = String(args.content ?? "");
    if (!title || !content) return "Error: title and content are required";
    const docId = title.toLowerCase().replace(/\s+/g, "-");
    await client.retain({
      content,
      document_id: docId,
      tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
      context: "document",
    });
    return `Ingested as document "${docId}"`;
  },

  document_ingest_file: async (args) => {
    const path = String(args.path ?? "");
    if (!path) return "Error: path is required";
    let content: string;
    try {
      content = readFileSync(path, "utf-8");
    } catch (e) {
      return `Cannot read file: ${(e as Error).message}`;
    }
    if (!content.trim()) return `File is empty: ${path}`;
    const filename = path.split("/").pop() ?? "doc";
    const docId = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "-");
    await client.retain({
      content,
      document_id: docId,
      tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
      context: "document",
    });
    return `Ingested ${path} as document "${docId}" (${content.length} chars)`;
  },
};

const server = new Server(
  { name: "hindsight-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = (request.params.arguments ?? {}) as ToolHandlerArgs;
  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    const text = await handler(args);
    return { content: [{ type: "text", text }] };
  } catch (e) {
    return {
      content: [
        {
          type: "text",
          text: `${name} failed: ${(e as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
