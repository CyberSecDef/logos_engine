# Engine–world interface

Status: proposed contract, September 19, 2026. This is the implementation target,
not an existing API. Concrete transport, JSON schemas, plugin runtime, and local
application integration will be selected and tested during development.

## Ownership

The engine supplies fixed execution semantics. A world supplies data, rules,
definitions, and optional sandboxed plugin code. During gameplay, neither the
model nor a plugin changes engine or application code. New world mechanics must
fit this contract or be reported as unsupported.

The server is the only writer of committed world state. Models author proposals
in a staging area for one world. The server validates and commits accepted
artifacts. The same boundary applies to local coding applications and API models.

Each world carries an engine API version, schema version, topology version,
current state revision, rule revision, and plugin artifact references. Generate
an `interface/` reference from the actual supported schemas and capabilities so
the model can discover what this installation can do. Do not let model edits to
that reference redefine permissions or validation.

## State and declarative operations

Fields declare type, units, valid range, default, scope, and whether they are
stored or derived. References use stable world-local IDs. A zone initially means
one tile; named sets of tiles provide regional scope without changing topology.

Distinguish three kinds of intervention:

| Kind | Example | Persistence |
| --- | --- | --- |
| State edit | Raise tile elevation by 100 metres | New terrain persists; drainage is recomputed. |
| Recurring rule | Add 5 mm of rain per simulated day | Active until its declared expiry or removal. |
| Scheduled event | Apply one storm next tick | Executes once; recorded for replay. |

Provide typed operations for field changes, entity creation/removal, resource
sources/sinks/transfers, channel configuration, rule replacement, definition
changes, migrations, and plugin installation/update/removal. Derived values
cannot be patched directly. Removal must handle dependent references explicitly.

Rules have stable IDs, immutable versions, scopes, phases, conditions, effects,
cadence, and optional expiry ticks. Conditions read state. Expressions use a
bounded parsed representation, never unrestricted `eval`. Rule order and
composition are defined: additive modifiers compose in stable order, overrides
require an explicit priority, and ambiguous conflicting writes are rejected.
Reject dependency cycles that cannot fit the engine's documented phase model.

Source and sink operations let a creator introduce rain or terrain without a
resource budget, while recording the intervention in accounting. Internal
transport still conserves quantities after declared losses. Fantasy effects
such as magical springs can use these same tangible rules.

Communication is an explicit information channel between entities or zones.
Its first concrete effects should include transfer of discoveries and knowledge
used by research. Trade routes, migration permissions, and water flow remain
distinct. Show which channels a proposed isolation rule affects.

## Planned environmental and health fields

The [environment and health roadmap](environment-and-health.md) adds future
contracts for air/water contaminant loads, source/sink rules, wind transport,
water-quality displays, population health state, and travel-linked illness.
These are proposed capabilities, not currently accepted operations. Use declared
units and migrations, stored loads/counts versus derived concentrations/prevalence,
explicit dry-zone handling, and conserved transfers. Keep source removal separate
from cleanup/recovery; distinguish direct edit scope from simulated propagation.
Expose incoming/outgoing effects and provenance through inspector/preview metadata.
Models discover only the primitives actually supported by the installed engine.

## Appearance data and image assets

World `appearance/` files map observable state to versioned tile-pack asset IDs.
Optional world-local images live in `assets/`; shared packs are referenced by
version and content hash. Appearance conditions use the supported declarative
field-query vocabulary. Images and mappings never define simulation behavior.

The renderer supports solid-color fallback, terrain textures, settlement layers,
and condition layers. At birth it renders colors only; the initial proposed
reveal policy enables matching textures after the first simulation tick. Art
selection is local and deterministic, with no model or image-generation calls
during progression. Missing imagery has no effect on simulation validity.

Models can propose mappings to existing approved assets and submit world-local
artifacts through the same staged validation path. Accept only supported image
formats within dimension/file-size limits and validated pack manifests; exclude
scripts, shaders, arbitrary HTML, remote fetch instructions, and path escapes.
Keep image creation an explicit development or user-requested workflow.

