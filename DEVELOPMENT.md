# Development log

Updated: 2026-09-19. This file records actual implementation progress; proposed
features live in [PLAN.md](PLAN.md). Update this log at task transitions and
before each milestone commit. Never mark unverified functionality complete.

## Current work

Phase 2 final verification and milestone publishing. Next development phase:
user-initiated model discussion/proposals and staged local-agent adapters.

## Completed

- Phase 1: deterministic engine, validated edits, persistence, CLI, five tests.
- Phase 2: playable local globe, inspection, overlays, world picker, time controls,
  preview/apply, appearance foundation, and two additional integration tests.
- Public GitHub repository created; Phase 1 pushed.

- Reviewed the reference globe source and documented the product decisions.
- Wrote the implementation plan and proposed engine–world interface.
- Added texture-library and colored-at-birth rendering requirements.
- Initialized the local Git repository on `main`.

## Milestones and tasks

| Phase | Status | Tasks / exit criteria |
| --- | --- | --- |
| 0. Planning and tracking | Complete | Product plan, interface proposal, this living log. |
| 1. Engine foundation | Complete | npm/TypeScript setup; stable spherical topology; seeded worlds; pure ticks; validated declarative interventions; persistence; deterministic/conservation tests; CLI. |
| 2. First playable globe | Complete | Local server; colored globe; picking; inspector; pause/step/play; rain/elevation/channel controls; save/reload; appearance catalog/UV foundation. |
| 3. Prompt workflow | Pending | Discuss/propose/apply; direct API adapter; `.env` config; explicit local Cursor/Claude Code exchange; no autonomous calls. |
| 4. World extensibility | Pending | Definition migrations; full rule expression language; sandbox feasibility and plugin execution; artwork packs; branches/import/export. |
| 5. Broader simulation | Pending | Rich hydrology/erosion; trade/food/population; knowledge, technology, conflict, migration; long-run tuning. |
| 6. Polish and scale | Pending | Accessibility, browser automation, performance at reference resolution, packaging and integration hardening. |

## Publishing

- Requested target: new public repository, proposed `CyberSecDef/logos_engine`.
- Published: https://github.com/CyberSecDef/logos_engine (public).
- User renewed GitHub authentication; milestone 1 was pushed successfully.
- Milestone 1 commit: `98319c7` — deterministic world engine and development log.
- Push each completed major milestone once authentication is available. Never
  include `.env`, credentials, generated saves, or local agent transcripts.

## Decisions and remaining questions

- Use installed Node.js 22 initially; retain a provider-neutral adapter contract.
  Bun and the sandbox runtime remain subjects of compatibility testing.
- No blocking product questions. Provider credentials, application transports,
  and plugin runtime capabilities must be verified before those integrations.

## Activity

### 2026-09-19 — Phase 1 started

- Inspected the workspace and tooling: Node 22.22.1, npm 9.2.0, GitHub CLI.
- Initialized Git; confirmed GitHub authentication is blocked independently of
  the filesystem sandbox. No public repository has been created yet.
- Next: establish a testable deterministic engine before wiring rendering.

## Validation

Phase 1 checks passed: `npm test` and direct execution of the five engine tests.
CLI create → 10 daily steps → reload/inspect preserved the recorded state hash.
Tests cover connected/reciprocal topology and area, deterministic 100-tick replay,
water accounting, atomic/stale/duplicate proposals, communication-independent
runoff with sediment conservation, and checksummed storage/path validation.

### 2026-09-19 — Engine foundation implemented, verification in progress

- Added npm workspaces, strict TypeScript, pinned dependencies, and Node test runner.
- Adapted MIT Goldberg topology with stable adjacency and spherical tile areas.
- Added seeded fictional geography and explicit runtime-validated state schemas.
- Implemented pure daily ticks: seasonal temperature, rain, evaporation,
  simultaneous downhill runoff, sediment transport, and vegetation response.
- Added atomic rain/elevation/communication transactions, revision checks,
  duplicate rejection, and side-effect-free bounded previews.
- Added checksummed atomic saves and a create/step/inspect CLI.
- Running topology, replay, water accounting, transaction, runoff, and persistence
  tests before the first implementation commit.
- Scope note: ocean drainage is an explicit sink; soil erosion, sediment
  generation, backwater flow, trade, and population dynamics are not implemented.

