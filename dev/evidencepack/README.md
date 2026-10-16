# EvidencePack Phase 0: проверочные программы, не готовый протокол

**Phase 0 — BLOCKER. Production cutover не разрешён.**

В этом каталоге — работающие исследовательские программы и сохранённые результаты. Здесь нет runtime adapter, нормативных schemas, canonicalizer или сертификата host. Доставка полного EvidencePack v1 не завершена.

## Воспроизведение

Требования: Node.js22; установленный released ForgePlan **0.38.0**; для отдельного host-context probe — OMP18.10.3. Core probe намеренно отказывает при другой версии: сначала перепроверить семантику, а не автоматически принять новый core.

```bash
node dev/evidencepack/identity-core-probe.mjs
node dev/evidencepack/omp-context-probe.mjs
node dev/evidencepack/surface-census.mjs dev/evidencepack/census.json
```

CLI/MCP probe создаёт изолированный временный `.forgeplan`, а не использует production workspace. OMP probe запускает настоящий RPC host с загруженной extension, без model run и ForgePlan mutations. Оба сохраняют отчёты с source SHA-256; результаты не заменяют проверку полного протокола.

`identity-core-probe.mjs` использует локальный исследовательский транспорт `mcp-client.mjs`; это не новый публичный adapter или переносимый протокол. Поле `probe_source_sha256` относится к entrypoint-файлу, не является хешем всего dependency graph.

## Наблюдавшиеся результаты

- `reports/core-0.38.0.json`: **22 выполненных assertions,22 passed,0 failed**. Safe unlinked create/update/read-back, CLI/MCP body/status parity, link/activation and edge read-back; supports/weakens/refutes CL3 parent scores1/0.5/0; terminal exclusion. Ordinary `clientInfo` and claim alias can be selected by caller. Core validate accepted persisted unknown type and duplicate Markdown scoring fields. Active Evidence validation still proposed activation.
- `reports/core-transcript.json`: **59104bytes**, SHA-256 `412044dc3c7898c53caf3cf7f80640df70536967413a98627092910d53ecba53`. Synthetic inputs; these examples prove selected core behaviours, not authenticated ownership or JSON duplicate-key rejection.
- `reports/omp-18.10.3.json`: actual `ctx.agent={kind:main,id:Main,name:main,depth:0}` and session identity; capture completed, no timeout/escalation. **Main-context only**; no subagent authorization, full mutations or receipts proven.
- Corrected `census.json`: **283 content-pattern candidates,98 internal symlink aliases**, no scan errors or outside-root alias. Raw counts:12 unsupported-type literals in10files;3textual CL literals in3files;55files mentioning NEEDS_ACTIVATION. Documentation/examples are included; these are **not** classified producer counts or a claim that historical debt decreased.

Сохранённые `reports/` и `census.json` относятся к исходному исследовательскому запуску до исправлений ниже. Их source hashes и counts не выданы за результаты текущих исходников; исторические snapshots не перегенерировались.

Census resolves realpath for descendants of directory symlinks, preserves aliases, records source hashes/line matches, and explicitly leaves normative profile/responsibility reconciliation incomplete. `normative_inventory_complete=false` is intentional, not a PASS.

## Безопасные регрессии исследовательских программ

Canonical path проверяется по тем же исключённым компонентам, что и lexical walk: `.git`, `node_modules`, `.forgeplan`, `lance`, `.tgrep`, `.chunkhound`, `dev`. Исключения имён context files также действуют на видимый и канонический путь. Alias в исключённый каталог или файл остаётся в alias metadata, но его содержимое и snippets не читаются. Те же ограничения действуют на вторичное чтение plugin version из manifest. Разрешённые внутренние aliases сохраняются; внешние aliases не обходятся.

Ошибка `child.stdin`, включая `EPIPE`, отклоняет все pending requests, очищает их deadlines и сохраняет первую transport failure. Последующие запросы не продолжают запись в сломанное соединение. Initialization notification ожидает write callback; shutdown сохраняет ошибку и выполняет ограниченный cleanup. Ошибка транспорта возвращается в обычный `probe_error`/exit `1`, а не превращается в успешную проверку.

Первый targeted batch после исправлений:

```bash
node --check dev/evidencepack/surface-census.mjs && \
node --check dev/evidencepack/identity-core-probe.mjs && \
node --check dev/evidencepack/mcp-client.mjs && \
node --check dev/evidencepack/tests/surface-census.test.mjs && \
node --check dev/evidencepack/tests/mcp-client.test.mjs && \
node --test dev/evidencepack/tests/surface-census.test.mjs dev/evidencepack/tests/mcp-client.test.mjs
```

Результат: exit `0`, **12 tests passed, 0 failed, 0 skipped**. Census CLI проверен на временном fixture с синтетическим private sentinel: baseline и aliases не раскрывают sentinel, metadata сохраняется, разрешённый внутренний alias и outside-root boundary работают. В transport tests используются настоящие in-memory Node streams; ошибки callback/event, initialization notification и shutdown завершают pending requests и cleanup. Два отдельных Node-процесса запускают настоящий entrypoint с подменёнными `child_process` и недоступным для исполнения placeholder `forgeplan`: request/notification `EPIPE` дают сохранённые JSON report/transcript, exit `1`, без uncaught error и незавершённых requests.

