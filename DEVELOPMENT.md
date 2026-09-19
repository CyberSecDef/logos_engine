# Development log

Updated: 2026-09-19. This file records actual implementation progress; proposed
features live in [PLAN.md](PLAN.md). Update this log at task transitions and
before each milestone commit. Never mark unverified functionality complete.

## Current work

Temperature interventions are complete, published, and live on the LAN server.
The Phase 4b resource-transfer milestone is complete and running locally:
conserved custom resources, daily accounting, formula clamps, and neighbor extrema.
Phase 4e is complete and live: immutable checkpoints, 100-day automatic
checkpoints (ten retained), reviewed restore with backup, independent branches,
portable world import/export, and persistent world selection. Published as
`b4b38e0`. Phase 4c restricted plugins are implemented and live: deterministic
instruction budgets, saved per-tile state, reviewed installation/update, and
failure recovery. Verified, deployed, and published as `b10dbed`. General entity
migrations, artwork, and a complete replay journal remain pending.

## Completed

- Phase 1: deterministic engine, validated edits, persistence, CLI, five tests.
- Phase 2: playable local globe, inspection, overlays, world picker, time controls,
  preview/apply, appearance foundation, and two additional integration tests.
- Phase 3: validated prompt workflow, native-login Claude adapter, optional API
  adapter, manual agent exchange, saved conversations, and 18 passing tests.
- Public GitHub repository created; Phases 1 and 2 pushed.

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
| 4. World extensibility | In progress | Definition migrations; full rule expression language; sandbox feasibility and plugin execution; artwork packs; branches/import/export. |
| 5. Broader simulation | Pending | Rich hydrology/erosion; trade/food/population; knowledge, technology, conflict, migration; wind/air pollution, water contamination, generic disease and travel-linked spread; long-run tuning. |
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

## Phase 4 remaining work

- 4a: numeric definitions, conditional rules, explicit field migrations, generic
  inspector/overlays, model authority — complete.
- 4b: conserved custom-resource transfers, daily accounting, bounded formula
  clamps and neighbor extrema — complete. General definition/entity migrations
  remain pending. Immutable checkpoint snapshots/definitions are implemented;
  a complete append-only history remains pending.
- 4c: restricted JSON plugin runtime, deterministic budgets, saved state, staged
  proposals, immutable artifacts, execution and failure recovery — implemented;
  complete, verified, live, and published. JavaScript/native plugins are not enabled.
- 4d: forest/city artwork packs and actual texture rendering.
- 4e: world checkpoints, branches, restore, and portable state import/export —
  complete, live, and published. Plugin/texture bundles
  and selective event replay remain future work.
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
