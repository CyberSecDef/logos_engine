# Development log

Updated: 2026-09-20. This file records actual implementation progress; proposed
features live in [PLAN.md](PLAN.md). Update this log at task transitions and
before each milestone commit. Never mark unverified functionality complete.

## Current work

Phase 6 has started; see the [milestone plan](docs/phase-6-plan.md). Confirmed:
desktop first, mobile remains usable. 6a review accessibility is implemented and verified:
native modal dialogs, keyboard access, focus restoration, error feedback and
submission/cancellation behavior. LAN deployment preserved the complete live save.
6b1 direct zone/neighbor navigation and keyboard discovery is complete and
deployed with exact save preservation. 6b2 panel organization, mobile view switching and keyboard zoom are complete and
deployed. Next: 6c measured rendering and frontend delivery improvements. Phase 5 is complete and its acceptance evidence
remains in [the final matrix](docs/phase-5-acceptance.md).

## Completed

- Phase 1: deterministic engine, validated edits, persistence, CLI, five tests.
- Phase 2: playable local globe, inspection, overlays, world picker, time controls,
  preview/apply, appearance foundation, and two additional integration tests.
- Phase 3: validated prompt workflow, native-login Claude adapter, optional API
  adapter, manual agent exchange, saved conversations, and 18 passing tests.
- Phase 4: versioned definitions, conserved transfers, restricted plugins, artwork,
  entities, complete portable bundles, checkpoints, replay/branches, and automatic
  Claude/Cursor/Codex provider integration.
- Phase 5: deterministic environment, population, trade/movement, pollution,
  disease, technology, factions/conflict, and final integration/scale acceptance.
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
| 5. Broader simulation | Complete: 5a–5i implemented and verified | Rich hydrology/erosion; trade/food/population; knowledge, technology, conflict, migration; wind/air pollution, water contamination, generic disease and travel-linked spread; long-run tuning. |
| 6. Polish and scale | In progress: 6a–6b complete; 6c next | Accessibility, browser automation, performance at reference resolution, packaging and integration hardening. |

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

### 2026-09-20 — Phase 5c2 publication

- Published `d813993` to public `CyberSecDef/logos_engine` on `main`.
- Verified save-preserving deployment. Resource routes/travel gates are complete;
  Phase 5c3 timed journeys and population migration remain next.

### 2026-09-20 — Phase 5c3 started

- Building versioned journeys over saved adjacent land paths with days per leg,
  bounded active parties, real inhabitants/food/cargo and explicit conservation.
- Movement occurs before settlement meals. Travelers eat carried rations while
  moving/waiting; arrival-day meals are handled by the destination exactly once.
- Closed/submerged legs or destination capacity block progress without losing
  cargo. Provision, redirect and dock operations support reviewed recovery.
- Existing worlds remain unchanged without explicit departures. Tests/UI/provider
  integration, documentation, deployment and publication remain in progress.

### 2026-09-20 — Phase 5c3 initial acceptance

- Initial full check passes all 153 tests with zero failures/skips. Tests cover
  timed multi-leg arrival, single daily meals, shortages/extinction, closed/full/
  submerged/missing arrivals, provision/redirect/dock, cargo protection, scope,
  checkpoint/portable/replay and no load-time progression.
- Added transit-inclusive population, food and stock totals; previews distinguish
  settled inventories from carried stores. Existing daily stock ledger remains
  explicitly the zone-stock phase ledger.
- Direct migration controls use deterministic shortest open land paths; provider
  topology is limited to scope and encoded compactly. Recovery remains reviewed.
- Creator-directed departures remain the stated default pending optional feedback.
- Browser/native checks and final docs/deployment/publication remain in progress.

### 2026-09-20 — Phase 5c3 decisions confirmed

- Player confirmed creator-directed migration, with blocked arrivals waiting until
  resolved or redirected. Also confirmed the earlier land-neighbor route choice.
- Added competing-arrival priority and partial-progress redirection checks.
- Documentation covers saved paths, departure/arrival balances, transit provisions,
  shortage loss, zero-survivor cargo recovery and scope. Browser/native acceptance
  plus final deployment/publication remain in progress.

### 2026-09-20 — Phase 5c3 browser/provider acceptance and transaction audit

- Journey browser passes departure/cancel/Apply, carried meals, waiting, prompted
  provisions, reload/replay, reopening and arrival. Mobile screenshot inspected.
- Route, food-sharing, settlement and resource browser regressions all pass.
- Native Claude proposed a valid departure whose two-day arrival conserved 200
  inhabitants; scope/schema/preview passed and saved fixture remained unchanged.
- Transaction audit added rejection for converting cargo units after a departure
  earlier in the same proposal, and for reusing a journey ID within one proposal.
  These protect accounting and identity across combined creator operations.
- Final validation and save-preserving deployment/publication remain.

### 2026-09-20 — Phase 5c3 final deployment

- Final full check passes 154 tests, zero failures/skips; TypeScript/build pass.
  Journey, route, food-sharing, settlement and resource browsers pass. Native Claude
  departure/arrival acceptance and inspected mobile visuals pass.
- Deployed on 0.0.0.0:5180 with Claude Code selected. Exact saved envelope and active
  world preserved: first-world day 1170/revision 1190,
  `5f133309b693ad2e9afe8b16daeb24f94cd422fb8428ccbeca1ee5e6725cf929`.
- No journeys were started in the player's world during testing/deployment.
  Journeys and migration controls are available after refresh; all actions require review.
- Phase 5c3 and the documented first trade/movement scope are complete. Next: 5d
  airflow and air pollution. Automatic famine migration, sea travel and currency
  markets are intentionally not claimed implemented.

### 2026-09-20 — Phase 5c3 publication

- Published `f962383` to public `CyberSecDef/logos_engine` on `main`.
- Timed journeys complete the first Phase 5c trade/movement scope; save-preserving
  deployment verified. Next milestone is Phase 5d airflow and air pollution.

### 2026-09-20 — Phase 5c4 implemented, verification underway

- Added versioned neighbor-visit settings and advisor operation/scope enforcement.
- Automatic food collectors, farm workers and explorers use deterministic daily
  budgets and return home; all labor and food effects are accounted.
- Added inspector reports, activation/pause control, five-day preview and provider
  capabilities v17. New web-created worlds enable the model; old replay is opt-in.
- Documented defaults, aggregate desires, resident-based soil/meal rules and limits
  in docs/neighbor-visits.md. Unit/integration and browser verification underway.

### 2026-09-20 — Phase 5c4 verified and deployed