Независимое review выявило дополнительный обход исключений context filenames через alias с разрешённым именем. Исправлены основной и вторичный manifest read; отдельный запуск `node --test dev/evidencepack/tests/surface-census.test.mjs` после этой правки — **3 passed, 0 failed, 0 skipped**, exit `0`. Четыре context basename проверяются только на синтетических временных файлах.

Настоящие ForgePlan/OMP servers, пользовательский workspace и модели в этом batch не запускались. Это regression proof двух исследовательских дефектов, не повторение retained core/OMP observations, не полный Marketplace suite и не independent PASS Phase 0.

## Проверки Marketplace

В исходном исследовательском запуске до обновления этой ветки до текущего `main`: `./scripts/validate-all-plugins.sh` **exit1**. Custom/static gates passed and eight existing plugin shell-suite commands returned0. Official Claude Code2.1.282 `--strict` rejected10/23 manifests because hook commands contain unquoted `${CLAUDE_PLUGIN_ROOT}`; [Marketplace#316](https://github.com/ForgePlan/marketplace/issues/316) tracks that class. Это исторический результат, не утверждение о текущем `main` или обновлённой ветке.

После последовательного объединения исправленных веток #312 → #313 → #314 → #315: `./scripts/validate-all-plugins.sh` **exit0 / ALL PASSED** — 24 plugin manifests проходят официальный `--strict`, 22 CI gates и 20 plugin shell suites проходят. Совместный запуск двух dev regression suites — **13 passed, 0 failed, 0 skipped**. Отдельный native LikeC4 batch — **32 passed**, включая неверные/потерянные relationship bindings и явный отказ на неподдерживаемом выборе параллельных связей. Эти результаты относятся к исправлениям инструментов и их интеграции, не к реализации EvidencePack v1.

## Артефакты вне git-каталога Marketplace

В проектном ForgePlan workspace `.forgeplan` уровнем выше git root:

- PRD-079 — полный пользовательский scope; draft, core MUST validation passed.
- ADR-031 — proposed successor; draft, **не frozen/active**.
- ADR-006 — active predecessor; не superseded.
- EVID-300 — active corrected investigation record, informs PRD-079/ADR-031.
- EVID-299 — superseded by EVID-300 after correction activation/read-back; сохраняет ошибочные первоначальные утверждения для истории.

Они не входят в git-коммиты этого PR. Наличие active investigation EVID не означает PASS implementation gate. Запись артефактов выполнена текущим административным MCP, не будущим protected adapter; actor assurance/receipt v1 не заявлены.

## Независимые reviews и блокеры

Architecture/security/contract reviews: **whole Phase0 BLOCKER**. Probe reviewer также дал BLOCKER whole-phase и7robustness findings; программы усилены, затем выполнены сохранённые final probes. Это не independent PASS нормативного протокола.

Configured `forgeplan_reason(ADR-031)` не выполнился: `claude-code` provider, `claude --print` exit1, hint `claude login`. Не менять provider/auth без разрешённой конфигурации. Исправление login не завершит оставшиеся deliverables:

1. Шесть normative schemas, sole canonicalizer/hash formulas/goldens и semantic validation.
2. Typed handoff/receipt states, authority matrix, protected adapter и replay/claim bindings.
3. Guardian exact target/chain/freshness binding, expiry crossing и executable protocol handshake.
4. Полная reconciled component inventory и nonzero positive/negative conformance.
5. Хотя бы один actual host с protected subagent mutation flow/read-back/receipts; independent PASS.

OMP in-process host context — реальный кандидат. Отсутствие signed assertions в core **не** доказывает невозможность adapter; core signature verification не обязателен при защищённой local boundary. Остальные локальные hosts подтверждены только по установленным версиям, не сертифицированы. Handoff-only — policy proposal для uncertified hosts, не уже внедрённое runtime ограничение.

## Core followups

- [#490](https://github.com/ForgePlan/forgeplan/issues/490): существующая задача о missing fields.
- [#526](https://github.com/ForgePlan/forgeplan/issues/526): unknown type/duplicate scoring fields.
- [#527](https://github.com/ForgePlan/forgeplan/issues/527): future standalone compare-and-create/idempotency.
- [#528](https://github.com/ForgePlan/forgeplan/issues/528): CLI mutation JSON.
- [#529](https://github.com/ForgePlan/forgeplan/issues/529): activation hint for already-active Evidence.

Conditional activation остаётся условным followup: сначала доказать неустранимую managed-boundary race. Core changes не объявлены реализованными.

## Release disposition

[PR322](https://github.com/ForgePlan/marketplace/pull/322) — **draft investigation PR**, не разрешение на EvidencePack cutover. Собственные изменения исследования остаются в `dev/evidencepack/`; для согласованной проверки ветка наследует исправленные #312–#315 вместе с их версиями, каталогами и C4-интеграцией. Phase1/Phase2 и исторический ремонт протокола не начаты; EVID-289 уже заменён на EVID-294 до этой работы, повторного ремонта нет. Merge в `main` и публичный release не выполнялись.

После полного Phase0 PASS можно разрешить cutover. Для merge и публичного release всё равно требуется отдельное разрешение пользователя.
