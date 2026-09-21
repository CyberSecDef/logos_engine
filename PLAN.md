# Logos Engine: world simulation plan

Status: revised September 19, 2026 with confirmed product decisions. Remaining
implementation choices are identified below. This document describes the plan,
not an implemented game. The proposed engine/world contract is documented in
[docs/world-interface.md](docs/world-interface.md).

## Intent

Build an npm-based web game centered on a slowly rotating, selectable globe of
hexagonal tiles. Each tile represents part of a simulated world. Players inspect
its current conditions and use natural-language prompts to change its terrain,
inhabitants, infrastructure, connections, and governing rules.

The simulation proceeds without the LLM. Trade, climate, weather, conflict, and
technology follow explicit deterministic rules. The LLM translates player intent
into persistent changes for the active world; it cannot modify the engine.
This is a fantasy creator sandbox for observing how worlds evolve. There is no
endgame, victory condition, or constrained player faction.

## Confirmed product decisions

- The player is a world creator, free to reshape tiles and rules and observe
  consequences indefinitely. There are no win/loss conditions.
- Worlds are fantasy settings. Mechanics describe tangible state and effects;
  abstract instructions such as “allow more freedom” need a concrete definition
  before they can become a rule.
- Run at home, single-player, with a web interface and local backend.
- Time advances only during an active game session. No offline catch-up. Effects
  accumulate during simulated time and can propagate between zones.
- Rules are primarily declarative and state based: more rain, higher terrain,
  or disabled communication links are representative interventions.
- The player can discuss impacts with the LLM before applying anything. The
  model can explain that a request cannot be implemented.
- Support local Cursor and Claude Code application workflows as well as direct
  model API calls using server-side `.env` credentials. Determine the exact
  transports and runtime integration during development; Bun is a candidate.
- Call models only in response to user prompts, including explicit discussion
  requests. Autonomous simulation, events, previews, and replay use no LLM.
- During play the engine and application code remain unchanged. All model-made
  changes belong to the active world's files and pass a documented interface.
- Plan for sandboxed executable world plugins under `worlds/<id>/plugins/` to
  extend mechanics beyond declarative composition without changing the engine.
- At world birth, render plain colored tiles. Prepare for state-driven image
  textures as the world evolves: forest canopy, city overviews, and a growing
  library of other terrain, settlement, and condition artwork.
- Track air pollution, water contamination, and generic disease as future world
  properties. Spread follows wind, actual water flow, and population contact/travel,
  including routes between distant lands. See the
  [environment and health roadmap](docs/environment-and-health.md).

## Implementation choices still to settle

Choose Node.js or Bun after an adapter and sandbox feasibility spike. Verify the
actual supported integration surfaces of the installed local applications before
choosing a CLI bridge, tool protocol, or file exchange. Decide the first direct
API provider, tick duration, plugin language/runtime, and resource budgets during
that work. These choices do not reopen the product decisions above.

Proposed defaults: fixed topology per world; one simulated day per tick;
selected-tile prompt scope; explicit regional/global scope; discussion never
mutates state; a change proposal has an explicit Apply action. Exact tick duration
must be checked against stable water-flow and erosion calculations.

## Findings from globe.trackr.live

Inspected the local project at `../globe.trackr.live`, including its README,
package manifest, license, globe generator, mesh builder, scene, main entry, and
styles. The existing app uses Vite, Three.js, and JavaScript modules.

Preserve these visual and interaction ideas:

- Full-screen globe against a dark starfield, atmospheric rim, directional
  sunlight, raised terrain, visible tile gaps, and subtle water reflections.
- Slow automatic rotation, orbit/zoom controls, hover feedback, persistent tile
  selection, compact translucent panels, and thematic color overlays.
- Shared geometry buffers and a triangle-to-tile picking table, with separate
  selection geometry instead of repainting the globe on hover.

Useful source modules are `src/globe/goldberg.js`, `tileMesh.js`, `marker.js`,
`scene.js`, and the visual conventions in `src/styles.css`. Adapt these behind
simulation-neutral interfaces. Retain the source MIT notice in copied code.

Replace Earth raster sampling and live data providers with seeded world
generation and simulation state. Do not require the reference project's imagery,
geographical datasets, real-world lookups, Earth radius, or Earth calendar.

