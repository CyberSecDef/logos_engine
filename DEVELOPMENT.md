# Development log

Updated: 2026-09-20. This file records actual implementation progress; proposed
features live in [PLAN.md](PLAN.md). Update this log at task transitions and
before each milestone commit. Never mark unverified functionality complete.

## Current work

Phase 5c2 named resource routes and travel permissions are complete and deployed;
publishing this milestone. Routes share conserved stock/capacity reservations with
legacy transfers and expose versioned reserves, targets, cadence and daily reports.
All 146 tests, four browser checks and native Claude acceptance pass. Land-only is
the stated first-model default; optional sea-support preference is unanswered.
Next: Phase 5c3 timed journeys and migration.

## Completed

- Phase 1: deterministic engine, validated edits, persistence, CLI, five tests.
- Phase 2: playable local globe, inspection, overlays, world picker, time controls,
  preview/apply, appearance foundation, and two additional integration tests.
- Phase 3: validated prompt workflow, native-login Claude adapter, optional API
  adapter, manual agent exchange, saved conversations, and 18 passing tests.
- Phase 4: versioned definitions, conserved transfers, restricted plugins, artwork,
  entities, complete portable bundles, checkpoints, replay/branches, and automatic
  Claude/Cursor/Codex provider integration.
- Public GitHub repository created; prior milestones published.

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
| 3. Prompt workflow | Complete | Discuss/propose/apply; direct API adapter; `.env` config; explicit local Cursor/Claude Code exchange; no autonomous calls. |
| 4. World extensibility | Complete | Validated definitions/migrations; restricted plugins; layered artwork; complete portable bundles; generic entities; selective replay; final provider/compatibility acceptance. |
| 5. Broader simulation | In progress: 5a–5b complete | Rich hydrology/erosion; trade/food/population; knowledge, technology, conflict, migration; wind/air pollution, water contamination, generic disease and travel-linked spread; long-run tuning. |
| 6. Polish and scale | Pending | Accessibility, browser automation, performance at reference resolution, packaging and integration hardening. |

## Publishing

- Requested target: new public repository, proposed `CyberSecDef/logos_engine`.
- Published: https://github.com/CyberSecDef/logos_engine (public).
- User renewed GitHub authentication; milestone 1 was pushed successfully.
- Milestone 1 commit: `98319c7` — deterministic world engine and development log.
- Milestone 2 commit: `81298f4` — playable globe and creator previews, pushed to `main`.
- Push each completed major milestone once authentication is available. Never
  include `.env`, credentials, generated saves, or local agent transcripts.

## Decisions and remaining questions

- Use installed Node.js 22 initially; retain a provider-neutral adapter contract.
  Bun remains unverified; the restricted plugin runtime and Linux CLI sandboxes are implemented.
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

1. Phase 4: design definition migrations and the declarative rule expression language.
2. Investigate sandbox runtime limits before enabling executable world plugins.
3. Expand the current validated JSON exchange to staged world artifacts; automatic
   Cursor launching and Bun compatibility remain unverified.
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

### 2026-09-19 — Publication checkpoint

- Pushed the playable globe milestone (`81298f4`) to the public repository.
- Final development-mode browser check passed after the websocket update.
- Stopped the temporary verification server; start the app with `npm run dev`.
- Recording this publication checkpoint in a small documentation commit. Secrets,
  generated saves, dependencies, browser screenshots, and build output are ignored.

### 2026-09-19 — Home-network access in progress

- Requested: access the game from another host, not just localhost.
- Default server bind changed to `0.0.0.0`; added `HOST` override and printed
  network URLs. IP addresses and machine hostname pass server/Vite host checks;
  custom DNS names use `ALLOWED_HOSTS`. Same-origin checks remain enforced.
- Replaced browser `crypto.randomUUID()` with `getRandomValues()` IDs because
  ordinary LAN HTTP is not a secure context and lacks `randomUUID()`.
- Updated startup instructions; verifying network requests and remote browser
  create/preview/apply flows before committing.

### 2026-09-19 — Home-network access complete

- `npm run check` passed (typecheck, seven tests, production build).
- `LOGOS_BROWSER_LAN=1 LOGOS_BROWSER_DEV=1 node tests/browser.mjs` passed through
  a non-loopback IP, explicitly verifying an insecure HTTP browser context.
  Selection, preview/apply, world creation, persistence, and time controls work.
- The HTTP regression test covers same-origin IP access and rejects unconfigured
  DNS hosts. It uses Node HTTP to preserve the explicit Host header in the test.
- Started `npm run dev` on all IPv4 interfaces at port 5180 and left it running
  for the user's remote access. Preparing the network-access commit and push.

### 2026-09-19 — Investigating unstyled page / Vite 504

- Reproduced the reported `three.js?v=0f9b3de1` request returning 504, while the
  live transformed module still advertised that URL. Its optimizer cache files
  are absent on disk; this is a server-side failure, not a browser styling setting.
- Development and test Vite instances currently share the default cache directory.
  Isolating each server's cache to prevent cross-instance invalidation, moving
  CSS loading into HTML, and switching the served game to the production build.

### 2026-09-19 — Vite 504 fix verified

- Each development server now owns a temporary optimizer cache. Close/startup
  failure cleans up only that server's cache; tests cannot replace live deps.
- Stylesheet moved to an HTML link so styles load even if JS modules fail.
- Switched the live server to `npm start` with built assets; updated README to
  use this stable serving mode by default. Saves were preserved.
- Production build passed. Live LAN Chromium check confirmed CSS, globe, world
  loading, and zero failed HTTP requests or JavaScript errors.
- Added `npm run test:dev-cache`: two simultaneous Vite servers get distinct
  dependency paths; Three.js stays available after the other server closes;
  reload succeeds; CSS still loads with application JavaScript blocked. Passed.
- All seven engine/HTTP tests passed. Fix and regression test ready for the
  milestone commit/push; the production server remains available on port 5180.

### 2026-09-19 — Phase 3 started

- Asked which initial model connection to prioritize; continuing the shared
  workflow while that preference is pending.
- Confirmed local Claude Code CLI 2.1.273 is installed. Cursor/agent and Bun
  commands are not on PATH. Inspecting CLI capabilities without making model calls.
- Building explicit Discuss and Propose requests, bounded tile/neighborhood
  context, server-assigned proposal IDs/revisions, validation, and review/apply.
- Provider activity will be asynchronous/cancellable and only user-triggered;
  simulation ticks and previews will never invoke models.

### 2026-09-19 — Phase 3 provider selected and workflow implemented

- User selected local Claude Code with the existing login as the first provider.
- Verified bubblewrap can run on this host. Adapter masks host home directories,
  exposes only a private scratch home/workspace for writing, disables Claude
  tools/hooks/MCP/skills, and copies login credentials privately for each request.
  Neither credentials nor provider diagnostic output are sent to the browser.
- Added bounded context/capability contracts, cancellable asynchronous jobs,
  saved per-world conversations, strict scope/revision checks, and an explicit
  external JSON exchange for Cursor/other local sessions.
- Added Discuss/Propose UI, per-request scope, history, manual export/import, and
  five-day previews compared with an unchanged-world baseline.
- Typecheck passed. Beginning real Claude smoke verification and tests for no
  mutation during discussion, cancellation, invalid/out-of-scope output, stale
  imports, duplicate IDs, and no calls during ordinary simulation.

### 2026-09-19 — Phase 3 verification and authentication correction

- Real sandboxed Claude discussion succeeded in about ten seconds with zero
  operations. Fixed DNS inside the sandbox by preserving the host resolver file.
- Browser prompt smoke passed Discuss, Propose, preview/Apply, unsupported replies,
  cancellation, external export/import, reload persistence, and desktop/mobile.
- Found and fixed an import busy-state race and a cancellation status race:
  completion is now reported only after its conversation record is persisted.
- The initial credential-copy approach allowed a refreshed OAuth token to remain
  in disposable scratch storage, apparently leaving the host login out of sync.
  Replaced it with Claude's native credential store for normal refresh behavior;
  tools/hooks/MCP remain disabled and the engine repository remains hidden.
- Asked the user to renew `claude auth login` once. Final live proposal verification
  is pending renewed authentication; simulated provider tests continue independently.
- Default providers: local Claude Code, or optional Anthropic API via `.env`.
  Cursor/other applications use explicit context export and validated reply import;
  automatic Cursor CLI launching is not claimed as implemented.

### 2026-09-19 — Phase 3 live login verified