Pin asset references for reload/export, provide defined fallback behavior for
unavailable packs, and keep derived rendering choices out of simulation hashes.
Generic catalogs must allow library growth without model changes to rendering
or application code.

## User request lifecycle

1. A user explicitly starts Discuss or Propose change with a selected scope.
2. Capture the world revision and provide bounded context and capabilities.
3. Allow scoped reads and optional deterministic previews for that request.
4. Discuss returns an explanation, clarification, or unsupported result. It
   cannot apply changes. Propose change returns a structured transaction.
5. Validate the transaction and run a bounded preview on copied state.
6. Display concrete changes, assumptions, affected scope, and preview limits.
7. The player's Apply action commits at a tick boundary after a revision check.

Only steps driven by an explicit user request may call a model. Simulation ticks,
previews, narration in the event log, replay, and error recovery never call it.
Render ordinary event explanations from structured causal records. Tool exchanges
within a request have configurable budgets and cancellation. No silent background
agent starts because an event occurred or a plugin failed.

Ambiguous requests require measurable interpretation. A proposal for “more rain”
must expose its chosen quantity and duration. Forecasts distinguish results of
the bounded preview from speculation beyond its horizon. Unsupported requests
return a reason and optional feasible alternatives without pretending success.

## Proposed transport-neutral capabilities

| Operation | Purpose |
| --- | --- |
| `describeCapabilities` | Read supported schemas, operations, plugin ABI, limits. |
| `readWorld` | Read bounded selected-world state and revision. |
| `readDefinitions` | Read relevant fields, rules, entities, plugin manifests. |
| `readHistory` | Read bounded causal events for the selected scope. |
| `validateProposal` | Return structured diagnostics without changing state. |
| `previewProposal` | Simulate a candidate on copied state within a tick budget. |
| `submitProposal` | Stage a candidate and return its ID for player review. |

Commit is a player/server operation, not a model capability. All requests receive
their world authority from the active session. A model-supplied world ID cannot
grant access to another world. Avoid generic path-based read/write tools in the
direct API adapter.

A proposal envelope contains `schemaVersion`, `proposalId`, `requestId`,
`worldId`, `expectedRevision`, `scope`, `operations`, `artifactHashes`, and a
summary of assumptions/effects. Apply assigns the authoritative effective tick
and revision. Duplicate IDs cannot apply twice. A stale proposal is rejected for
revalidation; it is not silently applied to newer state or sent back to a model
without a user action.

Commit all operations, definition/rule changes, migrations, and plugin artifacts
as one transaction or none. Preserve the prior revision if validation fails.
Store the accepted transaction for replay, including the exact rule/plugin
versions. Discussion text is not executable authority.

## Local applications and direct APIs

Support three integration paths against this contract: a local Cursor workflow,
a local Claude Code workflow, and direct API adapters with `.env` credentials.
Do not assume a specific installed application's CLI or protocol support before
verification. An initial explicit export/edit/import workflow can establish the
contract while automated transport is developed.

Local applications receive a staging workspace with a bounded context snapshot,
generated interface reference, proposal template, and world artifact copies.
They can edit proposed world files, including plugin source. Import verifies
the base revision, schemas, artifact hashes, and allowed paths. Committed saves
and the live engine repository are not writable through this workflow.

Enforce agent isolation with OS/process/filesystem restrictions, including child
tools. If an integration cannot enforce those restrictions, do not advertise it
as an isolated automatic workflow; keep transfer explicit until the boundary is
implemented. A working directory and agent instructions alone are insufficient.

The server alone loads direct API credentials from an ignored `.env`. Provide
an `.env.example` with names and placeholders during implementation. Local
applications may use their own configured authentication. Exclude secrets from
world files, agent context, plugin execution, exports, and logs.

Node.js versus Bun is a host tooling decision, separate from plugin isolation.
Select after testing adapter subprocesses, cancellation, sandbox integration,
and persistence behavior. Do not require a runtime switch just to choose a model.

## Sandboxed world plugins