The Goldberg sphere has `10 * frequency² + 2` cells, including exactly 12
pentagons. Frequency 26 gives 6,762 total cells, of which 6,750 are hexagons.
Simulation logic must accept five- and six-neighbor cells and account for their
different surface areas. Start smaller for development, then benchmark this
reference resolution. Derive and persist adjacency and stable tile IDs; the
reference renderer alone does not provide the full simulation graph contract.

Changing resolution cannot be a casual display slider once tiles own state.
Create a new world or use a deliberate migration to change simulation topology.

## Architecture

Use TypeScript for new application and simulation code, an npm workspace, Vite
and Three.js for the browser, and a local Node.js or Bun backend, selected
after integration testing. Choose exact dependency versions during implementation. Keep the initial UI lightweight; a component
framework is optional rather than a prerequisite.

```text
apps/
  web/                 globe, inspector, prompt panel, timeline, controls
  server/              world sessions, command API, persistence, LLM adapter
packages/
  engine/              deterministic ticks, system scheduling, invariants
  contracts/           state schemas, commands, rule definitions, versions
  globe/               topology and adapted rendering components
  worldgen/            seeded geography and initial populations/resources
  agent-bridge/        local application and direct API adapters
  plugin-host/         isolated deterministic world-plugin execution
assets/
  tile-packs/          shared versioned image libraries and appearance catalogs
worlds/
  <world-id>/
    manifest.json      identity, seed, schema/engine/generator versions
    topology.json      tile IDs, adjacency, areas, coordinates
    definitions/       resources, buildings, factions, technologies, fields
    appearance/        state-to-art mappings and pinned tile-pack references
    assets/            optional world-local tile images and pack manifests
    rules/             immutable versioned world rules
    plugins/           versioned world code, manifests, and sandbox artifacts
    interface/         generated contract/capability reference for this world
    snapshots/         complete committed states and revision references
    events/            ordered committed commands and intervention records
    proposals/         staged model changes and validation results
    conversations/     user-initiated discussions and proposal references
    branches/          branch metadata for experiments and restoration
docs/                  design decisions and data/rule contracts
```

The server owns state and serializes writes for each world. The browser sends
commands and receives snapshots plus versioned updates; it never advances the
authoritative simulation itself. Use HTTP commands and a streamed update channel
(initially server-sent events). Reconnect by revision, falling back to a complete
snapshot when updates are missing.

The engine accepts state, world definitions, rules, and an explicit tick context,
and returns next state plus events. It has no dependency on rendering, an LLM,
wall-clock time, or live network data. The world directory is a persistence
boundary, not permission for the LLM to write arbitrary files.

## World model and generation

Separate immutable topology, evolving state, and versioned definitions/rules.

- World: seed, tick, revision, calendar, planetary parameters, rule revision,
  branch identity, and saved random-generator state where applicable.
- Tile: elevation/depth, terrain, soil, water, climate baseline, weather,
  population, inventories, infrastructure, ownership, and named custom fields.
- Entities: settlements, factions, trade links, treaties, conflicts, and research
  projects. A faction or route can span many tiles; these are not duplicated
  inside every tile record.
- Events: a timestamp in simulation ticks, affected entities, cause, outcome,
  originating command or rule, and relevant before/after values.

Give every numeric field units, bounds, a default, and an aggregation policy.
Distinguish totals from densities and derived displays from authoritative data.
Keep tile identity stable when terrain or ownership changes.

Generate continuous terrain on the sphere from a seed, then derive oceans,
climate bands, soils, resources, and an initial settlement distribution. Avoid
latitude/longitude texture seams. Start with configurable radius, axial tilt,
season length, land coverage, and resource abundance. Physical plausibility is
a gameplay approximation, not a claim of scientific climate modeling.

## Deterministic simulation

Define determinism as identical state hashes for the same starting snapshot,
engine/rule versions, seed, and ordered committed inputs on a supported runtime.
Do not promise cross-runtime floating-point identity until tested; use integer
or fixed-point accounting for conserved quantities and explicit rounding rules.

Each tick follows a documented phase order:

1. Apply validated queued interventions at the tick boundary.
2. Advance calendar, seasonal forcing, weather, and water balance.
3. Compute production, consumption, and available inventories.
4. Resolve trade allocations and transport under capacity constraints.
5. Resolve population changes, migration, and measurable resource pressures.
6. Resolve diplomacy/conflict and territorial effects.
7. Advance research and activate completed technology effects for the next tick.
8. Validate invariants, commit the new state, and publish events and UI changes.