- User renewed Claude login. The final native-store adapter returned a real valid
  proposal in 8.8 seconds: rainfall exactly 80 mm/day on one selected tile.
  Engine validation succeeded and the source world remained unchanged.
- `npm run check` passed: typecheck, all 18 tests, and production build. The
  existing Three.js bundle-size warning remains a later optimization task.
- Documented prompt setup, current contracts, native-login sandbox exception,
  manual Cursor exchange, and optional API configuration. The API adapter has
  mocked HTTP coverage; no live paid API request was made.
- Final browser regressions and publication are in progress.

### 2026-09-19 — Phase 3 complete

- Final prompt browser smoke passed: discussion, proposal preview/Apply, unsupported
  replies, cancellation, external exchange, persistence, and desktop/mobile layouts.
- Existing gameplay browser regression passed using LAN access, with no page errors.
- Restarted the production server at `http://192.168.0.10:5180`, preserving saves.
  A read-only live browser check confirmed the globe and Claude Code prompt panel
  load without JavaScript errors. No live saved-world edits were made by checks.
- Preparing the Phase 3 milestone commit and public GitHub push.

### 2026-09-19 — Phase 3 publication checkpoint

- Pushed `b116685` to public `CyberSecDef/logos_engine` on `main`.
- Claude native-login integration is verified after reauthentication. The server
  remains available on all IPv4 interfaces at port 5180.
- Phase 4 and later tasks remain pending; no additional product decisions block
  the completed prompt workflow.

### 2026-09-19 — Temperature interventions started

- Requested: LLM temperature changes with observable effects on neighboring zones.
- User chose both one-time heat/cold events and sustained temperature settings.
- Implementing bounded absolute temperature operations and removable sustained
  rules, area-weighted simultaneous anomaly exchange, daily dissipation, and
  temperature-driven evaporation/vegetation effects. No model calls during ticks.
- Existing saves retain compatibility: missing anomaly means zero; rainfall and
  temperature rules must coexist without replacing one another.
- Remaining: prompt schema/context, UI and forecasts, regression and compatibility
  tests, documentation, live restart, milestone commit/push.

### 2026-09-19 — Temperature implementation ready for verification

- Added pulse/sustained temperature and stop-source operations (−100 to 200 °C).
  Heat/cold anomalies mix one hop per day with area weighting and decay 10% daily;
  sustained sources replenish their target. Rain and temperature rules coexist.
- Temperature affects evaporation and vegetation. Updated model capabilities and
  schemas, creator controls, inspector, extreme-temperature colors, and previews
  comparing neighbor temperature/water/vegetation against the baseline.
- Added tests for hot/cold spread, deterministic replay, source removal, combined
  terrain changes, bounded atomic edits, existing-save checksums, saved thermal
  replay, and model proposal validation. Extending browser coverage for the UI.
- Adjusted the evaporation fixture to cross an actual 12 °C evaporation threshold;
  warming within a single interval correctly leaves its evaporation unchanged.

### 2026-09-19 — Temperature browser and live model checks

- All 23 tests and the production build passed. Extended prompt browser smoke
  passed pulse proposals, neighbor preview, sustained controls, and source removal.
- Real Claude returned a valid 150 °C pulse proposal for the asteroid example;
  validation ran on a copy, without changing user worlds.
- Read-only validation succeeded for both existing local saves.
- Screenshot review caught an existing overlay defect: Three.js rejects the
  space-separated HSL strings used by rainfall/temperature, producing white tiles.
  Switched to supported comma-separated HSL and added a real Three.js color-parser
  regression before final restart/publication.

### 2026-09-19 — Temperature feature verified

- `npm run check` passed: typecheck, all 24 tests, and production build.
- Final prompt/browser regression passed after the overlay fix; desktop screenshot
  review confirms temperature colors render, including the heated zone.
- Existing saves validated unchanged; the live server had no active prompt at
  restart. Restarting on `0.0.0.0:5180` with the same active world.
- Supported examples: “Heat this tile to 150 °C once,” “Keep this tile at −40 °C,”
  and “Stop maintaining the temperature here.” Neighbor consequences need no
  extra model calls and do not require permission to directly edit neighbors.
- Limits: no freezing/melting, steam/fire, or full asteroid physics; requests are
  bounded to −100 through 200 °C. Preview lists edited tiles and immediate neighbors.
- Preparing the temperature milestone commit/push.

### 2026-09-19 — Temperature publication checkpoint

- Pushed milestone `dd09bc1` to public `CyberSecDef/logos_engine` on `main`.
- Live LAN verification confirmed temperature controls and updated model
  capabilities at `http://192.168.0.10:5180`. Reload the page to use them.
- Existing saves and selected world were preserved.

### 2026-09-19 — Future pollution and disease requirements documented

- Requested future properties: air pollution, water contamination, and generic
  disease, all trackable and capable of affecting other zones. No runtime changes.
- Added `docs/environment-and-health.md`, linked from the plan and proposed world
  contract. Tracks wind-driven smoke, actual-flow contamination/wash-off, famine
  links through sanitation/infrastructure, and illness through contact/travel.
- Planned dependency order: transport/accounting contracts → wind/air pollution →
  water contamination → population/food/sanitation/travel → disease and famine links.
- Defined inspector/overlay/preview expectations, distinct communication/physical
  channels, cleanup/recovery, persistence defaults, and acceptance scenarios.
- Detailed units and balancing remain future implementation choices. These fields
  are not advertised to the live LLM until supported by the engine.
- Documentation-only review: checked links, consistency, and whitespace; no runtime
  tests or server restart needed. Preparing the planning commit/push.

### 2026-09-19 — Phase 4 started

- Implementing the first complete extensibility slice: custom numeric fields and
  deterministic conditional rules, with versioned definitions and explicit updates.
- Upgrading saves to schema 2 / engine 0.2.0; verify legacy checksums before a pure
  migration, and defer disk writes to the next normal world commit.
- Rule expressions are bounded declarative sums/conditions, not JavaScript. They
  read built-in/custom state and neighbor averages and update custom fields.
- Asked which fantasy example to use for acceptance; framework work continues.
- Remaining in this milestone: engine validation/evaluation, model contract/scope,
  generic inspector/overlays/previews, regression coverage, docs, publication.

### 2026-09-19 — Phase 4a implementation and first verification

- User selected soil fertility with weather effects as the acceptance example.
  Added a reviewable example transaction: 0–100 points, land +1 on rainy days,
  land −2 above 40 °C. These are world rules, not hardcoded fertility behavior.
- Added versioned numeric definitions, explicit preserve/clamp migrations, scoped
  property edits, bounded conditional/formula rules, and dependency-aware removal.
- Rules use one snapshot after built-in systems; additive effects combine before
  clamping, conflicting set/add targets are rejected, and evaluation is bounded.
- Added world-scope prompt authority, property/rule context, generic inspector and
  overlays, and previews capped at 24 zones with total affected count disclosed.
- All 31 tests pass, including legacy-checksum migration and first-write backup,
  scope enforcement, simultaneous rules, version updates, and soil-fertility replay.
- Browser and real Claude acceptance checks are next. Plugins, artwork, branching,
  import/export, and richer rule primitives remain pending Phase 4 work.

### 2026-09-19 — Phase 4a acceptance checks passed

- Soil-fertility browser test passed: world-scope prompt → exact definition/rule
  review → bounded preview → Apply → property inspector/overlay → tick → reload.
  Application source hashes remained unchanged throughout the gameplay workflow.
- Real Claude returned a valid property definition and two daily weather rules;
  the service validated and previewed them on a temporary world without changing
  user saves. The model needed no engine/file tools.
- Both existing saves passed read-only schema-1 → schema-2 migration, with their
  file contents unchanged. First subsequent commits create a legacy backup.
- Restarted production on `0.0.0.0:5180` with the same selected world; no user
  request was active. Completing docs and final regression/publication checks.

## Historical Phase 4 remaining work (superseded by final acceptance)

- 4a: numeric definitions, conditional rules, explicit field migrations, generic
  inspector/overlays, model authority — complete.
- 4b: conserved custom-resource transfers, daily accounting, bounded formula
  clamps and neighbor extrema — complete. Property scale/offset conversions are
  implemented; general entity migrations remain pending. Immutable checkpoint snapshots/definitions are implemented;
  immutable replay records now cover future saves from explicit snapshot boundaries;
  reviewed historical branching is now implemented. Editing/skipping recorded
  interventions and portable journal bundles remain pending.