Store plugins at `worlds/<id>/plugins/<plugin-id>/<version>/`, including a
manifest, source where applicable, and immutable executable artifact. Pin its
content hash in world revisions and replay records. No install scripts or
unrestricted dependency downloads run during gameplay.

The manifest declares engine ABI version, lifecycle hooks, execution phase,
readable fields, possible effects, plugin state schema, dependencies, and limits.
The host grants capabilities from a fixed supported set; the plugin cannot
expand them by editing its manifest.

Proposed hooks are initialize, evaluate-at-phase, and migrate-plugin-state.
Each receives serialized scoped state, tick context, and a deterministic random
source. Each returns proposed effects, structured events, and new plugin state.
No direct mutation of live state is permitted. The engine validates all output
through the same rules used for declarative effects.

Choose a restricted interpreter or metered runtime in an isolated host during
the feasibility spike. Requirements:

- No ambient filesystem, network, subprocesses, credentials, wall clock, or
  unseeded randomness. No imports of application internals.
- Bounded memory, input/output sizes, query counts, and computation. Use
  deterministic fuel/instruction limits; wall-clock timeout is an emergency
  abort, not a source of alternative simulated outcomes.
- Fixed numeric semantics and iteration order compatible with replay.
- Plugin state lives in snapshots, never in hidden runtime globals.
- Generic field/overlay metadata exposes results without executable UI code.

On plugin failure, abort the uncommitted tick and pause with diagnostics; do not
partially apply effects or silently skip the plugin and continue. Repair,
disablement, or rollback is an explicit world transaction. Disabling checks
dependencies and retained state. No automatic model repair request occurs.

## Required contract verification

Before enabling generated artifacts, verify adapter conformance, world/path
isolation, invalid output rejection, atomic commits, duplicate/stale handling,
crash recovery, migrations, plugin budget exhaustion, denied capabilities, and
identical hashes across replay. Hash application files before and after the
end-to-end flows to confirm they remain unchanged.

Acceptance scenarios include persistent rain causing downstream wash-off,
elevation redirecting flow, communication isolation affecting knowledge transfer
without blocking water, discussion with zero mutation, an honest unsupported
response, and a new mechanic supplied entirely by a sandboxed world plugin.

## Phase 5 environmental and movement contracts

Versioned optional built-in world models now include
[automatic neighbor relocation](automatic-migration.md) and
[airflow/pollution](air-pollution.md). Their dedicated operations, bounds, phase
ordering, conservation rules and read primitives are specified in those documents
and exported in the provider response schema. Both evolve without model calls.
Air-pollution damage remains unimplemented; air transport does not emit water pollution.

[Water quality and sanitation](water-quality.md) adds versioned activation, bounded
dissolved/surface pools, actual runoff transport, settlement waste, sanitation
capacity/condition and a farm-output multiplier. Custom reads are available for
load, concentration and plant condition; outputs remain dedicated validated
operations. No air-to-water deposition is implemented.

[Health and recovery](disease.md) adds separately activated `health-state-v1`,
`disease-configure`, `disease-introduce` and `disease-treat`. It reads water quality
for resident exposure, tracks health through all population changes and removes
ill people from available farm labor. `disease-contact-configure` separately
activates daily contact spread with a bounded rate, frozen presence snapshots
and location/journey attribution. It shares the health version and requires world
prompt scope. Existing health saves do not gain contact spread automatically.

[Local research](technology.md) adds optional `local-research-v1`, immutable world
technologies and tile archives. `technology-configure`/`technology-define` require
world prompt scope and current technology versions; `research-assign`,
`research-pause` and `research-auto` act locally. Automatic worker allocation is
deterministic, disjoint from farm labor, and completes effects on the next day.

`knowledge-configure` separately enables `neighbor-knowledge-v1`, shares the
technology version and requires world scope. Both adjacent endpoints must allow
communication. Prior-day completed archives improve local research efficiency;
reports attribute bonus work to one source. No same-day relay or teacher labor
is modeled. See [knowledge exchange](technology.md#implemented-5g2-adjacent-knowledge-exchange).