Within each phase, read a consistent input state and resolve competing effects
in stable order before committing. Specify whether later phases see earlier
phase results. Use stable IDs to break ties. Use seeded random streams keyed by
system and entity so one new rule does not accidentally reshuffle all weather.

Trade transfers must debit and credit consistently; simultaneous requests cannot
spend the same inventory twice. Explicit sources, sinks, losses, and creator
interventions explain changes in totals. Check finite values, nonnegative
inventories/populations, valid ownership, and referential integrity every tick.

Begin with weather, water flow/flooding/erosion, food production/consumption,
and neighbor trade. Expand to
route networks, migration, faction behavior, warfare, and technology in later
milestones. Their first versions should be simple, legible rule systems with
visible causes, not opaque approximations of every real-world process.

Globe animation and simulation time are independent. Pausing the simulation need
not stop the decorative rotation. No LLM call is needed to run ticks. Tie tick
execution to an explicit active-play session, not merely a running backend.
Closing the game or losing its session lease pauses progression; reopening loads
the last committed tick without calculating elapsed real time. Use pause signals
plus a short heartbeat lease for crash/disconnect recovery, documenting that
crash detection can lag until lease expiry. A hidden-tab pause is a proposed
initial behavior. Long-running local agent processes cannot keep a world ticking.

Water flow is a first-class cross-zone effect. Persistent rainfall can saturate
soil, cause runoff and flooding, transport sediment/nutrients downstream, erode
terrain, damage infrastructure, and alter later production. Elevation changes
invalidate drainage calculations. Track water and transported material with
explicit sources/sinks and bounded, simultaneous flow steps. Use deterministic
substeps where needed rather than allowing a large tick to destabilize flow.
Communication, trade, migration, and physical water flow are separate channels;
blocking messages does not silently stop runoff or isolate all other processes.

## Planned pollution and disease

Add distinct air-quality, water-quality, and generic disease systems with
observable sources, transport, exposure, and recovery. Smoke from fires follows
airstreams; water contamination follows runoff and wash-off. Famine can affect
water quality through explicit sanitation/infrastructure rules once those systems
exist. Disease follows population contact and travel, including distant routes.
These are future mechanics, not currently supported prompt operations.

The [detailed roadmap](docs/environment-and-health.md) records fields, causal
chains, dependency order, inspection/overlays, and acceptance scenarios. Physical
transport stays separate from communication permissions. All spread is
deterministic and requires no model calls.

## How prompts become world changes

Provide two explicit interactions: **Discuss** explains current state and likely
impacts without changing the world; **Propose change** prepares a transaction for
Apply. A discussion can lead to a proposal when the player requests it. Show
assumptions, affected zones, and supported versus unsupported effects. Never
silently turn an exploratory question into a mutation.

Representative prompts:

- “Make more rain here”: propose a quantified recurring rainfall modifier, with
  units, scope, and duration, instead of silently assuming a one-time storm.
- “Raise the elevation here”: propose a concrete elevation delta and preview
  effects on drainage and downstream zones.
- “This zone doesn't communicate with others”: disable defined information
  channels at its boundary. Clarify whether trade or migration is also intended.
- “Allow more freedom”: ask what observable state or behavior should change.
- A request outside declarative and sandbox capabilities receives an explanation
  that it is not possible with this engine, with feasible alternatives if any.

1. Assemble bounded context: active world/revision, selected tile, relevant
   neighbors/entities, applicable definitions/rules, and recent history.
2. Give the model world-specific read tools and structured proposal tools.
3. Let it propose a transaction containing state operations, definition changes,
   rule changes, any migration, and a player-facing explanation.
4. Validate schemas, scope, references, units, bounds, rule dependencies, and
   resource limits. Reject unsupported operations with actionable diagnostics.
5. Run a bounded dry simulation on a copy, reporting direct changes and possible
   downstream effects separately. A short preview is not a long-term guarantee.
6. Present the proposed scope and effects; Apply commits atomically at a tick
   boundary. Discussion and preview never change authoritative state.
7. Update the globe, inspector, and history from committed state.

Use expected revisions and unique command IDs. A proposal based on stale state
must be revalidated or regenerated; retries must not duplicate an intervention.
During discussion/proposal review, pause the world by default and preserve the
previous play/pause setting. Restore it on leaving the interaction if the game
session remains active. Retain revision checks even while paused.