- 4c: restricted JSON plugin runtime, deterministic budgets, saved state, staged
  proposals, immutable artifacts, execution and failure recovery — implemented;
  complete, verified, live, and published. Explicit saved-state mappings are now
  implemented and verified; arbitrary migration code and JavaScript/native plugins
  are not enabled.
- 4d: shared painterly terrain pack, actual atlas rendering, 1,000-day staggered
  reveal and applied-action reveal — complete, verified, live, and published.
  World-specific conditional appearance rules are now implemented and verified.
  World-local replacement packs are now implemented. Layered composition and
  complete portable artwork bundles remain required to finish the agreed scope.
- 4e: world checkpoints, branches, restore, and portable state import/export —
  complete, live, and published. Restricted plugin definitions/state already travel
  with world exports; historical branching is implemented. External artwork bundles
  and editing/skipping replay events remain future work.
- Pollution/disease transport remains future broader-simulation work; custom
  numeric fields alone do not implement those physical/population systems.

### 2026-09-19 — Phase 4a complete

- Final typecheck/build passed; all 32 tests pass, including cadence, simultaneous
  clamping, retired-definition version reuse, legacy saves, and scoped rules.
- Both prompt/temperature browser regression and the new extensibility browser
  test pass on the final UI. Screenshots reviewed; custom overlay renders correctly.
- Real Claude acceptance passed with the soil-fertility property and two rules.
- Documented the implemented contract and example in `docs/world-extensibility.md`
  and `docs/examples/soil-fertility.json`; linked setup and interface references.
- Restarted the final build at `http://192.168.0.10:5180`. Existing worlds retain
  their state; no fertility rules were automatically installed in user saves.
- Publishing this first Phase 4 milestone. Remaining Phase 4 work is still pending
  and is not represented as implemented.

### 2026-09-19 — Phase 4a publication checkpoint

- Pushed `65a2404` to public `CyberSecDef/logos_engine` on `main`.
- Live LAN browser verified the migrated world loads with no page errors and
  Entire world prompt scope is available. The check made no model call or edit.
- Reload the game to use custom definitions and rules. Soil-fertility walkthrough
  is documented; further Phase 4 milestones remain pending.

### 2026-09-19 — Phase 4b started

- User confirmed the fertility example worked and requested continued Phase 4 work.
- User chose mana sharing to demonstrate conserved custom-resource transfers.
- Implementing explicit stock properties, adjacent one-time transfers, recurring
  sharing rules, capacity/overspending protection, and daily integer-unit accounting.
- Adding bounded formula clamps and neighbor min/max reads. No trade, wind, water
  contamination, or plugin execution is implied by generic resource transport.
- Planned validation: conservation, simultaneous flows, competing requests, scope,
  old saves/fertility rules, previews, model integration, and browser inspection.

### 2026-09-19 — Resource transfer implementation verified

- Added explicit stock resources, exact adjacent transfers, recurring equal-share
  budgets, lower-neighbor selection, formula clamps, and neighbor min/max reads.
- Transfer authority includes both endpoints and every potential rule recipient.
  Snapshot stock/capacity reservations prevent overspending and same-tick relays.
- Added a daily resource ledger in integer thousandths: starting stock, net local
  additions/removals, gross transferred amount, and ending stock. Whole-world
  totals are compared in previews; inspector shows capacity and last-day balance.
- Engine 0.3.0 / schema 3 migrates older saves without rewriting on read and
  backs up their original format on the next save (v1 or v2).
- All 39 tests passed initially. Refining scarce-stock splitting so the available
  budget is divided evenly before reservations; browser/model checks are next.

### 2026-09-19 — Phase 4b resource-transfer milestone complete

- `npm run check` passed: typecheck, all 39 tests, and production build.
- Mana browser smoke passed proposal/review/Apply, world-total preview, source
  stock/capacity, daily balance, overlay, tick/reload, and desktop/mobile layout.
- Existing fertility and prompt/temperature browser regressions both passed.
- Real Claude generated a stock definition, initial grant, and sharing rule. Its
  five-day deterministic preview retained exactly 120 motes; user saves untouched.
- Both existing local saves passed read-only schema-3 migration. No active model
  request was present at restart; same selected world preserved.
- Restarted the production game at `http://192.168.0.10:5180`. Added the resource
  guide and example transaction; completing live check and milestone publication.
- Resource accounting reports net local additions/removals per day, separately
  from gross transfers. Generic sharing remains distinct from economic trade,
  wind/water transport, disease, and population movement.

### 2026-09-19 — Resource-sharing publication checkpoint

- Pushed `36854ca` to public `CyberSecDef/logos_engine` on `main`.
- Live LAN verification passed: preserved world loads as schema 3, model transfer
  capabilities are available, and the browser reports no page errors.
- Reload the game to use mana sharing. No resources or rules were automatically
  added to user worlds; the guide uses an explicit creator proposal.

### 2026-09-19 — Phase 4e started

- User confirmed mana sharing works and requested continued Phase 4 development.
- Implementing immutable snapshot/definition artifacts and named checkpoints.
- User chose rolling automatic checkpoints during play, in addition to manual
  checkpoints and a backup before every restore.
- Next: server commands, world-management UI, isolation/retention/restore tests,
  browser acceptance, documentation, LAN deployment, and publication.
- User set the automatic cadence to every 100 simulated days; retain ten, plus
  the initial checkpoint until it rotates out. Manual/restore backups never rotate.

### 2026-09-19 — Phase 4e implementation checks

- Added immutable checksummed snapshot/definition artifacts, named checkpoints,
  automatic retention (100-day cadence, ten kept), and restore backups.
- Added reviewed restore, independent branches, validated portable JSON archives,
  collision-safe creation, and persistent active-world selection.
- Worlds UI now exposes these controls; review dialogs pause time.
- Typecheck and all 43 tests passed, including custom state/ledger preservation,
  corruption rejection, retention, restore revisions, copy isolation, and restart.
- Browser acceptance, documentation, final checks and deployment still in progress.

### 2026-09-19 — Phase 4e acceptance and deployment

- `npm run check` passed: typecheck, 43 tests, and production build.
- Checkpoint browser acceptance passed save/review/cancel/restore, restore backup,
  independent branching, export/import, reload, and desktop/mobile layouts.
- Existing mana browser regression passed. No model calls were made by world
  management or these acceptance checks.
- Added failure coverage: a failed pre-restore backup leaves live/disk state intact.
- Added the checkpoint/storage guide, API routes, archive limits, and documented
  exclusions (conversation/checkpoint collections and future executable/assets).
- Restarted `0.0.0.0:5180`, preserving first-world at day 308/revision 316.
- Live browser verified 100-day controls and no page errors, without advancing time.
- Publishing this milestone; plugins, texture rendering, general migrations and
  a full append-only replay journal are still pending.

### 2026-09-19 — Checkpoint milestone publication

- Pushed `b4b38e0` to public `CyberSecDef/logos_engine` on `main`.
- Live game and read-only browser verification passed with the same selected world.
- Reload and open Worlds for named checkpoints, reviewed restore, independent
  branches, and portable JSON import/export. Automatic checkpoints retain the
  latest ten at the user-requested 100-day cadence.

### 2026-09-19 — Phase 4c started

- User selected sandboxed world plugins as the next milestone.
- Reviewing the fixed engine interface, model proposal validation, custom-field
  accounting, and checkpoint persistence before selecting the execution format.
- Asked whether the first runtime should use a restricted JSON instruction
  format or separately sandboxed JavaScript.
- Required guarantees: explicit saved state, deterministic computation limits,
  scoped validated outputs, no ambient host capabilities, and atomic tick failure.

### 2026-09-19 — Restricted plugin implementation

- User selected the restricted program format first. No JavaScript execution.
- Implemented a flat stack instruction set with arithmetic, comparisons, jumps,
  weather/custom reads, per-tile saved state, and validated custom-field outputs.
- Added static world budgets and runtime instruction/stack/output bounds; failures
  abort the uncommitted tick. Outputs participate in existing resource accounting.
- Connecting explicit define/update/toggle/remove proposals, inspector state and
  recovery controls, schema-4 migration backups, and immutable world artifacts.
- Crystal-bloom example tracks consecutive warm days and produces crystal stock.
- Verification and browser/real-provider acceptance remain in progress.

### 2026-09-19 — Plugin engine checks passed

- All 49 tests pass, including deterministic crystal production, stock accounting,
  saved state, instruction/stack/output limits, invalid instructions/dependencies,
  writer conflicts, migration/reset, scope authority, checkpoints and archive replay.