- Final `npm run check`: 161 passed, zero failures/skips; types/build pass.
  Initial restricted-sandbox run could not run listener-dependent tests; full
  verification passed with the required local execution permissions.
- Neighbor browser: preview/cancel/apply, automatic food collection and same-day
  return, closures, reload/replay, desktop/mobile and zero autonomous model calls.
  Existing migration browser also passes; mobile screenshot inspected.
- Native Claude configuration passed schema, world scope, forecast and automatic
  trip execution in an isolated fixture, leaving its saved state unchanged.
- Final source extraction keeps browser defaults free of runtime schema imports.
  The existing large-bundle advisory remains Phase 6 polish (640 kB bundle).
- Restarted on 0.0.0.0:5180. Verified world and envelope hashes unchanged on restart.
  Saved “Before automatic neighbor visits” checkpoint; previewed and applied the
  requested activation via the normal validated API at day 1180, revision
  1204 → 1205. Exact expected state hash matched, tile data unchanged, no ticks.
- Evidence: /tmp/logos-visits-check-final.log, /tmp/logos-visits-browser.log,
  /tmp/logos-visits-journeys-browser.log, /tmp/logos-visits-live.log and
  /tmp/logos-visits-deploy.json; screenshots under ignored .local/screenshots.
- Temporary visits and explicit travel closures use the stated recommended defaults;
  no reply to the optional questions was received. Permanent migration is separate.

- Published milestone `ce30c90` to the public repository on main; this entry records
  publication after the successful push.

### 2026-09-20 — Automatic relocation and air transport implemented

- Confirmed both late neighbor-travel answers: allow automatic permanent moves;
  respect existing travel closures. Food/crowding/better-reserve motives confirmed.
- Added versioned automatic migration, cooldowns, conservative inbound reservations,
  timed journeys and five-day departure reports. Residents and food debit once;
  home shortage counters persist and no per-trip approval/model call occurs.
- Air pollution tracks/spreads only (confirmed): seeded saved spherical winds,
  integer loads/emissions, one-hop transport/mixing, explicit removal/capacity budgets,
  local pulses/cleanup/sources/wind operations, and read-only next-day diagnostics.
- Added air/wind overlays, inspector controls and custom/plugin read primitives;
  updated provider capabilities to v18 with both model contracts.
- First full verification passed 171 tests and production build. Improving the
  cumulative migration preview; browser and native-provider acceptance next.

### 2026-09-20 — Browser acceptance passed; native provider limit identified

- Combined air/migration browser scenario passes cumulative departure forecasts,
  timed automatic arrivals, air activation/cancel/release/source/stop/calm controls,
  exact read-only next-day budget, overlays, desktop/mobile and replay with zero
  autonomous model calls. Desktop screenshot inspected.
- Added localized pollution comparisons to proposal previews and always show transit
  totals when an automatic migration policy is present.
- Native Claude combined acceptance did not return a proposal. Login status is
  active; a minimal isolated discussion succeeds. Private diagnostics identify an
  external provider refusal tagged biology for the fantasy-world context, not an
  expired login or an engine/schema error. No default-provider switch or filter
  workaround was made. Real-provider acceptance remains unverified for this change.
- Added competing-destination/manual-ID collision, full journey queue and 100-day
  air conservation/replay regressions. Final verification running before release.

### 2026-09-20 — Relocation and airflow released locally

- Final `npm run check`: 174 passed, zero failures/skips; typecheck/build pass.
  Three final browser scenarios pass: air/migration, neighbor visits and journeys.
  Covers 100-day pollution budgets/replay, wind reversal/calm/capacity, no damage,
  scopes, persistence, population/food accounting and migration competition/limits.
- Preserved the exact world and save-envelope hashes across restart. Server remains
  at 0.0.0.0:5180. Created “Before automatic permanent relocation” checkpoint and
  applied the requested migration activation through the validated API at day 1180,
  revision 1207 → 1208. Actual result exactly matched the expected proposal state;
  no day advanced, no tile values changed, no pollution introduced.
- Air controls expose reviewed activation, local load/source/wind edits, cleanup,
  next-day flow explanation and overlays. Creator damage preference is documented:
  air changes neither vegetation, farms, health, weather nor water contamination.
- External limitation: real Claude combined-operation check was refused by the
  provider's biology classifier. No credential reset, provider switch or safeguard
  workaround performed. Schema/scope/forecast tests and direct UI checks pass.
- Evidence: /tmp/logos-air-migration-final.log, /tmp/logos-air-migration-browser-final.log,
  /tmp/logos-air-neighbor-regression.log, /tmp/logos-air-journey-regression.log and
  /tmp/logos-air-migration-deploy.json. Failed provider logs are ignored/local only.
- Existing Vite large-bundle warning remains a Phase 6 optimization (648 kB).

- Published milestone `837b498` to the public repository on main. This follow-up
  records the successful push; real-provider acceptance remains explicitly unverified.

### 2026-09-20 — Water quality transport implemented; farming preference integrated

- Added optional versioned water model with integer dissolved/surface pools, actual
  runoff ratios using exact integer arithmetic, drying/wetting, settling, decay,
  capacity rejections and explicit ocean export/treatment accounting.
- Added settlement waste and installed sanitation capacity/condition. Short-food
  days impair next-day treatment independently of demographic counter resets.
- Initial transport verification passed 181 tests, typecheck and build.
- Player confirmed farm-output damage now, illness later; added a water multiplier
  after existing weather/soil factors, ledger/inspector feedback, and zero-quality
  farm-visit exclusion. Added combined fertility/weather/water regression coverage.
- World activation remains reviewed; explicit waste, pollution and farming effects
  are disclosed. Added scope/preview/diagnostics/overlays and provider contract v19.
- Documented full model in docs/water-quality.md. Browser/acceptance checks next.

### 2026-09-20 — Phase 5e browser and native-provider checks passed

- Full check after farming integration: 182 tests pass, typecheck/build pass.
- Browser verified activation/waste disclosure/cancel/apply, release, read-only
  next-day budget, runoff, farm multiplier, waste/shortage condition, recurring
  source/stop, sanitation repair/treatment, cleanup, overlays, replay and mobile.
  No autonomous model calls; mobile screenshot inspected.
- Native Claude water-source request passed schema/scope, exact 50-unit/day source
  and read-only forecast in an isolated world. Its saved fixture was unchanged.
  This new operation is verified; the prior combined air/migration refusal remains
  historical evidence rather than a current blocker for water-source acceptance.
- Added migration/plant-condition and zero-quality visiting-worker regressions;
  renamed the daily capacity field to effectiveTreatmentCapacity to distinguish
  available treatment from the amount actually removed. Final regression run next.