Record the accepted structured transaction and its provenance. Replay uses the
recorded transaction, never another LLM call. Provider failure leaves the world
playable and unchanged by the failed proposal. Background behavior must never
trigger model requests, including automated repair of failed rules/plugins.
Bounded tool exchanges may occur within a user-initiated request; a stale or
failed proposal does not authorize an endless regeneration loop.

## Rules and the engine boundary

The engine supplies a fixed vocabulary of state types, expressions, queries,
effects, execution phases, and validation. Each world supplies its particular
definitions and rules. A rule contains an ID/version, scope, phase, cadence,
conditions, bounded formulas, effects, and explicit dependencies.

The initial interpreter should support arithmetic, comparisons, bounded
neighbor/entity queries, resource transfers, production/consumption, modifiers,
and scheduled events. Permit new typed world fields and definitions through
validated migrations so the LLM can introduce concepts such as a new resource,
building, or technology and make them work using existing operations.

Expose custom fields and definitions through generic inspector sections and
overlays. The model provides labels, units, and display metadata, never browser
scripts or arbitrary HTML. This makes new world concepts inspectable without
editing the application.

Declarative extensibility has a real limit: the LLM can compose supported
operations into new mechanics, but cannot invent an unsupported execution
primitive. Prefer a declarative solution; when insufficient, a world-specific
plugin can implement deterministic computation using the fixed plugin contract.
If neither can express the request, report that limitation. Never edit engine
code as a fallback during play.

Sandboxed world plugins are part of the architecture and planned delivery scope.
Keep their code and versioned artifacts in the world's `plugins/` directory.
Provide explicit lifecycle hooks, deterministic inputs, scoped reads, bounded
output effects, persistent plugin state, and execution budgets. World plugins
cannot register new host capabilities or modify validation. Select the isolation
runtime during a spike and verify its limits before enabling generated code.
A folder restriction, prompt instruction, or ordinary JavaScript evaluation is
not an execution boundary. See the interface document for the proposed contract.

Local coding applications need a staged world workspace rather than the engine
repository. They may author world definitions and plugin source within that
workspace, using restricted local build tools if required. The bridge imports
only validated world artifacts; it does not accept direct changes to committed
state, engine files, application files, or dependency manifests. Enforce this
outside the model with filesystem/process isolation, including child processes.
An application's unrestricted local user privileges cannot be treated as a
sandbox merely because it was launched inside a world folder.

For direct API adapters, the model receives only scoped world reads and proposal
tools. For every adapter, the server resolves active-world IDs and permitted
operations; model-supplied paths are not authority. Prevent cross-world access
and reject path/symlink escapes. Load `.env` secrets on the server, exclude them
from source control, exports, snapshots, and prompts, and never send credentials
to the browser or plugin runtime. The connector may use its configured provider
network access; simulation plugins have none.

## Persistence, history, and recovery

Use human-readable versioned JSON definitions and snapshots initially, with an
append-only transaction journal. Stage artifacts and commit through a durable
journal/commit marker so partially written files never become an active world.
Test recovery from interruption between each write step. Use one writer per
world and checksum committed snapshots and referenced rule artifacts.

Persist enough information to restore tick, random state, pending scheduled
events, state revision, exact rule definitions, plugin state, and plugin artifact hashes. Capture periodic snapshots
and retain ordered inputs for replay between them. Pin engine compatibility;
opening an older world requires either a compatible runtime or an explicit
migration, not silent reinterpretation under current rules.

Rule upgrades that change fields require migrations with defaults and validation.
A failed migration keeps the prior revision active. World export includes the
manifest, definitions, rules, plugins, state, and required history, excluding secrets.

After consequences have propagated, undo should restore or branch from a prior
checkpoint and replay selected inputs. Merely reversing the original tile edit
does not reverse subsequent trade, migration, or war.

## Tile appearance and evolving artwork

World birth uses solid biome/terrain colors. Build the rendering interface to
support image textures from the start, even before a substantial art library
exists. As play progresses, appearance rules can reveal top-down forest canopy,
settlements, city blocks, farms, wetlands, flood damage, and other conditions.
Art depicts simulation state; a city image does not itself create a city.