- Fixed schema-4 serialization order so validating a newly generated world does
  not unexpectedly change its hash. Legacy schema-1/2/3 backups remain supported.
- Browser acceptance, native Claude schema compatibility, documentation and
  live deployment remain in progress.

### 2026-09-19 — Plugin acceptance and deployment

- Plugin browser passed proposal/forecast/Apply, crystal stock accounting, visible
  state counters, disable/re-enable, reload, and desktop/mobile layouts.
- Native Claude generated a valid plugin-only proposal from the new contract.
  Its five-day forecast produced exactly five crystal shards in a temporary world.
- Both existing local worlds passed read-only schema-4 migration with no disk
  changes. Restart preserved first-world at day 308/revision 316.
- Restricted programs and their state travel in checkpoint/branch/archive copies;
  arbitrary JavaScript/native execution remains unsupported.
- Added the program/ABI guide, example, budgets, recovery instructions, and
  schema-4 migration/storage documentation. Final regressions/publication ongoing.

### 2026-09-19 — Restricted plugin milestone verified

- Final `npm run check` passed (49 tests, typecheck, production build).
- Plugin, checkpoint, and mana browser suites all passed.
- Live schema-4 world and plugin capabilities verified at `0.0.0.0:5180`;
  first-world remains day 308, with no plugins installed automatically.
- Corrected conversation history to label Entire world authority accurately.
- Publishing the restricted-runtime milestone. General entity migrations,
  selective replay, texture rendering, and JavaScript/native runtimes remain future work.

### 2026-09-19 — Restricted plugin publication

- Pushed `b10dbed` to public `CyberSecDef/logos_engine` on `main`.
- Restricted `logos-stack-v1` plugins are available through the existing prompt
  workflow, with an explicit crystal-bloom walkthrough in `docs/world-plugins.md`.
- All 49 tests, three browser suites, and a native Claude acceptance check passed.
- User worlds were preserved; no automatic plugin installation or time advancement.

### 2026-09-19 — Phase 4d started

- Continuing with terrain image rendering while preserving color-only world birth.
- Asked for artwork style and day-1 versus gradual texture appearance.
- Using the imagegen skill for project raster assets. Building a shared atlas
  loader with color fallbacks, readable overlays, and no simulation state changes.
- Pending: artwork, rendering integration, acceptance tests, guide, deployment
  and milestone publication.

### 2026-09-19 — Terrain artwork and reveal policy

- User chose painterly overhead artwork and a staggered reveal over 1,000 days.
  Explicitly actioned tiles should reveal immediately on Apply.
- Generated and inspected forest, meadow, dry grassland, alpine, water and city
  PNG assets using the built-in image tool; copied all six into the repository.
- Added a versioned data catalog and bounded atlas loader with gutter extrusion.
- Implementing deterministic tile reveal order from seed/IDs, applied-action
  reveal, top-face blending, overlay isolation, and a persistent Colors only option.
- Generated images are cosmetic; no population/settlement mechanics are added.

### 2026-09-19 — Texture acceptance checks

- All 52 tests pass: staggered reveal through day 1,000, immediate action reveal,
  clone/export consistency, atlas UV padding, and six local PNG assets.
- Chromium GPU pixel checks passed: image textures change terrain rendering;
  Colors only and thematic overlays retain their original colors.
- Browser flow verified plain world birth, selection/preview without reveal,
  immediate Apply reveal at day zero, reload, six biome textures, desktop/mobile
  layouts, and missing-image color fallback. Simulation hashes stayed unchanged.
- Inspected the rendered desktop/mobile screenshots. Completing documentation,
  final regression/deployment and publication.

### 2026-09-19 — Terrain milestone deployment

- `npm run check` passed: typecheck, all 52 tests, and production build.
- Texture and plugin browser regressions passed after the final loader change.
- Restarted production at `0.0.0.0:5180`, preserving the user's current world
  at day 407; no world edits or simulation steps were made by deployment.
- Added the terrain guide, catalog/prompt provenance, initial-download size,
  rendering limits, and remaining world-local/layered-pack scope.
- Publishing six original generated PNGs with versioned immutable URLs, plus
  the 1,000-day and action-triggered reveal implementation.

### 2026-09-19 — Terrain artwork publication

- Pushed `6099bd3` to public `CyberSecDef/logos_engine` on `main`.
- Live LAN verification passed with no shader/page errors and immutable asset
  caching. Aethra remains at day 407; 590 of 1,442 places are illustrated based
  on age plus existing applied actions. No simulation data was changed.
- Six painterly PNGs and their exact built-in imagegen prompts are committed
  under `packages/tile-packs/public/painterly-v1/`.
- General entity migrations, a complete replay journal, world-local artwork
  bundles, and layered appearance composition remain future work.

### 2026-09-19 — Property conversion milestone started

- Adding declarative conversions for existing custom properties without gameplay
  engine edits. Existing defaults and stored values must both migrate.
- Dependent rules/plugins must be explicitly replaced or removed in the same
  proposal; no guessed conversion of rule constants or saved plugin counters.
- Verification, documentation, LAN deployment and publication are pending.

### 2026-09-19 — Property conversion verification

- `npm run check` passed all 56 tests, typecheck, and production build.
- Browser acceptance passed world-scope prompt, conversion/precision review,
  unchanged state during preview, coordinated rule updates, Apply and reload.
- Tests cover defaults, exact/rounded values, bounds, atomic rejection, disabled
  plugin dependencies, stock restrictions, deterministic ticks and save/checkpoint/archive.
- Added a fertility conversion example and the contract/recovery documentation.
- No user world has been edited or advanced by these checks.

### 2026-09-19 — Property conversion deployment

- Final 56-test suite, typecheck/build and conversion browser acceptance passed.
- Forecasts now retain original baseline units when comparing converted properties
  and stock totals. Inspected the conversion review in Chromium.
- Restarted at `0.0.0.0:5180`; LAN verification preserved Aethra at day 792,
  revision 802, with no running prompt interrupted or world edits made.
- Publishing this bounded Phase 4 migration milestone. General entity migrations,
  plugin-state transforms, complete replay journals and world-local/layered artwork
  remain future work.

### 2026-09-19 — Property conversion publication

- Pushed `6a56b58` to public `CyberSecDef/logos_engine` on `main`.
- The existing prompt workflow now supports explicit custom-property conversions
  with coordinated dependent definitions and precision/bounds review.
- All 56 tests and conversion browser acceptance passed; live world preserved.

### 2026-09-19 — Plugin saved-state migration started

- Continuing Phase 4 with bounded declarative state mappings for existing plugins.
- Preserve/reset behavior remains available. Mapping will require unchanged scope,
  complete destination coverage and explicit acknowledgement of discarded keys.
- No runtime capabilities or arbitrary migration code are being added.

### 2026-09-19 — Plugin state mapping verification

- All 61 tests, typecheck and production build passed.
- Browser acceptance passed mapped-state review with actual before/after values,
  unchanged live state during preview, Apply/reload and continued crystal production.
- Tests cover defaults, simultaneous swaps, new/discarded keys, exact/round policy,
  bounds/scope rejection, transaction consistency, snapshots and archive replay.
- Extended shared model JSON Schema conversion to support strict mapping alternatives.
- Native Claude acceptance and LAN deployment are in progress using isolated checks.

### 2026-09-19 — Plugin state mapping deployment

- Native Claude produced a valid map upgrade, retaining one warm day as 24 hours;
  its five-day forecast produced the expected ten crystal shards in a temporary world.
- Inspected the browser memory review; final 61-test suite and browser checks pass.
- Restarted at `0.0.0.0:5180` and verified Aethra remains day 792/revision 803.
- Added the crystal-hours example and documented precision, discarded memory,
  same-scope limits, checkpoints and compatibility. Publishing the milestone.

### 2026-09-19 — Plugin state mapping publication

- Pushed `0aa95a6` to public `CyberSecDef/logos_engine` on `main`.
- All 61 tests, browser migration acceptance and native Claude acceptance passed.
- User world preserved. Full replay history, general entities and world-local/layered
  artwork remain outstanding Phase 4 work.

### 2026-09-19 — World appearance rules started

- Connecting custom world properties to deterministic terrain appearance.
- Versioned conditional styles will reuse the installed artwork pack and preserve
  birth colors, staggered reveal and overlay readability.
- Validation, prompt/preview/inspector integration and acceptance tests are pending.

### 2026-09-19 — Appearance-rule engine checks passed