### 2026-09-20 — Phase 5e verified and deployed

- Final `npm run check`: 183 passed, zero failures/skips; typecheck/build pass.
  Final browsers pass water quality, ecology/farming, and air/migration scenarios.
  Native Claude source acceptance also passes; no autonomous model calls occur.
- Verified large-volume runoff ratios, evaporation/deposit preservation, clean-water
  dilution, explicit ocean export, capacity rejection, dry wetting, settling/decay,
  treatment/waste budgets, 100-day replay, exports/checkpoints, atomic edits/scopes,
  combined weather/soil/water harvest and sanitation persistence through migration.
- Restarted on 0.0.0.0:5180 and verified LAN controls plus exact world/envelope hashes.
  Preserved first-world at day 1180, revision 1208. No time advanced or saved-world
  edits occurred. Water quality awaits explicit reviewed activation as requested.
- Evidence: /tmp/logos-water-quality-release.log, /tmp/logos-water-quality-browser-final.log,
  /tmp/logos-water-ecology-regression.log, /tmp/logos-water-air-regression.log,
  /tmp/logos-water-quality-live.log and /tmp/logos-water-quality-deploy.json.
  Screenshots are ignored under .local/screenshots. No saves/credentials committed.
- Documented scope, equations, defaults and limitations in docs/water-quality.md;
  updated README, PLAN, interface, water transport, settlements and Phase 5 roadmap.
- Existing Vite large-bundle advisory remains Phase 6 optimization (658 kB).

- Published Phase 5e milestone `19e084b` to the public repository on main; this
  follow-up records the successful push.

### 2026-09-20 — Phase 5f1 health accounting, recovery and water exposure

- Added optional versioned health activation; existing residents/travelers begin
  susceptible. Creator introduction/treatment, recovery, temporary immunity and
  separately enabled polluted-water exposure operate without model calls.
- Ill residents and visiting workers cannot farm; no direct disease deaths.
  Existing starvation remains. Exact proportional compartment movement covers
  departures, arrivals, docking, automatic migration, demographic edits and losses.
  Temporary visits sample a shared origin pool; births/additions are susceptible.
- Progress occurs before arrivals so travelers recover once per day, even blocked.
  Pausing preserves demographic accounting while stopping progression/work loss.
- Added Health and recovery inspector, illness overlay, traveler health summaries,
  baseline forecasts, validated prompt operations and provider capabilities v20.
- Verified `npm run check`: **191 tests passed**, typecheck/build passed. Health,
  water-quality and journey browser workflows passed; desktop/mobile screenshots
  inspected. Health tests cover rounding/conservation, scope, water cases, labor,
  migration, starvation, births, activation in transit, replay/checkpoint/portable
  saves and no preview mutation. Browser ticks made zero autonomous model calls.
- Real native Claude generated exactly the requested 10-case introduction in an
  isolated world; schema/scope and read-only forecast passed, fixture unchanged.
- Documented [health model](docs/disease.md), defaults, phase order, limitations,
  activation and follow-up in the Phase 5 plan and related world/environment docs.
- Deployed at `0.0.0.0:5180`; LAN health controls verified. Preserved first-world
  day **1206**, revision **1235**, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and full save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Health remains inactive pending reviewed player activation. Evidence:
  `/tmp/logos-health-deploy.json`; no user-world changes or test ticks.
- Next **5f2**: local/travel-contact transmission with deterministic snapshots,
  attribution and no population duplication. Full Phase 5f is not yet complete.
- Existing ~661 kB web bundle warning remains a Phase 6 performance task.

### 2026-09-20 — Phase 5f1 publication

- Published milestone `10a0316` to public `CyberSecDef/logos_engine` main.
- Next work remains 5f2 contact transmission; health accounting and environmental
  introduction are complete, with explicit activation required in existing worlds.

### 2026-09-20 — Phase 5f2 local and travel contact transmission

- Added separately reviewed `daily-contact-v1` with `disease-contact-configure`,
  shared health version checks, world-only prompt scope and bounded rate0–1000.
  Existing health worlds/replays retain their behavior until explicit activation.
- After arrivals/visit assignment and before farming, partition everyone into
  home groups, destination visits or remaining transit parties. Use frozen presence
  and exact integer case counts; no same-day cascading or population creation.
  Returning visitors credit cases to their home; blocked parties mix internally;
  passing through a zone does not expose its residents. Closures block real trips.
- New cases lose farm labor today, recover on later days, and survive all existing
  migration/starvation accounting. No direct disease deaths or air damage added.
- Added home/exposure-zone and transit case attribution, daily totals, inspector
  controls, preview summaries and native provider capabilities v21. Health pause
  pauses contacts; contact-only pause preserves water/recovery effects.
- Updated health/interface/environment docs and Phase 5 plan with precise snapshot,
  immunity/water timing, rounding, report scope and compatibility semantics.
- Final `npm run check`: **198 tests passed**, typecheck/build passed. New tests
  cover opt-in compatibility, version/scope rejection, closed travel, visitor
  return, frozen no-cascade snapshots, immunity, arrival/blocked transit, small
  fractions, large populations, same-day starvation, 100-day deterministic
  conservation and replay/checkpoints/portable saves.
- Contact, health and neighbor-visit browser workflows passed, including cancel,
  Apply, attribution, forecasts, reload/replay and desktop/mobile with zero
  autonomous model calls. Inspected contact screenshots in `.local/screenshots/`.
- Real authenticated native Claude produced the requested world contact setting
  at rate200; exact operation/schema/scope and read-only forecast passed in a
  temporary world. No user data changed during provider acceptance.
- Deployed and verified `http://192.168.0.10:5180` (`0.0.0.0:5180`), preserving
  first-world day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Health/contact remain inactive pending reviewed activation. Evidence:
  `/tmp/logos-contact-deploy.json`. Existing ~663 kB bundle warning remains Phase 6.
- Phase 5f complete. Next: 5g knowledge/technology, then 5h conflict and 5i integrated
  long-run tuning; broader Phase 5 is not complete yet.

### 2026-09-20 — Phase 5f2 publication

- Published milestone `70f5e14` to public `CyberSecDef/logos_engine` main.
- Phase 5f is complete; next development milestone is 5g knowledge and technology.

### 2026-09-20 — Phase 5g started

- Documented three substeps: local research, knowledge exchange, broader unlocks.
- Reviewed settlement labor/food ledgers, visits, health and sanitation hooks.
  Research must reserve healthy resident workers once; completed effects must
  derive effective capacities rather than mutate base settings every tick.