Use a data-driven appearance catalog, separate from simulation rules. Entries
declare an asset ID, matching state conditions, priority, compatible layers,
variants, fallback color, and pack version. User-confirmed initial presentation: birth is color-only, then a few tiles at a
time fade into textures over the first 1,000 simulated days. Tiles targeted by
applied creator actions reveal immediately. This is visual presentation, not a
separate ecological maturation mechanic; a Colors only option remains available.

Support a base terrain image plus optional settlement and condition layers, so
a forest settlement or flooded city does not require a unique full-tile image
for every combination. Allow complete replacement artwork when an authored image
is better. Keep thematic overlays and selection highlights readable over textures.

Use stylized top-down fantasy artwork as the initial art direction; create
actual image assets during development as needed. Keep lighting mostly in the
renderer so baked shadows do not contradict the globe's sun. Define a common
asset specification for scale, orientation, color space, dimensions, alpha, and
edge padding before building the library. Record asset provenance and licenses.

Give tile tops local UV coordinates and clip rectangular source images to each
polygon, including pentagons; retain simple shaded side walls. Preserve shared
geometry and batch texture use through atlases or texture arrays after a
rendering spike. Include mipmaps, atlas padding where applicable, bounded GPU
memory, and color fallback for absent or unloaded assets. At distant zoom levels,
favor legible color/detail reduction over noisy tiny images.

Choose visual variants deterministically from stable tile IDs and pack versions;
do not consume simulation randomness. Use transition bands or hysteresis around
appearance thresholds to avoid flickering between city/forest variants. Derived
visual state must not alter simulation outcomes or state hashes. Pin appearance
pack versions for consistent reloads, and include required world-local assets
and resolvable pack references in exports.

Adding a new supported image or state-to-art mapping should require only assets
and catalog data, not engine edits. Normal simulation selects existing artwork
without LLM or image-generation calls. Missing art never blocks a tick.

## Interface

Keep the globe dominant. Show world name, simulated date, play/pause, single
step, speed, and save status in a compact top bar. Tile selection opens an
inspector with current stats, trends, neighbors, applicable rules, and recent
events. Place contextual chat and the change preview alongside it.

Add overlays incrementally: terrain, climate/weather, population, food/resources,
ownership, trade, conflict, technology, air quality, water quality, and disease.
Provide legends and units, with wind/flow directions and travel links on demand. Make
event entries select affected tiles and distinguish actual changes from model
proposals. Add a world picker with create, open, duplicate/branch, and export.

On small screens, use a bottom sheet for inspection/chat. Support keyboard tile
navigation and selection, readable focus indicators, reduced-motion behavior,
and a textual inspector independent of hover and color.

## Delivery sequence and acceptance criteria

1. **Contracts and skeleton.** Specify the world interface, prototype local-agent
   adapters and plugin isolation, select the runtime, and scaffold npm
   workspaces, define state/command/rule contracts and engine boundaries. A
   seeded tiny world can be created, saved, loaded, and stepped from a CLI.
2. **Globe and inspection.** Adapt the reference rendering, generate a fictional
   planet, and connect tile selection to saved state. No Earth assets or live
   feeds are needed; selected IDs survive reloads and visual changes. Begin with
   colored tiles, define the appearance catalog/UV contract, and demonstrate
   forest and city textures using a small development art pack.
3. **First living world.** Add weather, runoff/flooding/erosion, food,
   population consumption, communication channels, and trade,
   plus time controls and event explanations. Two runs with the same inputs
   produce the same hashes, and the world progresses with the LLM disconnected.
4. **Prompt-driven vertical slice.** Connect one provider; edit a selected tile
   and introduce one persistent world rule through a validated transaction.
   Demonstrate rain, elevation, and communication edits; discuss their impacts
   without mutation, then apply and replay. Verify malformed/stale requests
   leave state intact and time stops outside active play.
5. **World customization and recovery.** Add custom definitions/fields,
   migrations, rule history, previews, branching, and import/export. A new
   resource or building created through a prompt appears in the inspector and
   participates in simulation without engine edits. Complete Cursor, Claude
   Code, and `.env` API workflows against the same conformance suite.
6. **Sandboxed world plugins.** Implement the fixed plugin contract and isolated
   execution, deterministic budgets, artifact validation, and failure recovery.
   Demonstrate a new world mechanic through a plugin with no engine changes and
   identical replay results. Verify isolation with deliberately invalid plugins.