- All 66 tests, typecheck and production build passed.
- Added stable priority/ID precedence, custom/physical conditions, scope validation,
  reference/version checks, conversion dependencies and an evaluation budget.
- Pure appearance selection leaves simulation results and overlay colors unchanged.
- Added inspector rule status, bounded immediate before/after review, prompt
  capabilities, and the crystal-land example. Browser verification is in progress.

### 2026-09-19 — Appearance-rule acceptance

- Browser acceptance passed full prompt/review/Apply/reload flow, actual state-based
  appearance changes and threshold fallback, desktop/mobile layouts and no extra
  model calls. Existing texture GPU/reveal/fallback regressions also passed.
- Native Claude generated a valid appearance-only proposal with the expected
  crystal-rich zone in its preview, using a temporary world.
- Inspected the rendered crystal landscape. Documentation explains installed-art
  reuse, color behavior, priorities, reveal timing, physics separation and limits.

### 2026-09-19 — Appearance-rule deployment

- Deployed at `0.0.0.0:5180`; LAN check preserved Aethra at day 792/revision 803.
- No user world edits, styles or simulation steps were applied by deployment.
- Publishing the verified milestone with 66 passing tests, two browser suites,
  native Claude acceptance and a documented crystal-appearance example.

### 2026-09-19 — Appearance-rule publication

- Pushed `79cd743` to public `CyberSecDef/logos_engine` on `main`.
- World properties can now drive versioned cosmetic labels/colors/installed artwork
  through reviewed prompts. All 66 tests and browser/native-provider checks passed.
- Remaining Phase 4 work includes full replay history, general entities, external
  world-local artwork bundles and layered appearance.

### 2026-09-19 — Replay journal started

- Recording future simulation steps and accepted proposals without model calls.
- Existing worlds will begin with an explicit adoption snapshot on their next save;
  unavailable earlier day-by-day history will not be invented.
- Restore/import/replacement boundaries use snapshots. Interrupted writes must not
  publish partial history. UI, CLI and regression checks are in progress.

### 2026-09-19 — Replay journal checks passed

- All 72 tests, typecheck and production build passed.
- Verified deterministic step/proposal replay, adoption without read-time rewriting,
  restore boundaries/independent branches, unpublished orphan isolation, failed-save
  atomicity, corrupt ancestors, symlink rejection and mismatched replay detection.
- HTTP tests confirm preview/checkpoints do not add actions and accepted changes,
  steps and restores do. Browser checkpoint/history regression is in progress.

### 2026-09-19 — Replay journal acceptance

- All 73 tests pass, including actual CLI success/budget-limit cases and the
  50-entry recent-history bound. Verification leaves saved world bytes unchanged.
- Browser regression passed recorded steps/restores, read-only replay verification,
  checkpoint recovery, branching, export/import, reload and desktop/mobile layout.
- Inspected the history panel. Documented adoption, snapshot boundaries, indefinite
  journal retention, replay budgets and current portable-export limitations.
- Final artifact-size consistency check, deployment and publication are underway.

### 2026-09-19 — Replay journal deployment

- Final 73-test suite, typecheck and build passed after matching artifact write/read
  bounds. Checkpoint/history browser regression passed.
- Restarted at `0.0.0.0:5180`; LAN checks preserved Aethra at day 792/revision 804.
- Live history endpoint reports no records yet, as expected: adoption starts on
  the next save. Deployment did not edit or advance the user world.
- Publishing the journal, recent-history view and read-only verification CLI.

### 2026-09-19 — Replay journal publication

- Pushed `5da7446` to public `CyberSecDef/logos_engine` on `main`.
- Future saved steps/proposals are recorded with immutable hashes; recent history
  and bounded read-only replay verification are available.
- All 73 tests and browser recovery/history checks passed; user world preserved.
- Selective replay, portable journal bundles, general entities and external/layered
  artwork remain future Phase 4 work.

### 2026-09-19 — Historical branching started

- Extending replay history with reviewed independent branches at recorded save
  boundaries, including moments without named checkpoints.
- Reconstruction will use matching verified checkpoints when available, preserve
  the source world, and enforce replay/search limits before creating a branch.

### 2026-09-19 — Historical branch acceptance

- All 77 tests passed, including exact state/memory/appearance reconstruction,
  checkpoint acceleration, abandoned pre-restore paths, orphan/budget rejection,
  stale/mismatched reviews and independent branch creation.
- Browser passed paging beyond 50 saves, review/cancel, day-one branch creation,
  unchanged day-51 source, independent ticking, reload/mobile and zero model calls.
- Inspected the review screenshot. Documentation states save-boundary selection,
  1,000-day reconstruction and 10,000-record search limits.

### 2026-09-19 — Historical branch deployment

- Final typecheck/build, all 77 tests, historical-branch browser and checkpoint
  browser regressions passed. No model calls were needed.
- Restarted at `0.0.0.0:5180`; LAN checks preserved Aethra at day 792/revision 804.
- History is still empty until this world’s next saved action/day; deployment did
  not create a branch, apply a change or advance the user world.
- Publishing paged history, verified reconstruction and reviewed independent branches.

### 2026-09-19 — Historical branch publication

- Pushed `151e338` to public `CyberSecDef/logos_engine` on `main`.
- Recorded moments can be reviewed and copied into independent worlds, using
  verified checkpoints/replay and paged history. User world remains unchanged.
- All 77 tests and both browser recovery/branching suites passed.
- Portable journal bundles, editing/skipping recorded interventions, general
  entities and external/layered artwork remain future Phase 4 work.

### 2026-09-19 — Phase 4 completion scope agreed

- Documented all five remaining areas with concrete acceptance criteria and order.
- All five are required; prior suggestions to defer layering/selective replay are
  superseded. Restricted plugins remain the selected runtime.
- Beginning validated world-local artwork import, pinned references and reviewed
  activation. No new requirements are needed from the player for this foundation.

### 2026-09-19 — World-local pack implementation checks

- All 83 tests pass with typecheck/build: PNG validation and bounds, pinned versions,
  no reveal/time/physics changes, preview isolation, authenticated image serving,
  checkpoint/branch copies, journal replay, model scope and pack-generation CLI.
- Renderer now reloads a bounded atlas per world/manifest and ignores stale async
  image results; transparent pixels retain the tile color.
- Browser acceptance checks image review, GPU replacement, reload, switching and
  reset. Comparing globe pixels avoids randomized background stars.
- Layered composition and the other four agreed areas remain outstanding.

### 2026-09-19 — World-local pack browser acceptance

- Artwork browser passed thumbnail review/cancel, unchanged preview state,
  authenticated activation, GPU pixel change, reload, delayed old-world image
  isolation, built-in reset and mobile review.
- Existing texture/reveal and historical-branch browser regressions passed.
- Inspected the image review. Final checks also release preview image memory on
  close and verify selecting a previously imported manifest through the model contract.
- Documentation includes a source manifest and `artwork:pack` helper. No user
  worlds have received artwork changes during development.

### 2026-09-19 — World-local pack deployment

- Final 83-test suite, typecheck/build and artwork browser acceptance passed.
  Texture and historical-branch browser regressions also passed.
- Deployed at `0.0.0.0:5180`; LAN checks preserved Aethra at day 792/revision 804
  with its existing built-in artwork. No user-world changes were applied.
- Publishing the agreed five-item checklist and first artwork milestone. Layering,
  portable bundles, entities, selective replay and final integration acceptance
  remain required; Phase 4 is not marked complete.

### 2026-09-19 — Phase 4 checklist and artwork publication

- Pushed `ef58bd7` to public `CyberSecDef/logos_engine` on `main`.
- All five agreed completion areas are documented with acceptance criteria.
- Reviewed, versioned world-local PNG replacements are live; all 83 tests and
  artwork/texture/historical-branch browser checks passed. User world preserved.
- Next: layered artwork within item 1, followed by complete portable bundles,
  minimal entities, selective replay and final integration/compatibility acceptance.

### 2026-09-19 — Layered artwork in progress

- Implementing two ordered, alpha-composited appearance layers above base terrain.
- Extending the bounded eight-slot atlas with optional settlement/condition images.
- Preserving legacy styles, birth/reveal behavior, data overlays and simulation.
- Next: contract/persistence tests, GPU acceptance, documentation and publication.

### 2026-09-19 — Layer contract and composition verification

- Added optional two-layer styles, automatic terrain base selection, and optional
  settlement/condition image slots within the existing eight-slot atlas.