- Asked the player about project assignment and cultivation versus treatment.

### 2026-09-20 — Phase 5g1 automatic local research and cultivation

- Confirmed automatic project selection and improved cultivation with the player.
  Implemented optional `local-research-v1`, world-scoped immutable definitions,
  automatic assignment, manual overrides, local pause/resume and tile archives.
- Default research budget10% of residents, protected7 food days plus today's meals.
  One healthy resident staying home contributes one worker-day and cannot also
  farm. Food/terrain/health/visits bound work; progress caps at the exact requirement.
  Settlements retain a current project, then choose cheapest total work, tie ID.
- Cultivation costs200 worker-days for+20% farm capacity and worker productivity.
  Effects begin next day, stack additively at most+100%, retain existing weather/
  soil/water limits and absolute farm cap, and never rewrite/compound base settings.
- Inspector activation/example definition, progress/stall/completion reports,
  five-day baseline comparison and advisor capabilities v22 are available. No
  autonomous model calls. Existing worlds require reviewed activation/definitions.
- Documented contracts, fixed primitives, local archives after depopulation,
  scope/version rules and pause semantics in [technology](docs/technology.md).
  Knowledge exchange, prerequisites, definition migrations and broader unlocks
  are not claimed by this milestone; 5g2/5g3 remain.
- `npm run check`: **204 tests passed**, typecheck/build passed. Covers automatic
  ordering, labor, food, flood, illness/visits, pause/manual override, immutable IDs,
  invalid state, bonus timing/cap, unchanged base settings, scope, forecast purity,
  100-day deterministic replay, checkpoints and portable saves.
- Research browser passed activation/cancel, definition, automatic work, pause/
  resume, completion/next-day output, reload/replay and responsive layouts with
  zero model calls. Contact and neighbor-visit regressions also passed. Screenshots
  inspected in `.local/screenshots/technology-{desktop,mobile}.png`.
- Native authenticated Claude returned exactly the requested cultivation definition
  with200 worker-days in a temporary world; schema/scope/forecast passed and save
  stayed unchanged. User world never received acceptance changes.
- LAN deployment verified at `0.0.0.0:5180`, preserving first-world day1206,
  revision1235 and complete save envelope. World hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`;
  envelope `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Evidence `/tmp/logos-technology-deploy.json`; research inactive until review.
- Existing web bundle size warning remains a Phase 6 task. Next: 5g2 knowledge
  exchange over permitted communication channels; full Phase 5g remains open.

### 2026-09-20 — Phase 5g1 publication

- Published milestone `3c38f73` to public `CyberSecDef/logos_engine` main.
- Next: 5g2 knowledge exchange; local research is complete, wider Phase 5g remains open.

### 2026-09-20 — Phase 5g2 started

- Reviewed local research, archived knowledge and the existing communication flag.
- Proposed adjacent communicating settlements as the first knowledge channel,
  independent from physical travel. Freeze eligible prior-day knowledge so new
  discoveries cannot be retransmitted within the same tick.
- Asked the player whether sharing accelerates learning or grants an instant copy.

### 2026-09-20 — Phase 5g2 neighboring knowledge exchange

- Player confirmed research acceleration rather than instant copying. Added
  separately reviewed `neighbor-knowledge-v1`, world-only `knowledge-configure`,
  current technology version checks and preserved exchange settings on global pause.
- Default +100% progress per local researcher from one communicating adjacent
  populated land settlement with prior-day completed knowledge. Both communication
  gates apply; physical travel is separate. Stable lowest-ID source, no stacking,
  no same-day relay or free completion. Existing research stays unchanged without
  activation. Source archives are accessed without separate teacher labor costs.
- Learner health, food, visit and terrain restrictions still apply. Final-day
  labor is bounded to the remaining required work. Farm labor and meals charge
  real workers once; efficiency bonus is separately attributed in daily reports.
- Added exchange controls/status, source/work attribution in inspector/forecasts,
  communication explanations and provider capabilities v23. Updated research,
  interface, roadmap, README and phase documentation with exact semantics/limits.
- `npm run check`: **210 tests passed**, typecheck/build passed. Tests cover closed
  endpoints, travel independence, no two-hop relay, source eligibility, food/local/
  global/exchange pause, rounding, no-stacking/tie-breaks, version/scope, forecast
  purity, deterministic 50-day replay, checkpoints and portable archives.
- Knowledge and research browser workflows passed with zero autonomous model
  calls: activation/cancel, actual assistance, closure/reopening, completion and
  next-day effects, reload/replay, desktop/mobile. Inspected screenshots; corrected
  obsolete communication text found during visual review and reran knowledge UI.
- Native authenticated Claude produced exactly the requested exchange operation
  and +100% setting in an isolated world; schema/scope and read-only forecast
  passed with its saved fixture unchanged.
- Deployed at `0.0.0.0:5180` and verified LAN controls. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and full save envelope
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Sharing remains inactive pending reviewed activation. Evidence:
  `/tmp/logos-knowledge-deploy.json`. No user-world edits/test ticks performed.
- Existing ~728 kB bundle warning remains a Phase 6 performance task. Next:
  Phase 5g3 broader bounded unlocks and integrated acceptance; full 5g remains open.

### 2026-09-20 — Phase 5g2 publication

- Published milestone `4635aba` to public `CyberSecDef/logos_engine` main.
- Next: Phase 5g3 broader unlocks and integrated research/environment acceptance.

### 2026-09-20 — Phase 5g3 started

- Reviewed sanitation, research ordering, declarative reads and restricted plugins.
- Planned treatment efficiency, acyclic prerequisite definitions, knowledge reads
  and combined environment/health/movement/research acceptance.
- Asked about upgrading installed treatment versus automatic construction.

### 2026-09-20 — Phase 5g3 treatment technology and integrated acceptance

- Confirmed filtration improves installed treatment plants without constructing
  them. Added optional treatmentBonusPermille; example300 base worker-days/+50%.
  Independent additive treatment cap+100%, exact next-day effective-capacity
  arithmetic, absolute capacity1e9, existing condition/occupancy/water activation
  gates and unchanged base settings. Water budgets retain conservation.
- Added optional up-to-four prerequisite IDs, existing-definition checks, acyclic
  graph validation, local prior-day eligibility, locked automatic-project skipping,
  manual stall reasons and imported completion-history consistency checks.
- Added strict read-only technologyKnown/technologyProgress with technologyId,
  shared by world rules, appearance conditions and restricted plugins. Validated
  identifiers/irrelevant arguments; no new research/built-in write authority.