7. **Broader simulation.** Add migration, faction policies, conflict, and
   technology with explicit causal links to production and trade. Add wind-driven
   air pollution, runoff-driven water contamination, and generic disease after
   population/contact/travel prerequisites; connect famine to water quality
   through defined infrastructure and sanitation rules. Record design
   decisions and tune observable scenarios before expanding complexity.
8. **Scale and polish.** Benchmark approximately 6,762 cells, improve update
   batching and rendering, and complete accessibility, responsive layouts, and
   reliable local single-player startup and shutdown.

The first playable target is milestones 1–4. The full requested simulation also
requires milestones 5–7; the first slice is not a claim that warfare, technology,
or unrestricted new mechanics are already finished.

## Verification strategy

- Topology: connected graph, reciprocal adjacency, valid areas, 12 pentagons,
  and stable IDs for a fixed topology version.
- Appearance: color-only birth, state-driven texture transitions, hexagon and
  pentagon UVs, missing-image fallback, readable overlays, and unchanged
  simulation hashes with textures enabled/disabled. Verify a new catalog entry
  can be added without application changes.
- Simulation: deterministic replay, phase ordering, conservation accounting,
  simultaneous trade competition, and bounded values over long seeded runs.
- Transactions: atomic multi-operation edits, duplicate requests, stale
  revisions, invalid rules, failed migrations, and provider interruptions.
- World isolation: attempts to reference another world or engine paths are
  rejected; imported definitions cannot introduce executable browser content.
- Plugins/adapters: identical validated transactions across adapters, bounded
  execution, denied host access, no partial effects after faults, and reproducible
  plugin state across save/load/replay.
- Causal scenarios: sustained rain causes downstream effects; elevation redirects
  runoff; communication isolation leaves physical flow intact.
- Session/model policy: no offline catch-up and no autonomous model calls, even
  after errors or when a plugin needs repair.
- Persistence: interruption recovery, save/load equivalence, compatibility
  checks, branching, and export/import round trips.
- Browser flow: create world → inspect tile → prompt → review/apply change →
  advance time → observe consequences → reload with the same state.
- Performance: measure rendering and tick times separately on a named reference
  machine; target responsive interaction and a basic tick within 100 ms at the
  reference resolution, then adjust the budget based on measurements.

At the original planning milestone, no implementation or runtime verification
had been performed. Current completed behavior and verification are recorded in
DEVELOPMENT.md and the implemented-interface documentation.

## Agreed Phase 4 completion scope — 2026-09-19

The player confirmed all five remaining areas: world-local/layered artwork,
complete portable bundles, minimal generic entities, selective replay, and a final
integration/compatibility acceptance pass. Complete them all before closing Phase 4.
The concrete checklist and sequence are in [Phase 4 completion](docs/phase-4-completion.md).
Earlier suggestions to defer layering or selective replay no longer apply.


### Final provider acceptance scope — 2026-09-19

The player added local Codex support for OpenAI models. Claude Code, Cursor CLI,
Codex CLI and the optional Anthropic API share the world-change validator. CLI
providers use native login or supported server-only API credentials, disposable
workspaces and bounded responses. No provider can change engine files during play.
The final acceptance matrix records live versus mocked transport evidence; paid
direct API acceptance requires credentials and is not implied by mock tests.

Phase 4 is complete. The [final acceptance matrix](docs/phase-4-acceptance.md)
records 113 passing tests, all browser regressions, live Claude/Cursor/Codex checks,
and mocked direct API coverage. Phase 5 is the next development phase.

## Phase 5 execution plan — 2026-09-20

Phase 5 has started. [Milestones 5a–5i](docs/phase-5-plan.md) specify dependencies,
activation/versioning decisions and acceptance gates. The first implementation
extracts actual water transfers and exposes read-only next-day budgets while
preserving Phase 4 simulation outputs. Food/population follows after its initial
placement and demographic rules are agreed.

### Phase 5b execution — 2026-09-20

Implemented creator-placed settlements with versioned food/population calculation,
reviewed settings/food/population operations, exact daily ledgers, overlays and
recovery. See [the complete contract](docs/settlements.md) and DEVELOPMENT.md for
acceptance/publication evidence. Trade/movement is next (5c); environmental health,
technology and conflict remain separate planned milestones.

### Phase 5b follow-up — soil ecology