- Model capabilities v10, review diffs and tile inspector expose layer order/opacity.
- All 85 engine/API tests and typecheck/build pass, including invalid-layer
  rejection, reveal/overlay behavior, unchanged physics, persistence and replay.
- GPU checks exercise actual composition/order, alpha, missing/zero layers,
  reload/switching, birth/colors/overlays and mobile. Test hashes use validated
  saved fixtures, since schema parsing canonicalizes property order.
- Existing painterly assets can be layered; no new production images were generated.

### 2026-09-19 — Layered artwork milestone complete

- All 86 engine/API tests, typecheck and production build passed.
- Layer GPU browser, artwork import/delayed-switch regression and prompt-driven
  appearance browser passed; inspected the composition screenshot.
- Layer styles survive saved state, checkpoints, portable state and replay; image
  copying for branches continues through the existing world artwork manifest.
- Deployed to 0.0.0.0:5180. Live world was day 792/revision 804 before restart;
  no active prompt and no user-world changes made by development tests.
- Completion item 1 (world-local artwork and composition) is complete.
- Next: item 2, complete portable bundles including image assets and replay journal.
  Entities, selective replay and final acceptance also remain required.

### 2026-09-19 — Layered artwork publication

- Published `e170b8f` to public `CyberSecDef/logos_engine` on `main`.
- Post-restart LAN verification preserved first-world at day 792/revision 804.
- Item 1 complete; next milestone is complete portable world bundles (item 2).

### 2026-09-19 — Portable bundles in progress

- Implementing version-2 exports with all committed replay records/snapshots and
  referenced artwork, including images used by historical states.
- Imports retain source history under its original identity and begin an independent
  active journal. Re-export carries retained source histories forward.
- Adding bounded size/replay validation, explicit legacy-state-only handling,
  source-history inspection and isolated-directory acceptance tests.

### 2026-09-19 — Portable validation and UI acceptance

- Version-2 bundle exporter gathers committed snapshots/records and current plus
  historical artwork; importer validates hashes, schemas, compatibility and replay.
- Source histories retain original identity in immutable files referenced by the
  new world's state envelope. Re-export and ordinary branches preserve them.
- Review displays verified image/record counts; Worlds can page through original
  source histories. Legacy v1 imports are explicitly marked state-only.
- Isolated import/re-export works after removing the original directory. Corrupt
  and incomplete bundles reject; handled publication failures remove new artifacts.
- Final tests now also cover custom properties/plugin memory and replay tampering.

### 2026-09-19 — Complete portable bundle acceptance

- All 90 engine/API tests and typecheck/build passed. Plugin fixture proposals
  use the same canonical schema order as accepted API proposals for journal hashes.
- Portable browser passed full download/review/cancel/import, GPU image equality,
  reload, original source-history inspection, re-export, mobile and zero model calls.
- Existing checkpoint/restore/branch/import browser regression passed.
- Inspected the source-history UI; documented bundle limits, original identity,
  legacy state-only imports, excluded checkpoint labels and crash recovery limits.
- Completion item 2 is complete. Next: minimal generic entities (item 3), followed
  by selective replay and final integration/compatibility acceptance.

### 2026-09-19 — Portable bundle deployment

- Deployed on 0.0.0.0:5180 after confirming no active model request.
- Preserved the player's latest world at day 792/revision 805.
- Read-only LAN export produced a valid v2 bundle; replay validation checked its
  two recorded saves without modifying or importing the player's world.
- Publishing the completed second item. Generic entities are next.

### 2026-09-19 — Portable bundle publication

- Published `82fc9c3` to public `CyberSecDef/logos_engine` on `main`.
- All 90 tests and portable/checkpoint browser acceptance passed; LAN export
  verified and the player's latest day 792/revision 805 preserved.
- Phase 4 items 1–2 complete; generic entities, selective replay and final
  integration/compatibility acceptance remain.

### 2026-09-19 — Generic entities in progress

- Added optional world entity types/instances, bounded numeric properties,
  stable-ID lifecycle operations, movement and explicit preserve/clamp migrations.
- Integrating indexed entity count/sum reads into rules, appearance and plugins;
  rule/plugin add/set outputs target matching instances on each tile.
- Added prompt scope enforcement, entity inspection and bounded Apply/day+5 diffs.
- Next: cistern example, deterministic/migration/persistence/browser acceptance.

### 2026-09-19 — Entity integration verification

- 97 engine/API tests passed, including entity lifecycle, scope/migration rejection,
  default preservation, shared-snapshot updates, appearance and plugin integration.
- Entity browser passed prompted creation, readable Apply/day+5 preview, daily
  rain collection/tile supply, reload, reviewed capacity clamp and mobile inspection.
- Native logged-in Claude Code generated a valid type/create/rule proposal for an
  isolated in-memory world; one deterministic day produced the requested value.
- Added documented rain-cistern example. Its rain units are an abstract index,
  explicitly separate from conserved physical runoff or entity stock transfers.
- Final checks include entity counts in world-copy/import summaries.

### 2026-09-19 — Generic entity acceptance

- Final 97-test suite and production build passed.
- Entity browser and complete portable-bundle browser regression passed; inspected
  readable before/Apply/day+5 entity preview and desktop/mobile presentation.
- Native Claude Code acceptance passed without touching the player's world.
- Completion item 3 (minimal generic entities) is complete. Selective replay and
  final integration/compatibility acceptance remain before Phase 4 can close.

### 2026-09-19 — Entity milestone deployment

- Deployed to 0.0.0.0:5180 after confirming all player prompts were complete.
- LAN validation preserved first-world at day 792/revision 805, with no entities
  added to the player's world by tests or deployment.
- Publishing the entity interface, cistern example and acceptance evidence.
- Next: omit/replace an intervention and replay later inputs into a reviewed
  independent branch, with explicit dependency failures and bounded work.

### 2026-09-19 — Generic entity publication

- Published `d4420a4` to public `CyberSecDef/logos_engine` on `main`.
- All 97 tests, entity/portable browser checks and native Claude Code entity
  generation passed. LAN deployment preserved day 792/revision 805.
- Phase 4 items 1–3 complete. Selective replay and final integration/compatibility
  acceptance remain; Phase 4 is not yet closed.

### 2026-09-19 — Selective replay in progress

- Implementing omit/replace for one committed intervention, with deterministic
  replay of subsequent steps/proposals and explicit revision rebasing.
- Invalid later dependencies stop with the recorded day/action and reason.
  Restore/replacement snapshots after the edit are explicit blocking boundaries.
- Successful candidates will be reviewed, then published as independent worlds
  with their replayed input journal. Source worlds remain unchanged.

### 2026-09-19 — Selective replay verification

- Omit/replace replays original transitions for integrity and a separate candidate
  for consequences, with explicit revision rebasing and fixed work limits.
- Later dependency/plugin failures report their recorded action/day; snapshots
  after the target block replay rather than overwriting the experiment.
- Browser acceptance passed omission/cancel, replacement editing/review, independent
  branch/reload, verified journal, visible dependency failure and mobile layout.
- Added staged-publication cleanup and replay-time plugin-failure tests.
- Documented source boundaries, work accounting, branch journal retention and recovery.

### 2026-09-19 — Selective replay acceptance

- All 103 engine/API tests and typecheck/build passed.
- Selective browser acceptance and existing historical-branch browser regression
  passed; inspected the original/replacement and outcome review.
- Branch construction is staged, hash-checked and published with state last;
  source-state and artwork limits are checked before publication.
- Completion item 4 is complete. Only final integration/compatibility acceptance
  remains before Phase 4 closes, including automatic local Cursor CLI support.

### 2026-09-19 — Selective replay deployment

- Deployed to 0.0.0.0:5180 after confirming no active player prompt.
- Captured the latest save at shutdown and verified its exact hash after restart:
  first-world remains at day 826/revision 840.
- LAN read-only intervention endpoint returned successfully; no alternate worlds
  or experimental changes were created in the player's world directory.
- Publishing Phase 4 item 4. Final provider integration, compatibility and recovery
  acceptance remains, including automatic Cursor CLI support.

### 2026-09-19 — Selective replay publication

- Published `f028a35` to public `CyberSecDef/logos_engine` on `main`.
- 103 tests, selective replay and historical-branch browser checks passed.
- Exact live-world hash preserved across deployment at day 826/revision 840.
- Phase 4 items 1–4 complete; final integration/compatibility acceptance is next.

### 2026-09-19 — Final Phase 4 acceptance in progress