- Added filtration definition control, treatment effect/capacity inspection,
  reviewed effect descriptions, provider capabilities v24 and updated obsolete
  water/illness text. Updated interface, technology, water and phase documentation.
- `npm run check`: **215 tests passed**, typecheck/build passed. Tests cover
  next-day benefits, damaged/zero/empty treatment, independent caps, base-setting
  preservation, pause, prerequisites/cycles/forged history, actual rule/plugin
  reads and a deterministic **200-day combined scenario** with soil/weather,
  pollution/waste/treatment, health/contact, visits/migration/timed travel, food
  sharing, air, research and knowledge exchange. Population and pollution balance;
  replay, checkpoints and portable saves preserve the result.
- Filtration, knowledge-exchange and water-quality browser workflows passed with
  zero autonomous model calls; reviewed cancel/apply, next-day effects, no free
  plants, unchanged installed capacity, forecasts, reload/replay and responsive
  layouts. Inspected desktop/mobile filtration screenshots.
- Real native Claude proposed the exact filtration definition (work300, treatment
  bonus500) in a temporary world. Schema/scope/forecast passed and save unchanged.
- Deployed at `0.0.0.0:5180`, LAN filtration control verified. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  No user-world edits/ticks; technology remains inactive until reviewed activation.
  Evidence: `/tmp/logos-filtration-deploy.json`.
- Phase 5g complete. Worker-time is the research cost; construction/material
  recipes and definition migrations remain future extensions, not implied
  capabilities. Next5h factions/conflict; whole-world tuning remains5i. Existing
  large web-bundle warning remains Phase6 performance work.

### 2026-09-20 — Phase 5g3 publication

- Published milestone `10bb07d` to public `CyberSecDef/logos_engine` main.
- Phase 5g complete; next: 5h factions/conflict, then 5i final integration/tuning.

### 2026-09-20 — Phase 5h started

- Documented four substeps and reviewed population, travel, food and ownership hooks.
- Asked about creator versus automatic faction formation and conflict initiation.
- Begin with identities/territory; later policy must explicitly define borders,
  mobilization, supplies and conflict rather than infer effects from labels.

### 2026-09-20 — Phase 5h1 faction identity, territory and relationships

- Confirmed creator-established factions/territory and later automatic conflict
  under explicit world rules. Added optional `territory-v1`, stable IDs, editable
  names/colors, up to32 factions and symmetric neutral/allied/hostile records.
- Added reviewed world-scope registry edits with shared versions, local land
  claims/releases, persistent claims after depopulation/submergence, and removal
  safeguards requiring no remaining territory. Claims preserve all zone contents;
  relations do not close borders, change trade/knowledge or initiate combat yet.
- Added faction inspector/forms, territory/resident counts (travelers excluded),
  Territory overlay, forecast summaries and native provider capabilities v25.
  Populations have no personal faction allegiance; ownership is territorial.
- Fixed model-schema conversion for required nullable fields used by ownership
  release, with a regression test. Runtime schema still requires explicit ID/null.
- `npm run check`: **222 tests passed**, typecheck/build passed. Covers identity
  updates, overlay colors, claims/releases, sea/depopulation, relation symmetry,
  neutral reset, removal, limits, stale/dangling/duplicate/atomic rejection, prompt
  scopes, pure previews, checkpoint/portable replay and 50-day unchanged simulation.
- Faction, knowledge-exchange and journey browser workflows passed with zero
  autonomous model calls. Reviewed definition/cancel, claim/release, relationships,
  overlay, unchanged population, save/replay/reload and responsive layouts.
  Inspected screenshots; styled faction selectors/color picker and reran UI.
- Native authenticated Claude produced the requested faction ID/name/color in a
  temporary world; schema/scope and read-only forecast passed, save unchanged.
- Deployed `0.0.0.0:5180`; LAN faction controls verified. Preserved first-world
  day1206/revision1235 and world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`;
  full envelope `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  No factions or test ticks introduced into the user's world. Evidence:
  `/tmp/logos-factions-deploy.json`.
- Documented implementation/limits and four substeps in [factions](docs/factions.md).
  Phase 5h remains open: borders/mobilization, automatic conflict and integrated
  acceptance follow. Existing ~734 kB bundle warning remains Phase6 performance.

### 2026-09-20 — Phase 5h1 publication

- Published milestone `2005452` to public `CyberSecDef/logos_engine` main.
- Next: Phase 5h2 borders/mobilization, then automatic conflict under explicit rules.

### 2026-09-20 — Phase 5h2a border policies in progress

- Next delivery: explicit world border policy, shared edge checks for journeys,
  routine visits, migration, food sharing, named resource routes and knowledge.
  Phase 5h2b will implement mobilization separately; conflict remains 5h3.
- Reviewing channel semantics with the creator. Border rules must be optional,
  preserve old replay behavior, leave physical transport unchanged, and explain
  stranded journeys without duplicating or deleting people or provisions.
- Planned checks: independent channel switches, symmetric ownership/relations,
  pathfinding and closure during transit, pure previews, scope/version rejection,
  conservation, saved replay, browser review/apply and unchanged live-world deploy.


### 2026-09-20 — Phase 5h2a implementation and unit acceptance

- Creator confirmed independent hostile travel/trade/knowledge blocks; neutral,
  allied, same-owner and unclaimed edges stay open subject to local permissions.
- Added optional versioned `hostile-borders-v1`, reviewed world-scope configuration,
  inspector settings/edge diagnostics, forecast policy and provider capabilities26.
- Shared gates cover pathfinding, departures/hops, visits, migration, food sharing,
  named stock routes and knowledge assistance. Stock-cargo journeys require trade;
  personal provisions are exempt. Physical and generic custom flows ignore borders.
- In-flight closures preserve leg progress and inventory, report `border-closed`,
  and retain meals/starvation accounting. Local provisioning/docking and alternate
  routes remain available. Territory-based access has no personal citizenship.
- `npm run check`: **233 tests passed**, typecheck/build passed. Eleven new tests
  cover switches, local permissions, path alternatives, closure/reopening,
  conservation/recovery, food/visits/migration/routes/research, world scope,
  pure forecasts, versions, replay/checkpoint/export and unaffected physics.
- Browser and authenticated native Claude acceptance running. Production deployment
  and publication remain pending. Existing ~736 kB bundle warning remains Phase6.


### 2026-09-20 — Phase 5h2a acceptance and deployment

- Faction-border and existing faction browser workflows passed, including channel
  switches, review/cancel/apply, stranded party meals, reopening, replay/reload and
  desktop/mobile layouts. Inspected both new screenshots. The browser assertion
  was corrected to match human-readable “border closed” status; no runtime fix
  was necessary. Existing journey and knowledge browser suites also passed.