Connect the existing fertility index to farm harvests through a reviewed versioned
world model. Rain/temperature affect soil; farmer-sized populations improve it,
while urban populations reduce soil and vegetation. All population thresholds and
rates are bounded world settings. See [soil ecology](docs/soil-ecology.md) for defaults,
activation, writer conflicts, ordering, compatibility and verification.

### Phase 5c1 execution — adjacent food sharing

Automatic sharing after world activation is confirmed. Implemented bounded reserves,
import/export/edge limits, exact conserved routes, local permissions separate from
communication, next-day route previews and inspection. See [food sharing](docs/food-sharing.md).
Resource routes, general travel permissions, timed journeys and migration remain
separate 5c substeps. DEVELOPMENT.md records verification and publication.

### Phase 5c2 execution — named resource routes

Added directed adjacent stock routes with versioned capacity/reserve/target/cadence,
local travel gates and per-route reports. Uses the original transfer reservation
phase so legacy rules and routes cannot double-spend or forward same-phase receipts.
Food, communication and legacy generic sharing remain separate channels. Timed
journeys and migration stay in 5c3. See docs/resource-routes.md and DEVELOPMENT.md.

### Phase 5c3 execution — timed land journeys and migration

Creator-directed migration and blocked-arrival waiting are confirmed. Implemented
saved paths/timers, real inhabitants/food/cargo, shortage losses, capacity gates,
reviewed provision/redirect/dock recovery, and transit-inclusive totals. No automatic
famine migration or sea travel. See docs/journeys.md and DEVELOPMENT.md for acceptance.

### Phase 5c4 execution — automatic neighbor visits

Implemented daily temporary neighbor trips for food, work and exploration with
conserved food and farm labor. Versioned activation preserves old replay; trips
respect explicit travel closures and need no individual review/model call.
See docs/neighbor-visits.md and DEVELOPMENT.md for rules and acceptance evidence.

### Phase 5c5 and 5d execution — autonomous relocation and air transport

Confirmed automatic permanent relocation based on food/crowding/better nearby
conditions; travel closures apply. Implemented with existing timed journeys,
inbound capacity checks, cooldowns and conserved population/food.

Confirmed air pollution tracks/spreads only; ALL damage links are deferred. Added
seeded saved spherical wind, whole-unit emission/transport/mixing/removal budgets,
scoped creator controls, custom reads, diagnostics and air/wind overlays. Air ignores
human borders and has no water/vegetation/farming/health consequences yet.
See docs/automatic-migration.md, docs/air-pollution.md and DEVELOPMENT.md.

### Phase 5e execution — water quality and sanitation

Confirmed water contamination reduces farming now, illness later. Waste generation
starts only with explicit world activation. Implemented exact runoff entrainment,
dry deposits/wetting, settling, finite treatment, decay and ocean export budgets.
Sanitation condition persists through famine counter resets and migration; food
shortages impair next-day treatment. Added operations, custom reads, overlays,
read-only diagnostics and five-day forecast comparisons. See docs/water-quality.md.

### Phase 5f1 implementation update

[Health and recovery](docs/disease.md) implements optional susceptible/ill/immune
accounting, creator intervention, water-caused cases, reduced farm labor and
health-preserving travel/demographic edits. No direct disease deaths. Phase 5f2
adds separately activated contact transmission through local mixing, visits and
arrivals, plus mixing inside transit parties. See the health model for exact
snapshots, attribution, rounding and compatibility. Phase 5g technology is next.

### Phase 5g1 implementation update

[Automatic local research](docs/technology.md) now supports world-defined
cultivation improvements, healthy resident labor costs and food reserve gates.
The player confirmed automatic project selection. Knowledge sharing and broader
unlocks follow in 5g2/5g3; research runs without automatic model calls.

### Phase 5g2 implementation update

Separately activated neighbor knowledge exchange now accelerates local research
through open communication channels. Learners supply workers/food; prior-day
archives, stable source selection and no stacking prevent instant chain learning.
Phase 5g3 broader unlocks/integration remains. See [technology](docs/technology.md).

### Phase 5g3 completion

Technology now supports installed-treatment efficiency, local prerequisite chains
and read-only knowledge inputs for world rules/plugins. Combined 200-day simulation
replay and conservation checks cover environment, population/travel, health, food
and research. Phase 5g is complete; factions/conflict (5h) and final tuning (5i) follow.
Construction/material recipes remain future scope; worker-time is the current cost.

