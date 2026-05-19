# agents-domain

Domain-specific language and framework specialist agents for Claude Code. Each agent provides expert-level guidance, best practices, and implementation patterns for its technology stack.

## Install

```bash
/plugin install agents-domain@ForgePlan-marketplace
```

## Agents

| Agent | Stack Focus |
|-------|-------------|
| **typescript-pro** | TypeScript 5.0+ — advanced type system, full-stack type safety, build optimization |
| **typescript-type-auditor** | TypeScript type system — type safety analysis, generics validation, compile-time verification |
| **golang-pro** | Go 1.21+ — concurrent programming, cloud-native microservices, high-performance systems |
| **frontend-developer** | React, Vue, Angular — accessible and performant web applications with TypeScript |
| **nextjs-developer** | Next.js 14+ App Router — server components, server actions, SSR/SSG/ISR, deployment |
| **electron-pro** | Electron — cross-platform desktop apps, security hardening, native OS integration |
| **embedded-systems** | Microcontroller firmware — RTOS, hardware abstraction, power optimization, real-time constraints |
| **fullstack-developer** | Database + API + Frontend — end-to-end type safety, cohesive full-stack solutions |
| **game-developer** | Game engines (Unity, Unreal, Godot) — graphics, physics, multiplayer networking, AI systems |
| **mobile-app-developer** | iOS (Swift/SwiftUI) + Android (Kotlin/Compose) + React Native + Flutter |
| **websocket-engineer** | WebSocket protocols, Socket.IO — real-time bidirectional messaging, horizontal scaling |

## Usage

Agents are available as subagents after installation. Claude Code will automatically select the appropriate agent based on your project context, or you can invoke them directly.

## Version history

- **v1.1.0** (current, 2026-05-19) — Sprint B canonical-lint compliance
  - All 11 agents migrated to canonical pattern: `model: sonnet`, hex colors, bilingual EN/RU/Triggers descriptions, ecosystem-themed colors
  - Closed marketplace-wide lint warnings 121 → 0 (LR-1..LR-3 pass)
- **v1.1.1** (in-flight, Sprint E) — documentation drift closed; no Profile B agents in this pack, Step 9b sentinel N/A

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md) § Sprint A-E session.

## License

MIT