- Checking automatic Cursor CLI integration against its installed interface and
  isolation controls; downloaded official CLI into ignored local storage.
- Cursor authentication is pending the player's preferred login method. Native
  Claude remains the configured provider; direct API credentials are not configured.
- Auditing shared provider validation, save compatibility and recovery evidence;
  Phase 4 stays open until final acceptance is documented.

### 2026-09-19 — Provider integration checks

- Added automatic Cursor CLI selection, native browser credential refresh, pinned
  CLI version checking, empty tool allowlist and disposable bubblewrap workspace.
- Cursor browser login succeeded. First live request exposed an account-gated
  context flag; removed it and retained empty workspace/settings plus tool denial.
- 109 tests passed before that flag adjustment, including shared provider-envelope
  conformance, mocked API transport, private diagnostic handling, process limits,
  cancellation and actual filesystem isolation. Live provider retest is running.
- Correcting stale README/interface statements about completed Phase 4 features.

### 2026-09-19 — Codex scope addition

- Player requested Codex support for OpenAI models; adding a local Codex provider
  with existing ChatGPT login or CODEX_API_KEY, configurable model, isolated
  scratch workspace and the same reviewed world-change contract.
- Cursor's isolated full-context request succeeded. Adapter acceptance encountered
  a transient upstream provider error; checking an explicitly available model.
- Codex is installed and authenticated. Verifying its restricted configuration and
  structured response transport before exposing it as a supported provider.

### 2026-09-19 — Codex acceptance and browser regression

- Native Codex passed live Discuss and Propose through disposable saved worlds;
  no saved state changed until explicit in-memory Apply. Existing ChatGPT login
  works; only its original auth file is mounted, with no copied refresh tokens.
- Added shared bounded CLI runner and Codex JSONL decoding; the strict transport
  envelope preserves the existing world-change validator for all operations.
- Full typecheck/build and 111 tests passed. Running all browser acceptance paths.
- Cursor returned a valid rainfall proposal; adding support for a single enclosing
  JSON code fence while rejecting explanatory prose and malformed JSON.
- Direct Anthropic requests remain mocked because no paid API credentials are set.

### 2026-09-19 — Phase 4 final acceptance and deployment

- All five agreed items are complete, plus requested local Codex/OpenAI support.
- Final typecheck/build and 113 tests passed with zero skips; all 15 browser/cache
  regression scripts passed against temporary worlds.
- Live Discuss/Propose passed for Claude, Cursor (composer-2.5) and Codex. Codex's
  actual inner sandbox also blocked dummy credential reads and workspace writes.
- Published the acceptance matrix with compatibility/recovery evidence and the
  explicit mocked-only direct API limit. Reconciled current README/PLAN/log state.
- Deployed on 0.0.0.0:5180. No player prompt was active. Exact saved world hash
  survived shutdown/restart: first-world day 826, revision 840. Claude stays default.
- Next: publish this milestone, then Phase 5 planning; no broader simulation
  mechanics were introduced during final acceptance.

### 2026-09-19 — Phase 4 publication

- Published `59842f0` to public `CyberSecDef/logos_engine` on `main`.
- 113 tests, 15 browser/cache regressions and live Claude/Cursor/Codex acceptance
  passed. LAN deployment preserved the exact day-826/revision-840 world hash.
- All five agreed Phase 4 completion items are closed. Phase 5 planning is next.

### 2026-09-20 — Phase 5 started

- Documented milestones 5a–5i, dependencies, acceptance criteria and compatibility
  requirements in docs/phase-5-plan.md. Asked about initial settlement placement
  and food-driven population change before implementing 5b.
- Starting a reusable actual-water-transfer report and read-only next-day budget
  inspector. This establishes contamination transport inputs without changing
  current physics, saved world schemas, replay history or model authority.
- Captured two pre-refactor 100-day state hashes as compatibility fixtures.

### 2026-09-20 — Water transport verification

- Extracted hydrology without changing arithmetic, event ordering or saved state.
  Ordinary ticks allocate no report; diagnostic ticks expose actual edge volumes,
  sediment, mixing snapshots and per-zone source/sink budgets.
- Added authenticated revision/world-checked preview and inspector explanation.
  It pauses play, never persists data, and discards stale selection responses.
- All 118 tests passed, including two original 100-day hashes, 40-day zone balances,
  one-hop timing, ocean sediment retention, plugin failure and read-only API checks.
- Player confirmed creator placement and food-driven population change for 5b.
  Documented these decisions plus the calculation/API in docs/water-transport.md.
- Browser acceptance, documentation review and deployment remain in progress.

### 2026-09-20 — Phase 5a acceptance and deployment

- Browser acceptance passed preview/pause, exact next-day correspondence, route
  labels, stale-selection rejection, close/reload and desktop/mobile layout.
  Inspected both screenshots; prompt and selective-replay regressions also passed.
- Deployed on 0.0.0.0:5180 after checking no player prompt was active.
- Verified exact saved hash at shutdown/restart and after a LAN water preview:
  first-world remains day 826/revision 840. Preview did not mutate the world.
- Publishing Phase 5a and the complete milestone plan. Phase 5b food/population
  is next, using the player's confirmed placement and demographic decisions.

### 2026-09-20 — Phase 5a publication

- Published `71464e9` to public `CyberSecDef/logos_engine` on `main`.
- 118 tests and water/prompt/selective browser acceptance passed; exact live-world
  state preserved. Phase 5a is complete, and Phase 5b food/population is next.

### 2026-09-20 — Phase 5b started

- Implementing explicit creator-placed settlements using the existing inhabitant
  count plus optional versioned food/settlement state; legacy worlds stay inactive.
- Drafted exact daily production, consumption, shortage/growth rules and acceptance
  tasks in docs/settlements.md. Asking whether balance is configurable per settlement.
- Planned integration: validated prompt operations, direct placement/food aid,
  before/Apply/day+5 review, inspector/overlays and replay/recovery coverage.

### 2026-09-20 — Phase 5b implementation and initial acceptance

- Added versioned optional settlement state, five validated creator operations,
  deterministic food/population accounting and detailed daily ledgers.
- Added direct placement/food aid, provider context and schemas, five-day previews,
  population/food overlays and readable inspection. Custom programs can read food
  and demographic counters after the settlement phase.
- Per-settlement settings are the stated implementation default; the optional
  question has not received an answer. Previously confirmed decisions are retained.
- All 125 tests pass, including seven settlement suites and unchanged legacy hashes.
  Settlement browser acceptance passes placement/cancel/Apply, food aid, loss/growth,
  prompt configuration, overlays, mobile layout, reload and replay.
- Remaining: recovery-view polish, documentation, real Claude acceptance, targeted
  browser regressions, deployment with exact save preservation, commit and push.

### 2026-09-20 — Phase 5b provider and regression acceptance

- Native Claude produced a validated single-operation settlement proposal in a
  disposable world. Forecast, copy Apply and the next daily ledger passed; the
  saved fixture stayed unchanged. Corrected the older unsupported-capabilities
  list to remove population dynamics now that settlements implement it.
- Prompt, water transport, portable, entity and selective-replay browser checks
  all pass. Inspected settlement desktop review and mobile screenshots.
- Selective recovery now explains changed settlement food, counters and settings.
- Documented exact settings/limits, operation examples, ordering, legacy behavior,
  preview limits and deferred transport/health systems in docs/settlements.md.
- Live world remains first-world, day 826/revision 840, with no running prompt.

### 2026-09-20 — Phase 5b final acceptance and deployment

- Final check: 125 passing tests, zero failures/skips; TypeScript and production
  build pass. The existing ~623 kB frontend bundle warning remains a scale/polish task.
- Settlement browser rerun passes. Five browser regressions (prompt, transport,
  portable, entity, selective) and native Claude settlement acceptance pass.
- Deployed on 0.0.0.0:5180, with Claude Code still the selected provider.
- Exact saved envelope and live-world hash are unchanged after restart:
  first-world, day 826/revision 840,
  `479a9f0f54d17be15070aef9eedb679f3c4652e47ea297dd35351b8bdb37f3ed`.
  No settlement was placed in the player's world during testing or deployment.
- Phase 5b is complete. Phase 5c trade/movement remains next; pollution, disease,
  technology and conflict remain planned in their documented later milestones.

### 2026-09-20 — Phase 5b publication

- Published `1ae5d36` to public `CyberSecDef/logos_engine` on `main`.
- Settlement/food/population milestone complete, with documented defaults, reviewed
  creator operations and exact live-state preservation. Next milestone: 5c.

