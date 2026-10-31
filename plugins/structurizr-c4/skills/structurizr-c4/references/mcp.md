# Optional Structurizr MCP

Use when deciding whether an agent client needs structured Structurizr tools. The file/CLI/browser workflow in this skill works without MCP.

## Verified scope

For the inspected official **2026.09.19** implementation:

- The MCP module is experimental. Its transport is stateless HTTP at `/mcp`, not a stdio process protocol. Do not register the server as stdio merely because the host can launch a binary.
- Tools cover DSL parsing, validation and inspection; Mermaid/PlantUML text exports; and workspace operations against a configured Structurizr server.
- The inspected MCP tool surface does **not** render PNG, SVG or a static site and does not edit saved line vertices or label positions. Continue to use the official CLI plus a rendered viewer/export for those tasks.
- `AbstractTools` disables DSL features that read local files/environment variables, attach local documentation or ADRs, run component discovery, or execute scripts/plugins. Do not assume a DSL that works in the local CLI is accepted unchanged by an MCP parse tool. Check the implementation when upgrading.
- The installed module did not treat `--help` as a harmless help request: it attempted to start a server. Do not use `structurizr-mcp --help` as an installation probe or doctor check.

Native CLI exports are a separate surface. The installed CLI exposes PNG/SVG options involving a viewer URL; availability of the required browser support must be tested before promising image generation. MCP text export support does not establish that capability.

## When to add it

Add MCP only for a concrete client need, such as structured parse/inspect calls or authorized operations against an existing Structurizr server. Confirm the installed module/version, HTTP client support, server scope and authentication. Keep credentials out of diagrams and checked-in configuration. Decide registration scope explicitly; do not auto-register, auto-start or publish a server while installing this skill.

An API key supplied to a server tool authenticates to the target Structurizr server. It does not establish that the MCP endpoint itself is authenticated. Verify the MCP transport's access controls separately before exposing it beyond a local loopback connection.

MCP cannot replace evidence review, routing checks, saving JSON layout, reopening the workspace or checking the actual exported artifact. A cloud/server CRUD tool also does not imply authorization to upload a local model.

## Primary sources

- [Official MCP documentation](https://docs.structurizr.com/ai/mcp)
- [Official AbstractTools implementation](https://github.com/structurizr/structurizr/blob/main/structurizr-mcp/src/main/java/com/structurizr/mcp/AbstractTools.java)

The implementation link tracks `main`; verify the installed release rather than assuming future behavior remains identical.