- Authenticated native Claude produced the requested travel/trade blockade while
  leaving knowledge open; schema/scope/forecast passed and temporary save remained
  unchanged. Browser workflows made zero autonomous model calls.
- Deployed on `0.0.0.0:5180`, verified new controls through LAN. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  No factions, border activation or test ticks added to the live world. Evidence:
  `/tmp/logos-borders-deploy.json`.
- Updated README, PLAN, Phase5 plan, world interface and detailed faction/channel
  documentation. Phase5h2a complete; mobilization (5h2b) is the next development task.


### 2026-09-20 — Phase 5h2a publication

- Published milestone `120f23a` to public `CyberSecDef/logos_engine` main.
- Next: 5h2b mobilization, then 5h3 automatic conflict under explicit rules.

### 2026-09-20 — Phase 5h2b mobilization started

- Designing local resident garrisons before moving armies/conflict. Asked creator
  whether service should reserve existing resident labor, with normal settlement
  meals and a food-reserve threshold. No new population or food is created.
- Reviewing interactions with illness/contact, visits, research, migration,
  creator departures and territory changes. Implementation/acceptance pending.


### 2026-09-20 — Phase 5h2b resident garrisons implemented

- Creator confirmed local resident garrisons before moving armies. Added optional
  per-tile versioned staffing/reserve settings, reviewed local operations, service
  inspector, forecast reports and native provider capabilities27.
- Service reserves existing resident slots after food sharing; visitors/migrants
  and creator departures cannot consume those slots. Healthy home workers staff
  them after contact and before research/farms. Neighbor workers can fill farm
  vacancies. Population/health/meals remain in existing ledgers with no duplication.
- Food threshold covers all resident meals plus configured reserve days; it is an
  eligibility threshold rather than an earmarked stockpile. Terrain/food pauses
  retain the target. Demobilization is required before owner changes or removal.
- `npm run check`: **242 tests passed**, typecheck/build passed. Nine new tests
  cover work/meal accounting, visits/migration, illness/contact, shortages/terrain,
  manual departures, safe ownership/removal, attrition, versions, scope/forecast,
  saved replay/checkpoint/export, and neighboring farm-worker substitution.
- Browser/native Claude acceptance running. Documentation updated in faction
  interface, Phase5 plan, README and PLAN. No combat or moving armies implemented.


### 2026-09-20 — Phase 5h2b acceptance and deployment

- Garrison browser acceptance passed reviewed/cancelled/applied staffing, labor and
  meal accounting, food pause, demobilization, save/replay/reload and responsive
  layouts; desktop/mobile screenshots inspected. Existing faction-border,
  neighbor-visit and contact-disease browser suites passed. No autonomous model calls.
- Native authenticated Claude produced the requested local 40-slot/7-reserve-day
  configuration. Schema/scope/read-only forecast passed; temporary save unchanged.
- Deployed `0.0.0.0:5180`; garrison controls verified through LAN. Preserved
  first-world day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  No garrisons, factions or test ticks introduced. Evidence:
  `/tmp/logos-garrisons-deploy.json`.
- Phase5h2b local mobilization complete. Next: 5h3 moving armies and automatic
  conflict under explicit rules, then 5h4 integrated acceptance and 5i tuning.
  Existing ~739 kB bundle warning remains Phase6 performance work.


### 2026-09-20 — Phase 5h2b publication

- Published milestone `cc7b237` to public `CyberSecDef/logos_engine` main.
- Next: moving armies and automatic conflict (5h3); local garrisons do not fight yet.

### 2026-09-20 — Phase 5h3 started: supplied troop movements

- Split 5h3 into 5h3a supplied troop movements and 5h3b automatic battles/capture.
  Asked creator about combatant losses versus retreats before implementing combat.
- Current work: depart healthy garrison members with actual provisions, retain
  faction identity in transit, use friendly land access, reinforce own settlements,
  and integrate existing meals/health/closures/replay. No battles in this delivery.
- Next: bounded automatic conflict under explicit rules, then 5h4 combined acceptance.


### 2026-09-20 — Phase 5h3a troop movement implemented

- Creator confirmed first battles use bounded combatant losses while preserving
  civilians and buildings; displacement/building damage remain later scope.
  Recorded for5h3b; combat is not implemented in this transport delivery.
- Added reviewed `army-depart` using the existing journey ledger. Healthy-only
  recruitment debits source people, food and garrison target; reserves planned-trip
  provisions and remaining residents’ home food threshold. Local garrison version
  increments, preventing accidental immediate replacement of departing troops.
- Army identity persists in saved `journey.military`; own/allied land access and
  own-faction arrival/dock prevent silent allegiance changes. Closures wait with
  normal meals/starvation; survivors reinforce destination service slots once.
  Health, total population, food and saved histories use existing ledgers.
- Added troop-movement controls/pathfinder, military inspector/report attribution,
  forecast integration, provider capabilities28, full path scope and faction/ID
  safeguards. Existing provision/redirect/dock operations enforce military access.
- `npm run check`: **251 tests passed**, typecheck/build passed. Nine new tests
  cover exact debits/arrivals, healthy partitions, provisioning, friendly access,
  changed ownership, recovery, capacity/starvation, identities, prompt scope,
  pure forecasts, checkpoint/export and deterministic replay.
- Browser and authenticated native Claude acceptance running. Detailed interfaces,
  supply limits and Phase5 substeps documented. Deployment/publication pending.


### 2026-09-20 — Phase 5h3a acceptance and deployment

- Troop browser acceptance passed review/cancel/apply, source debits, allegiance,
  meals, arrival/reinforcement and saved transit reload/replay. Desktop/mobile
  screenshots inspected. Existing garrison, civilian-journey and faction-border
  browser workflows passed; no autonomous model calls.
- Native authenticated Claude produced exact requested troops, provisions and path;
  schema/scope and read-only arrival forecast passed. Temporary save unchanged.
- Deployed `0.0.0.0:5180`; troop controls verified through LAN. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and full save envelope
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  No troop departures, factions or test ticks introduced. Evidence:
  `/tmp/logos-armies-deploy.json`.
- 5h3a supplied friendly troop movement complete. Next:5h3b automatic battles and
  capture with bounded combatant losses and civilian/building preservation, then
  5h4 integration and5i tuning. Existing ~741 kB bundle warning remains Phase6.


### 2026-09-20 — Phase 5h3a publication

