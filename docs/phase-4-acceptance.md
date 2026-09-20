# Phase 4 final acceptance — 2026-09-19

All five agreed Phase 4 items are complete, including the player's addition of
local Codex support. This is acceptance of the fixed extensibility interfaces,
not a claim that population, trade, warfare or pollution transport exists.

## Provider matrix

Every transport reaches `PromptService`, which owns request identity, scope,
revision validation, preview and explicit Apply. Providers cannot approve their
own changes. Model requests occur only when the player submits Discuss/Propose.

| Provider | Transport verification | Shared contract and saved-state checks |
| --- | --- | --- |
| Claude Code | Native login; live Discuss and Propose | Both passed; forecast and explicit in-memory Apply; saved test world unchanged |
| Cursor CLI | Native browser login; version 2026.09.18-9a7762b; `composer-2.5` | Both live cases passed; same preview/Apply checks; saved test world unchanged |
| Codex CLI / OpenAI models | Existing ChatGPT login; native CLI 0.154.0, isolated default model | Both live cases passed; same preview/Apply checks; saved test world unchanged |
| Anthropic API | Injected mocked HTTP, no live paid API credential configured | Discussion/proposal, invalid operations, scope, errors, truncation, response limits and cancellation |
| Manual Cursor/Claude/Codex exchange | Export/import through browser and server tests | Server authority, stale/reused imports, scope and explicit Apply; zero automatic calls |

Envelope/transport fixtures for all four automatic adapters also pass the same
valid and invalid contract cases. This does not claim a live model was prompted
for every negative test. The live CLI smoke uses disposable worlds and makes two
real model requests per selected provider:

```sh
npm run test:providers:live -- claude-code codex
CURSOR_MODEL=composer-2.5 npm run test:providers:live -- cursor
```

Authentication and optional model/API settings are in [prompt workflow](prompt-workflow.md).
Cursor's default upstream selection intermittently returned a provider connection
error during setup; those requests failed without world changes or application
retries. One JSON-format failure also stopped safely. A single complete JSON
code fence is accepted; prose extraction and automatic model repair are not.
Cursor's account-gated context-exclusion flag is not used: its home/settings and
workspace are disposable, with only native credential storage mounted separately.

## Isolation and recovery matrix

| Area | Evidence and boundary |
| --- | --- |
| CLI filesystem isolation | Real bubblewrap checks hide this repository and `.env`, make system paths read-only, preserve native auth writes and confine ordinary writes to scratch. Codex's actual inner sandbox separately denies a dummy credential file and scratch writes. |
| Model tools/configuration | Claude disables tools/hooks/MCP/skills. Cursor uses an empty tool allowlist and deny permissions in an empty workspace. Codex disables execution/integration features and rejects unexpected tool events. Exact Cursor/Codex versions are checked before model dispatch. |
| Credential isolation | Auth remains server-side and absent from model context/bundles. Claude mounts its native config directory; Cursor its credential directory; Codex only its native auth file. These are explicit trusted-CLI write exceptions for refresh. API-key variants are implemented but not live-tested here. |
| Process/transport failure | Cancellation, timeouts, bounded stdout/stderr, process-group termination, private diagnostic errors and unknown-version rejection. Interrupted jobs become failed records and never restart themselves. |
| Save compatibility | Schema 1/engine 0.1.0, schema 2/0.2.0 and schema 3/0.3.0 migrate to schema 4/0.4.0 after original hash verification; reads do not rewrite disk, and first writes keep versioned backups. Unknown versions are rejected. |
| Current optional state | Appearance, artwork, entities and temperature additions preserve compatible existing saves without inventing missing historical events. Entity/property/plugin migrations reject unreviewed loss and invalid dependencies. |
| Interrupted publication | Atomic saved state/head, ignored orphan journal records, corruption/symlink rejection, staged selective-branch cleanup, failed metadata/publication checks. No automatic reset of a damaged world. |
| Recovery and independence | Named and 100-day rolling checkpoints, backup before restore, independent branches, verifiable replay, reviewed selective omission/replacement with explicit dependency failures. |
| Portable data | Isolated import/re-export includes required PNG assets and committed replay history; imported originals stay read-only sources. Corrupt/incomplete/oversized bundles fail validation. |
| Time/model policy | Restart/reload preserve tick; browser starts paused and pauses when hidden. Polling, ticking, previews, checkpoints and replay never call a provider. Tests count calls and check unchanged source hashes. |

These checks cover handled failures and simulated incomplete artifacts; they are
not a hardware power-loss certification. A crash can leave an unselected incomplete
branch directory; it is never reused as an existing valid world. Run one server
writer per world directory. Native CLI integration currently requires Linux and
bubblewrap; other hosts retain manual JSON exchange.

## Final regression evidence

- `npm run check`: typecheck, **113 tests passed, zero skipped**, production build.
- All 15 existing browser/regression scripts passed: base globe, prompt workflow,
  extensions, resources, checkpoints, plugins, textures, appearances, artwork,
  layering, portable bundles, entities, historical branches, selective replay,
  and concurrent Vite dependency-cache/CSS regression.
- Browser tests use temporary save directories and cover applicable desktop/mobile
  layouts, preview/cancel/Apply, reload, isolation and no autonomous model calls.
- Live Claude, Cursor and Codex acceptance passed independently; no player world
  was used for model or browser tests.

The production build retains the known large-bundle warning for Three.js. Browser
rendering and behavior checks pass; code splitting remains a later performance task.

## Next phase

Phase 5 will add tangible simulation systems: food and population, movement and
trade, knowledge/technology and conflict, then airflow-driven air pollution,
runoff-driven water contamination and contact/travel-driven generic disease.
Choose their concrete state and transport rules before implementation. Restricted
world programs remain the selected plugin runtime; arbitrary JavaScript/native
plugins are not required to complete Phase 4.
