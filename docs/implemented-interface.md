# Implemented world interface (engine 0.3.0, save schema 3)

This describes the running code. [world-interface.md](world-interface.md) remains
the broader target; it is not a claim that all its capabilities exist yet.

## State and rules

The executable schemas are in `packages/contracts/src/index.ts`. A world has a
seed, fixed topology, per-cell surface areas, tiles, rainfall/temperature rules, accepted
proposal history, recent events, revision, and integer water accounting.

Units: elevation in metres; rainfall in mm/day; stored water in litres; sediment
in kg. One litre per square metre equals one millimetre. Worlds currently use a
100 km radius. Climate and hydrology are gameplay approximations. Runoff retains
20 mm locally then transfers half the excess to lower neighbors by height
weight, simultaneously. Water reaching ocean tiles is an explicit accounting
sink. Existing sediment travels with water; erosion does not yet create it.

Built-in operation kinds are shown below (temperature has two modes). Phase 4a
also adds [custom property/rule operations](world-extensibility.md).

```json
{
  "id": "request-unique-id",
  "worldId": "first-world",
  "expectedRevision": 0,
  "summary": "Increase rainfall on zone 24",
  "operations": [
    { "kind": "rainfall", "tileId": 24, "mmPerDay": 80 },
    { "kind": "elevation", "tileId": 24, "deltaM": 100 },
    { "kind": "communication", "tileId": 24, "enabled": false },
    { "kind": "temperature", "tileId": 24, "celsius": 150, "mode": "pulse" }
  ]
}
```

Rainfall is a recurring absolute override (0–500 mm/day). Elevation is a one-time
integer delta (−2,000 to +2,000 m), within total terrain bounds of ±5,000 m.
Communication currently persists a flag; knowledge transfer is not implemented.
Unknown operations and additional properties are rejected. Every transaction is
atomic, revision-checked, and rejected if its ID has already been applied.

## Temperature

`temperature` sets an absolute Celsius target (−100 to 200, decimals allowed):

- `mode: "pulse"` changes the temperature immediately, removes any existing
  sustained temperature rule, and lets introduced heat/cold spread and fade.
- `mode: "sustained"` also saves `temperature-<tileId>` and holds the target each
  simulated day, continually influencing neighbors.
- `{ "kind": "temperature-reset", "tileId": 24 }` removes that sustained source;
  the current temperature is unchanged until normal simulation resumes.

Rainfall and temperature rules coexist. A combined elevation/temperature proposal
anchors its absolute temperature to the final elevation, regardless of operation
order. Each tile tracks `temperatureC` and optional `temperatureAnomalyC`: introduced
heat/cold relative to the seasonal/elevation climate. Old saves omit the anomaly
and load as zero without rewriting their checksum. The field is populated on ticks
or temperature edits. Schema-1 saves are now migrated into schema 3 with empty extension state; see
[save migration](world-extensibility.md#persistence-and-migration).

Every day, each neighboring pair exchanges anomaly from a simultaneous snapshot:
`0.2 × min(areaA, areaB) / max(degreeA, degreeB) × (anomalyA − anomalyB)`.
Divide that exchanged quantity by each tile's area to obtain its temperature delta.
Mixing is bounded to 20% per tile per day and conserves area-weighted anomaly before
rounding. The remaining anomaly dissipates by 10% toward local climate, then rounds
to 0.001 °C. Sustained sources replenish themselves to their exact target. Influence
travels at most one graph edge per day and crosses land/ocean, elevation differences,
and communication boundaries. Natural climate differences themselves do not diffuse.

Temperature feeds evaporation (whole mm/day, increasing at 12 °C intervals, limited
by available water). Land vegetation loses 0.005/day above 45 °C; below or at 0 °C
it cannot grow. Existing flood/dryness behavior still applies. This is gameplay
heat transport, not asteroid physics, thermodynamics, ice/melting, steam, or fire.

The inspector tracks current temperature, anomaly, and sustained settings. The
Temperature overlay distinguishes extreme heat/cold, and the five-day preview
compares temperature, water, and vegetation with an unchanged-world baseline for
the directly edited tiles and their immediate neighbors. Later spread is visible
by advancing the world and inspecting other zones.

## World extensibility

Custom numeric properties and bounded declarative rules are implemented in
[Phase 4a](world-extensibility.md). Models need explicit `world` scope to change
definitions; rule changes must fit both their old and new target scopes.

Stock resources, exact adjacent transfers, recurring sharing rules, formula clamps,
and daily accounting are documented in [resource transfers](resource-transfers.md).

## HTTP

The server binds to `0.0.0.0` (default port 5180), rejects foreign browser origins,
and expects JSON POST bodies. Access it using the server IP or hostname; additional
DNS names can be listed in `ALLOWED_HOSTS`. `HOST` overrides the bind address.
This is a trusted-home-network deployment without user login. GET `/api/session` returns a session bearer token;
all other API routes require `Authorization: Bearer <token>`.

| Route | Behavior |
| --- | --- |
| GET `/api/world` | Full active world. |
| GET `/api/worlds` | Local saved-world summaries. |
| POST `/api/worlds/create` | `{id, name, seed, frequency?}`; refuses overwrite. |
| POST `/api/worlds/open` | `{id}`; loads a saved world. |
| POST `/api/step` | `{expectedRevision, days?}`; 1–10 days, default 1. |
| POST `/api/proposals/preview` | Proposal envelope; five-day copied-state forecast. |
| POST `/api/proposals/apply` | Proposal envelope; commits without advancing time. |
| GET `/api/prompts/config` | Provider name, capabilities, timeout. |
| GET `/api/prompts/history` | Latest 40 conversation records for the active world. |
| GET `/api/prompts/jobs/:id` | Request status and validated response. |
| POST `/api/prompts` | Explicit Discuss/Propose request; returns 202 with a job. |
| POST `/api/prompts/cancel` | `{id}`; cancels the active request. |
| POST `/api/prompts/export` | Prompt request; exports scoped context without a model call. |
| POST `/api/prompts/import` | `{requestId, reply}`; validates an external response. |

The browser sends one step at a time while playing and visible. There is no
server simulation timer, offline catch-up, or autonomous agent. Model calls occur
only on explicit prompt requests. An active request blocks world mutations and
world switching until cancellation or completion; polling never calls a model.
A tick already accepted when a tab closes may finish and save. Reopening starts
paused. Multiple tabs share one active world; stale commands are rejected.

## Saves and current limitations

`worlds/<id>/state.json` is a checksummed self-contained save, replaced atomically
with file/directory sync. It contains definitions currently represented by the
schemas, state, rainfall/temperature rules, custom definitions/rules, and accepted transactions. The expanded directory
layout, append-only journal, checkpoint history, general artifact migrations, and plugin artifacts
are future milestones. Run one server/writer against a world directory; do not
run the CLI against a world being edited by the server.

Local Claude Code and optional Anthropic API adapters implement the
[prompt workflow](prompt-workflow.md). Conversations are separate atomic JSON
records at `worlds/<id>/conversations/<requestId>.json`. These are not an event
journal. Executable world plugins remain pending. External agents receive scoped
JSON packets and return responses for validation; they do not need repository access.

Appearance has a catalog and tile-top UVs for hexagons and pentagons. Image IDs
are reserved after birth but the renderer still uses colors for every tile.
Actual image packs, texture loading/compositing, and settlements remain pending.