- Published milestone `eb0dda6` to public `CyberSecDef/logos_engine` main.
- Next:5h3b automatic battles/capture. Supplied friendly movements do not fight yet.

### 2026-09-20 — Phase 5h3b automatic conflict started

- Implementing explicit optional conflict policy, supplied adjacent expeditions,
  disjoint fronts/cooldowns, bounded healthy-combatant losses and capture that
  preserves civilians, buildings, food and research. Survivors return home;
  surviving defenders demobilize on capture. No autonomous model calls.
- Confirmed prior decisions retained. Asked whether invasions ignore civilian
  travel closures; implementation/validation is in progress.


### 2026-09-20 — Phase 5h3b implementation and simulation acceptance

- Creator confirmed hostile adjacent attacks under explicit activation; civilian
  closures do not stop invasions. Implemented independent versioned conflict
  policy, supplied healthy expeditions, stable/disjoint fronts, minimum force,
  advantage checks, daily caps and cooldowns. Missing policy preserves old behavior.
- Battles use simultaneous bounded healthy-combatant losses; ties defend. Capture
  changes ownership and demobilizes defenders while preserving civilians, stores,
  infrastructure and research. Survivors return on a full leg with ordinary health,
  meals/starvation and recovery/capacity accounting. No autonomous model calls.
- Pause/peace/invalid target cancels pending assaults; following-tick recovery avoids
  duplicate meal charges. Returning parties retain identity and can wait for home
  ownership, land or capacity. Campaigns and civilian/friendly journeys have separate
  access rules; existing friendly movement keeps its previous permission gates.
- Added reviewed rule controls, daily reports/events, all-five-day battle forecasts
  with baseline population comparison, provider capabilities29 and world interface docs.
- `npm run check`: **263 tests passed**, typecheck/build passed. Twelve new tests
  cover activation, supplies, capture/repulse, simultaneous losses, civilian and
  infrastructure preservation, paused/active health, visitor/contact protection,
  cancellation/recovery, closures, stranded returns, disjoint fronts, cooldowns,
  versions/scope, pure preview and deterministic replay/checkpoint/export.
- Corrected one test expectation: food-starved defenders may legitimately attract
  a smaller hostile neighbor. This is expected policy behavior, not a runtime defect.
- Browser/native Claude acceptance running. Publication and live deploy pending.


### 2026-09-20 — Phase 5h3b provider correction and deployment

- Native Claude correctly declined to emit an operation missing from its response
  schema. Added conflict operations to the separate provider schema, then added a
  regression comparing every engine operation against the provider list exactly
  once. This closes the discovery gap for future operation additions.
- Final `npm run check`: **264 tests passed**, typecheck/build passed. Authenticated
  native Claude then produced the correct conflict activation/default settings;
  world scope and pure five-day forecast passed with the fixture save unchanged.
- Conflict browser acceptance passed activation/cancel, full forecast losses,
  automatic launch, pause/recovery, capture preserving civilians, return journeys,
  saved reload/replay and responsive layouts. Inspected desktop/mobile screenshots.
  Existing faction, friendly-army and disease-contact browser workflows passed;
  none of these simulation/browser workflows called a model autonomously.
- Deployed on `0.0.0.0:5180`, verified controls through LAN. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Conflict remains absent/inactive. No factions, expeditions or test ticks added.
  Evidence: `/tmp/logos-conflict-deploy.json`.
- Phase5h3b complete. Next:5h4 combined environment/population/conflict acceptance,
  then5i long-run balance/tuning. Naval warfare, sieges, displacement and building
  damage remain future scope. Existing bundle-size warning remains Phase6 work.


### 2026-09-20 — Phase 5h3b publication

- Published milestone `224aa00` to public `CyberSecDef/logos_engine` main.
- Next:5h4 integrated acceptance, then5i whole-world tuning. Live conflict remains
  inactive until the creator explicitly reviews and applies its activation.


### 2026-09-20 — Phase 5h4 integrated acceptance

- Added the combined acceptance matrix to `docs/factions.md` and updated the roadmap.
- Reproduced expedition/migration regression: all 140 remaining inhabitants could
  migrate, including 60 reserved guards. Preserve remaining reserved slots/workers
  after departure; only 80 civilians may now migrate. No schema/provider changes.
- Added 200-day combined systems replay and pollution/population/health budget
  checks, pure forecast, saved history, checkpoint and portable-export checks.
- Added terrain-stranded return, food exhaustion, recorded starvation, resupply and
  recovery coverage. Civilian travel closure continues to permit military returns.
- Validation passed: all 267 engine tests, typecheck and production build.
  Conflict, garrison and air/migration browser workflows passed, including
  reviewed changes, cancellation, recovery, replay, responsive layouts and zero
  autonomous model calls. No schema or provider adapter change required.
- LAN deployment verified at `0.0.0.0:5180`. Preserved first-world day1206 /
  revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Conflict remains absent/inactive; no test ticks or factions added to the live world.
  Deployment evidence: `/tmp/logos-conflict-integration-deploy.json`.
- Phase 5h4 is complete; Phase 5i whole-world balance/performance tuning follows.
  Forced displacement/building damage remain future scope. The existing large
  frontend bundle warning remains deferred to Phase 6.

### 2026-09-20 — Phase 5h4 publication

- Published milestone `a4a2008` to public `CyberSecDef/logos_engine` main.
- Phase 5h is complete within the documented adjacent-land conflict scope.
  Next: Phase 5i whole-world balance and performance tuning.


### 2026-09-20 — Phase 5i1 scale and balance acceptance (in progress)

- Split remaining integration work into reproducible scale/balance scenarios (5i1),
  followed by final acceptance/documentation reconciliation (5i2).
- Baseline engine probes: standard 1,442-zone inactive worlds roughly 18–22 ms/day;
  maximum 6,762-zone inactive worlds roughly 73–91 ms/day on this host.
- Building an isolated 24-settlement combined-system fixture with normal births
  and starvation enabled, daily population/health/water/pollution reconciliation,
  deterministic replay, and bounded multi-size timing/forecast measurements.
- Gameplay defaults and live world remain unchanged; timings are measurements,
  not hardware-independent pass/fail thresholds.


### 2026-09-20 — Phase 5i final verification

- Added `npm run test:simulation`: bounded 92/1,442/6,762-zone scenarios with
  24 settlements for 1,000/200/30 days; separate daily replay, frozen final hashes,
  population/health/water/pollution reconciliation and active journey/front caps.
- Normal births and starvation are enabled. The small long run ends with 3,760
  people = 3,600 initial + 204 births - 44 combatant losses. Supplied fixture has
  no starvation; separate drought and stranded-party tests exercise that path.