### Phase 5h1 implementation update

[Faction identities and territory](docs/factions.md) now support reviewed registry
edits, land claims/releases, symmetric relationships and a territory overlay.
The player confirmed creator-established factions and rule-driven automatic
conflict. Borders/mobilization/conflict follow; 5h1 labels have no combat effects.


### Phase 5h2a implementation update

[Hostile border policies](docs/factions.md#implemented-5h2a-hostile-border-policies)
now connect explicit world settings to travel, trade and knowledge exchange.
Neutral/allied/unclaimed edges remain open under local permissions. Journey
closures preserve parties and leg progress while food consumption continues.
Physical transport and custom generic flows remain independent. Mobilization
(5h2b), automatic conflict (5h3), combined acceptance (5h4) and tuning (5i) remain.


### Phase 5h2b implementation update

[Resident garrisons](docs/factions.md#implemented-5h2b-local-resident-garrisons)
reserve local population slots, staff healthy home workers before research/farms,
and retain ordinary meals/health. Food/terrain can pause service; demobilization
releases slots. No second population ledger or military stockpile exists. Moving
armies, automatic conflict and associated supplies/losses remain Phase5h3.


### Phase 5h3a implementation update

[Supplied troop movements](docs/factions.md#implemented-5h3a-supplied-troop-movements)
move healthy resident garrison members through own/allied land, preserving faction
identity and actual population/health/food, and reinforce own settlements. Automatic
battles/capture follow in5h3b. Confirmed battle consequence: bounded combatant losses,
with civilians and buildings preserved; later work may add displacement/damage.


### Phase 5h3b implementation update

[Automatic adjacent conflict](docs/factions.md#implemented-5h3b-automatic-adjacent-conflict)
uses explicit world activation, supplied healthy garrison expeditions, disjoint
fronts, cooldowns, timed travel, bounded simultaneous combatant losses and capture.
Civilians/buildings/inventory survive direct capture; surviving attackers return
home and defenders demobilize. Civilian closures do not stop invasion. Next:5h4
integrated acceptance and5i whole-world tuning; naval/siege/damage/displacement
systems remain future scope.


### Phase 5h4 implementation update

[Combined acceptance](docs/factions.md#phase-5h4-combined-acceptance) exercises
conflict with environment, health, food, movement and research over 200 days,
including persisted replay/checkpoints/export and stranded survivor recovery.
Fixed same-day migration incorrectly releasing the remaining home garrison after
an expedition departs. Phase 5i balance/performance tuning follows; displacement
and building damage remain future scope.


### Phase 5i completion

Phase 5 is complete within its agreed simulation scope. The [final acceptance
matrix](docs/phase-5-acceptance.md) records long-run multi-size replay/conservation,
default balance controls, saved restart recovery, combined browser acceptance and
measured latency/size limits. No balance defaults or world schemas changed.
Further scale/polish and new mechanics remain subsequent work; maximum-size
measurements do not imply fully populated/custom-rule worst-case performance.


## Phase 6 execution plan — 2026-09-20

[Phase 6 milestones](docs/phase-6-plan.md) cover review accessibility, desktop-first
navigation with usable mobile layouts, measured rendering/delivery performance,
local operation/recovery and final integration. Start with keyboard-accessible
review dialogs; preserve the engine, saved worlds and explicit creator approval.

### Phase 6b1 navigation update

Direct zone-number and adjacent-zone navigation now centers the requested place
and pauses globe rotation. Keyboard globe/inspector entry, skip controls, layer
selection states and quiet selection announcements are implemented and verified.
Short/narrow viewport navigation is tested; panel organization remains 6b2.
See the [Phase 6 plan](docs/phase-6-plan.md) for behavior, commands and scope.

### Phase 6b2 panel organization

The confirmed quick-jump menu preserves expandable inspector sections and moves
focus to the requested controls. Desktop retains side-by-side panels; mobile
Globe / Map layers / Zone details views remove competing panel overlap. Bounded
keyboard/button zoom and reset supplement existing pointer controls. All changes
are presentation-only. Measured rendering/delivery optimization follows in 6c.

### Phase 6c rendering and delivery

Verified tile buffer caching and rendering parity, data-only browser defaults,
stable renderer chunking and production cache reuse. Measurements and limits are
in the [Phase 6 plan](docs/phase-6-plan.md). Local operation/recovery follows in 6d.