### 2026-09-20 — Soil ecology follow-up started

- User requested fertility-limited farming, weather-driven fertility and ranged
  population impacts on soil and vegetation. Existing custom fertility is currently
  independent of harvest; connecting it through explicit world-level ecology.
- Default farmer benefit peaks at 1,000 people, fades by 5,000; urban losses ramp
  from 5,000 to 50,000. All rates and thresholds are reviewed world data settings.
- Preserve original world/save history until activation. Reuse existing fertility
  values and normalized field range; disable conflicting writers explicitly rather
  than counting their rainfall/heat rules twice. No autonomous model calls.
- Engine/contracts and direct activation review are implemented; tests, provider
  verification, docs and deployment remain in progress.

### 2026-09-20 — Soil ecology acceptance

- Added optional soil-ecology-v1 with index binding, adjustable population bands
  and rates, weather/stewardship/urban soil changes, urban vegetation loss and
  multiplicative fertility-limited harvest. Daily ledgers explain the components.
- Direct world activation preserves soil, proposes any missing definition and
  explicitly pauses whole conflicting writers. Native prompts use world scope;
  local fertility edits remain ordinary field-set operations.
- Initial full check passes all 132 tests with zero skips/failures. A journal fixture
  needed canonical proposal parsing; corrected it to match the real API boundary.
- Soil browser passes activation/cancel/Apply, writer pausing, city-to-farmer
  transition, exact harvest, overlay/reload/replay and mobile layout. Adjusted one
  browser assertion to the interface's established “paused” terminology.
- Settlement, custom-extension and water-transport browser regressions pass.
  Native Claude generated a valid two-operation soil activation proposal; preview,
  copy Apply and daily ledger passed without writing the saved test fixture.
- Inspected mobile soil ledger screenshot; documented all defaults and limits in
  docs/soil-ecology.md. Final regression check and deployment/publication remain.

### 2026-09-20 — Soil ecology final validation and deployment

- Final full check: 132 passing tests, zero failures/skips; types/build pass.
  Added explicit plugin-writer conflict and bound-field removal checks.
- Soil, settlement, extension and transport browser checks pass. Native Claude
  world-scope proposal validated. Mobile ledger visuals inspected.
- Deployed to 0.0.0.0:5180 with Claude Code still selected. Verified the exact
  saved envelope and world hash after restart: day 1011/revision 1027,
  `d6cf34843d51fcced54d55b881e2810efb9ae74c8fdb9d38cb0c3d1b2f1c9cfc`.
- Existing two settlements and all player data remain unchanged. Ecology is
  available through Settlement and food → Review soil ecology activation; the
  existing world remains inactive until reviewed Apply. No automatic migration.
- Documentation covers settings, thresholds, normalized fertility, writer pausing,
  rounding, ordering and compatibility. Publishing the completed follow-up.

### 2026-09-20 — Soil ecology publication

- Published `226584b` to public `CyberSecDef/logos_engine` on `main`.
- Verified deployment and exact player save preservation. Soil activation remains
  an explicit reviewed world change; Phase 5c trade/movement remains next.

### 2026-09-20 — Phase 5c started

- Split 5c into 5c1 adjacent food sharing; 5c2 resource routes and travel permissions;
  5c3 timed journeys and migration. Do not mark the whole milestone complete after 5c1.
- Asked whether food should share automatically on activation or use creator routes.
  Common implementation uses start-of-day food, protected current meal plus reserves,
  bounded donor/recipient/edge capacity, stable priority and no same-day forwarding.
- World activation is versioned and reviewed. Food trade permissions are independent
  of communication and do not claim to restrict future people/travel channels.

### 2026-09-20 — Phase 5c decisions confirmed

- Player confirmed automatic neighboring-settlement food sharing after world activation.
- Player also confirmed per-settlement balance settings adjustable through reviewed
  prompts, resolving the earlier optional 5b preference question.
- Engine, validated operations, provider schema/context, activation/permission controls,
  route preview and per-zone transfer inspection are implemented. Acceptance ongoing.

### 2026-09-20 — Phase 5c1 initial acceptance

- All 139 tests pass after correcting a narrow literal type in a test helper.
  Covers exact balances, limits, permission/communication independence, no forwarding,
  same-day meals / next-day harvest exports, checkpoints, portable replay and scope.
- Daily inspector shows actual routes; preview shows bounded next-day routes and
  before/after sharing totals alongside the existing five-day settlement forecast.
- Provider context advertises the model and limits route context to the selected
  neighborhood. Final checks also cover competing donors and ledger capacity bounds.
- Browser/native provider checks, final documentation and publication in progress.

### 2026-09-20 — Phase 5c1 browser and final test acceptance

- Final full check: 139 tests pass with zero failures/skips; TypeScript/build pass.
- Food-sharing browser passed next-day route preview, activation/cancel/Apply,
  same-day feeding, prompted closure, direct reopening, conserved ledgers,
  reload/replay and desktop/mobile layout. Mobile screenshot inspected.
- Settlement, ecology and prompt browser regressions all passed.
- Documented exact timing, formulas, limits, fixed-priority fairness limitations,
  scope, permission independence and recovery in docs/food-sharing.md.
- Native Claude acceptance and save-preserving deployment/publication remain.

### 2026-09-20 — Phase 5c1 deployment

- Native Claude world-scope activation proposal passed schema, forecast and copy
  Apply, with exactly 400 rations conserved between two fixture settlements.
  Saved fixture unchanged; no testing interventions touched the player world.
- Deployed to 0.0.0.0:5180 with Claude Code selected. Exact saved envelope and active
  state survived restart: first-world day 1152/revision 1170,
  `5ac18c31f7eb4d96d7a64f29a17b114b73b848de9384e6b5116b13c197d8a057`.
- Existing food sharing remains inactive pending reviewed activation. Two existing
  player settlements and all soil/world data are preserved.
- Phase 5c1 is complete; later resource routing and population movement remain
  open. Publishing code, tests, updated plan and docs/food-sharing.md.

### 2026-09-20 — Phase 5c1 publication

- Published `2c141ee` to public `CyberSecDef/logos_engine` on `main`.
- Adjacent food sharing is complete. Phase 5c2 resource routes/travel permissions
  and Phase 5c3 journeys/migration remain planned and are not claimed implemented.

### 2026-09-20 — Phase 5c2 started

- Implementing directed adjacent stock routes with limits/reserves/targets/schedules.
- Shared resolver prevents overspending and same-day forwarding across old rules
  and new routes; existing rules retain priority and previous behavior.
- Separate travel permission gates new resource routes. Food-sharing permission,
  communication and existing generic custom transfers retain their own semantics.
- Optional question asks land-only first versus adjacent sea support. Common route
  accounting implemented while awaiting feedback; first model planned land-only.
- World data, version/dependency validation, unit-conversion checks and engine
  integration underway; provider/UI, tests, documentation and publication remain.

### 2026-09-20 — Phase 5c2 initial acceptance

- All 146 tests pass, zero failures/skips. Legacy resource behavior is preserved;
  new tests cover limits, stock/rule/route competition, no same-phase forwarding,
  cadence, terrain, permissions, fractions, versions, conversions, scope and replay.
- Implemented direct route creation, travel closure/reopening, readable inspection,
  first-day route preview and LLM operations for editing/pausing/removing routes.
- Route browser passed create/cancel/Apply, exact deliveries, closed/open travel,
  prompted pause, mobile, reload/replay and no autonomous calls.
- Land-only remains the stated implementation default pending optional feedback.
- Documentation added in docs/resource-routes.md; native provider and regression
  browser checks plus deployment/publication are in progress.

### 2026-09-20 — Phase 5c2 deployment and final acceptance

- Final full check: 146 passing tests, zero failures/skips; types/build pass.
- Route, resource-sharing, food-sharing and extension browsers pass. Inspected
  mobile route status/ledger. Real Claude route proposal passed scope/schema,
  forecast, copy Apply and exactly 20 motes conserved; saved fixture unchanged.
- Deployed on 0.0.0.0:5180 with Claude Code selected. Exact saved envelope and world
  survived restart: first-world day 1170/revision 1189,
  `e28b0dda8702d12de755a9f93126d958b0e528a052d31347a741b59d4a586a13`.
- No routes or other interventions were added to the player's world. New controls
  are available under Resource routes and travel. All changes require reviewed Apply.
- Phase 5c2 complete; timed journeys/migration remain 5c3. Publishing documentation,
  contract, implementation and tests. Land-only remains the implementation default.