- Added default growth/crop-failure/recovery control and combined-world restart:
  60 days, two clean server restarts with exact unchanged save bytes, then 60 more
  days matching uninterrupted advancement and saved history. No model calls.
- All 269 tests, typecheck/build passed. Combined standard-size browser scenario
  passed stepping, replay, built-in overlays, active inspectors, forecast/cancel,
  reload and responsive layout; desktop/mobile screenshots inspected.
- Corrected territory legend to explain enabled travel/trade/knowledge policies.
- Added `docs/phase-5-acceptance.md`; reconciled roadmap/README and recorded
  scale limitations. No default rules, saved schemas or provider operations changed.
- Final scale verification passed all frozen hashes. Measurements recorded in
  `docs/phase-5-benchmarks.json`: standard p95 43.14 ms/day, maximum p95 190.05
  ms/day; five-day forecast 434/2,031 ms respectively. Excludes I/O/rendering;
  24-settlement density, 30 days at maximum size, no worst-case guarantee.
- Deployment verified through LAN, including corrected frontend asset. Preserved
  first-world day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Evidence: `/tmp/logos-phase5-deploy.json`. No test activation or ticks on live save.
- Phase 5 complete. Existing frontend bundle warning, denser profiling and broader
  UI/performance polish remain subsequent work; no new mechanics implied.

### 2026-09-20 — Phase 5 completion publication

- Published milestone `ccb796f` to public `CyberSecDef/logos_engine` main.
- Phase 5 is complete within its agreed scope. Live deployment preserves the
  player's exact save; repeatable acceptance commands and measured limits are
  recorded in `docs/phase-5-acceptance.md`.

### 2026-09-20 — Phase 5 table status correction

- Updated the phase overview table to mark Phase 5 complete (5a–5i verified).
- Standardized all Phase 5 milestone table labels to complete, consistent with
  the final acceptance record. Documentation only; no application or save changes.

### 2026-09-20 — Phase 6a review accessibility

- Documented 6a–6e milestones and confirmed desktop-first priority with usable mobile.
- Found proposal focus loop skips expandable details; world-review focus handling
  is incomplete. Converting both reviews to native modal semantics.
- Adding initiating-control focus restoration, heading-first review, visible modal
  errors, and dismissal protection during submission. No engine/schema changes.
- All 269 tests, typecheck and production build pass after final changes.
- New Chromium review-accessibility browser test passes: full dynamic tab order,
  heading focus, background isolation, inline failed Apply, Escape protection during
  submission, successful Apply/restore, focus return and cancellation save hash.
- Testing exposed native focus leaving for browser chrome and asynchronous chat
  refresh replacing the opener. Added dynamic boundary traversal and stable review
  button identities with visible fallbacks; no two-button-only keyboard loop.
- Existing plugin, checkpoint/replay, historical branch and combined simulation
  browser workflows pass. Desktop/mobile screenshots inspected at 1440/390px.
- Documented limits: Chromium automation is not a full assistive-technology audit;
  broader navigation/mobile usability and bundle work remain 6b/6c.
- Deployed and verified native dialogs through LAN on `0.0.0.0:5180`.
  Preserved first-world day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Evidence: `/tmp/logos-phase6a-deploy.json`. No live test edits or ticks.
- Phase 6a complete; 6b desktop navigation/usable small screens is next.

### 2026-09-20 — Phase 6a publication

- Published milestone `e50e292` to public `CyberSecDef/logos_engine` main.
- Desktop-first preference recorded. Next: 6b navigation and usable small screens;
  6c performance, 6d local operation/recovery and 6e final acceptance remain planned.

### 2026-09-20 — Phase 6b1 zone navigation

- Added direct zone-number navigation and neighboring-zone buttons, with camera
  centering and paused rotation to keep the requested place visible.
- Added keyboard skip controls, Enter from globe to inspector, return-to-globe
  control, instructions, explicit map-layer pressed states and selection-only
  announcements. Same-zone ticks preserve neighbor controls and live-region text.
- Added short-desktop scrolling bounds and narrow-screen navigation sizing.
- All 269 tests, typecheck and build pass. New browser checks pass for zones
  447/444, real center picking, neighbors, invalid input, keyboard focus, overlay
  pressed states, quiet tick announcements and save preservation.
- Inspected 1440×1000, 1024×600 and 320×640 screenshots; 390×844 also tested.
  Mobile navigation remains reachable, with panel overlap explicitly left for 6b2.
- Navigation, review-accessibility, globe smoke and checkpoint/replay browser
  workflows pass. No engine, schema or prompt-operation changes.
- Deployed and verified through LAN at `0.0.0.0:5180`. Preserved first-world
  day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Evidence: `/tmp/logos-phase6b1-deploy.json`. No test edits or ticks on live save.
- Desktop-first preference retained; panel organization remains 6b2.

### 2026-09-20 — Phase 6b1 publication

- Published milestone `bf76bf6` to public `CyberSecDef/logos_engine` main.
- Next: 6b2 panel organization and broader desktop/mobile usability. Desktop-first
  preference retained; performance and local-operation milestones remain planned.

### 2026-09-20 — Phase 6b2 panels and zoom

- Confirmed existing expandable sections plus quick-jump menu, rather than tabs.
- Added sticky section selection with heading/summary focus and preserved expansions.
- Added exclusive mobile Globe / Map layers / Zone details views; panels scroll
  above the switcher and time controls, with conversation/worlds transitions.
- Added bounded keyboard/button zoom and reset with explicit-action announcements.
- Desktop-first preference retained. All 269 tests, typecheck/build and five browser
  workflows passed: panels, navigation, review accessibility, combined simulation,
  and checkpoint/replay. Inspected desktop, short-desktop and mobile screenshots.
- Confirmed quick-jump focus is below the sticky menu, other sections remain open,
  zoom is bounded/resettable, mobile panels are exclusive, and navigation is read-only.
- Deployed on `0.0.0.0:5180` and verified new controls over LAN. Preserved
  first-world day1206/revision1235, world hash
  `7a2de9ddaad7b4d20474ca904afd0a7f95d0b17651735e0d94ec5166b133f47f`
  and complete save envelope hash
  `a75081e558ad278cc619201a478c0af6428fe6212150f3fe56063aaa0479b128`.
  Evidence: `/tmp/logos-phase6b2-deploy.json`. No engine/schema or live-world edits.
- 6b is complete. Next: 6c measured rendering/delivery work, including the existing
  large-bundle warning. Cross-browser/manual accessibility acceptance remains 6e.