### 2026-09-19 — Phase 1 complete

- Five engine tests passed, plus CLI create/step/reload smoke checks.
- Preparing the foundation milestone commit; GitHub push still awaits login.
- Started Phase 2 server and interactive globe implementation.

### 2026-09-19 — Phase 2 implemented, verification in progress

- Public repository created; pushed Phase 1 (`98319c7`).
- Added loopback-only local HTTP server, session token, revision-checked commands,
  world create/open/list, previews, and saved creator interventions.
- Added rotating Three.js globe inspired by the reference, stable tile picking,
  terrain relief, atmosphere, stars, five overlays, and inspection controls.
- Added browser-paced play/step, pause-on-hidden, creator preview/apply, world
  picker, and mobile layout. No server timer advances an unattended world.
- Added top-face UVs and deterministic appearance catalog; actual texture image
  packs, texture compositing, and settlement simulation remain pending.
- TypeScript/build and browser/integration checks are now in progress.

### 2026-09-19 — Phase 2 verification results

- Seven engine/appearance/server tests pass. HTTP tests cover authenticated local
  commands, no preview mutation, duplicate/stale rejection, concurrent step
  serialization, overwrite refusal, and persisted restart.
- Chromium smoke passed: selection, preview/apply, manual step, reload, overlays,
  play/pause, and desktop/mobile layouts with no page errors. Tests use temporary
  worlds; screenshots remain ignored under `.local/screenshots/`.
- Reviewed screenshots and corrected mobile globe framing; reduced atmosphere
  intensity. Added bounded top-face UVs as the texture integration foundation.
- Benchmark on this workspace: 10 ticks averaged 25.8 ms at 1,442 cells and
  102.6 ms at 6,762 cells. This is an initial CPU measurement, not a performance
  guarantee; the larger world is slightly above the proposed 100 ms target.
- Corrected the reference README's tile-count error in the plan: frequency 26
  produces 6,762 total cells (6,750 hexagons + 12 pentagons).
- Build succeeds with a Vite warning for the ~575 kB Three.js-inclusive bundle;
  optimization remains a later task, not a hidden build failure.
- Added `docs/implemented-interface.md` to distinguish supported operations from
  the broader proposed engine/world contract.
- Local tooling discovery finds `claude`; `cursor` and `bun` are not on PATH.
  Their integration remains unimplemented and will be verified when that phase starts.
- Final pass now checks development-server mode and expanded browser coverage
  before the milestone commit and push.

### 2026-09-19 — Phase 2 complete

- `npm run check` passed: strict typecheck, all seven tests, production build.
- Production and Vite development browser smoke passed; expanded coverage includes
  mouse picking, keyboard selection, play/pause, and creating another world.
- Removed a Vite deprecated websocket option discovered by the development smoke.
- Preparing the second major milestone commit/push. No LLM integration, executable
  plugin sandbox, or image texture rendering is claimed as complete.

## Next tasks

1. Define and publish machine-readable capabilities for the implemented proposal
   schema; add read-only Discuss and user-reviewed Propose flows.
2. Choose the first API adapter and verify local Claude Code/Cursor transports;
   keep credentials server-side and calls tied to explicit user requests.
3. Implement isolated staging/import before enabling local agents to author world
   artifacts. Investigate sandbox runtime limits before enabling world plugins.
4. Add actual forest/city artwork packs and texture rendering; the catalog/UV
   foundation currently falls back to solid colors for all tiles.
5. Expand the simulation with tested erosion, food/trade, and knowledge transfer.

## Known limits at this milestone

- Saves are one atomic checksummed document, not yet the planned journal and
  versioned world directory; only one writer per world directory is supported.
- The recent event list is capped at 200. Long-term replay checkpoints, rule
  migrations, branches, and recovery from historical revisions remain pending.
- Terrain flow ignores water head and backwater; ocean drainage is an explicit
  sink. Sediment transport exists, but erosion does not yet generate sediment.
- Communication is a stored flag; population, cities, trade, war, and research
  have no simulation systems yet. Texture art references are not loaded images.
- The browser receives full snapshots. Streaming deltas, full accessibility
  review, GPU profiling, and long-run simulation tuning remain pending.
