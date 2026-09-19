# Implemented world interface (v0.1)

This describes the running code. [world-interface.md](world-interface.md) remains
the broader target; it is not a claim that all its capabilities exist yet.

## State and rules

The executable schemas are in `packages/contracts/src/index.ts`. A world has a
seed, fixed topology, per-cell surface areas, tiles, rainfall rules, accepted
proposal history, recent events, revision, and integer water accounting.

Units: elevation in metres; rainfall in mm/day; stored water in litres; sediment
in kg. One litre per square metre equals one millimetre. Worlds currently use a
100 km radius. Climate and hydrology are gameplay approximations. Runoff retains
20 mm locally then transfers half the excess to lower neighbors by height
weight, simultaneously. Water reaching ocean tiles is an explicit accounting
sink. Existing sediment travels with water; erosion does not yet create it.

Three operation types are accepted:

```json
{
  "id": "request-unique-id",
  "worldId": "first-world",
  "expectedRevision": 0,
  "summary": "Increase rainfall on zone 24",
  "operations": [
    { "kind": "rainfall", "tileId": 24, "mmPerDay": 80 },
    { "kind": "elevation", "tileId": 24, "deltaM": 100 },
    { "kind": "communication", "tileId": 24, "enabled": false }
  ]
}
```

Rainfall is a recurring absolute override (0–500 mm/day). Elevation is a one-time
integer delta (−2,000 to +2,000 m), within total terrain bounds of ±5,000 m.
Communication currently persists a flag; knowledge transfer is not implemented.
Unknown operations and additional properties are rejected. Every transaction is
atomic, revision-checked, and rejected if its ID has already been applied.

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

The browser sends one step at a time while playing and visible. There is no
server simulation timer, offline catch-up, model call, or autonomous agent.
A tick already accepted when a tab closes may finish and save. Reopening starts
paused. Multiple tabs share one active world; stale commands are rejected.

## Saves and current limitations

`worlds/<id>/state.json` is a checksummed self-contained save, replaced atomically
with file/directory sync. It contains definitions currently represented by the
schemas, state, rainfall rules, and accepted transactions. The expanded directory
layout, append-only journal, checkpoint history, migrations, and plugin artifacts
are future milestones. Run one server/writer against a world directory; do not
run the CLI against a world being edited by the server.

There are no model adapters or executable plugins yet. Do not point a local
coding agent at the live engine repository as a gameplay integration. The future
staged interface must be implemented before advertising isolated agent edits.

Appearance has a catalog and tile-top UVs for hexagons and pentagons. Image IDs
are reserved after birth but the renderer still uses colors for every tile.
Actual image packs, texture loading/compositing, and settlements remain pending.
