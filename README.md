# Logos Engine

A local, single-player fantasy world simulation. Shape a place, then watch its
consequences travel across a rotating hex-tiled globe. No endgame and no offline
progression.

## Run

Requires Node.js 22.12+ and npm. See [home-server operation and recovery](docs/local-operation.md)
for updates, complete backups, restoration and startup/provider troubleshooting.

```sh
npm ci
npm run build
npm start
```

The server binds to **0.0.0.0:5180**. From another machine, open
**http://<server-ip>:5180** using the Network URL printed at startup. On the server
itself, http://localhost:5180 also works. This serves the built application
without a development dependency cache. While editing application code, use:

```sh
npm run dev
```

Development/test servers use separate temporary Vite dependency caches, cleaned
up when each server stops.

Select a tile, inspect its conditions, preview a rainfall/elevation/temperature/communication
change, then Apply. Use **+1 day** or **Let time flow** to observe consequences.
Drag to orbit, scroll to zoom; when the globe has keyboard focus, use left/right
arrows to select tiles. The Worlds panel creates and opens seeded worlds, saves/restores checkpoints,
and branches or imports/exports independent copies.

The game starts paused, pauses when its tab is hidden, and never catches up on
offline time. Saves are automatic under `worlds/<id>/state.json` and excluded
from Git. Run only one writer per world directory. Optional `.env` can set `HOST` (default `0.0.0.0`) and `PORT`;
no provider credentials are needed for simulation or manual creator controls. For a custom DNS name,
set `ALLOWED_HOSTS=logos.example.lan`. Network access is intended for your trusted
home network; this milestone has no user login.

## What works now

- Seeded fictional globe with stable tiles, terrain relief, picking, and overlays.
- Deterministic daily weather, evaporation, runoff, sediment transport, and
  vegetation response, with explicit water accounting.
- Read-only [next-day water budgets](docs/water-transport.md), with exact neighbor
  runoff routes, sediment transfers and visible sources/sinks.
- One-time or sustained heat/cold, deterministic neighbor influence, evaporation
  and vegetation effects, temperature overlay and inspector tracking.
- Validated creator transactions, five-day previews, saved rules, and reload.
- Responsive inspector, time controls, world creation, and appearance/UV foundation.
- Local Claude Code, Cursor and Codex conversations: Discuss, Propose, review, Apply; cancellation
  and saved history; scoped JSON exchange; optional Anthropic API adapter.
- Versioned custom numeric properties and weather-driven declarative rules, with
  generic inspectors/overlays and safe migration of existing worlds. See the
  [soil-fertility walkthrough](docs/world-extensibility.md).
- Conserved adjacent stock-resource sharing, capacity limits, formula clamps,
  and daily resource accounting. Try [mana sharing](docs/resource-transfers.md).

- Named checkpoints, ten rolling automatic checkpoints at 100-day intervals,
  reviewed restore with a backup, world branching, and portable JSON import/export.
  See [checkpoints and branches](docs/world-checkpoints.md).

- Restricted world plugins with saved per-tile state, deterministic instruction
  limits, reviewed installation, and failure recovery. Try
  [crystal bloom](docs/world-plugins.md).

- Painterly terrain images, gradually revealed over 1,000 simulated days, with
  immediate reveal on applied tile actions and a Colors only option. See
  [terrain artwork](docs/terrain-artwork.md).

- Reviewed [world-local PNG artwork packs](docs/world-artwork-packs.md), with pinned
  versions, local image storage and checkpoint/branch preservation.

- Portable bundles include committed replay history and required artwork; imported
  source histories remain inspectable in independent worlds.
- World-defined entity types and instances participate in rules and restricted
  plugins, with explicit migrations and generic inspection.
- Selective replay can omit or replace an intervention, review consequences,
  and create a separate branch with its own verified history.

All five [Phase 4 items](docs/phase-4-completion.md) are complete. See the
[final acceptance matrix](docs/phase-4-acceptance.md) for live provider checks,
compatibility evidence and limits.

Phase 5 is complete within the [agreed simulation scope](docs/phase-5-plan.md).
See the [final acceptance matrix](docs/phase-5-acceptance.md) for reproducible
long-run, balance, scale, restart and browser checks.

[Phase 6](docs/phase-6-plan.md) is complete within its documented scope: desktop-first accessibility and polish,
usable mobile layouts, measured performance improvements and local operation.
The [Phase 6 acceptance report](docs/phase-6-acceptance.md) documents repeatable
checks and browser/accessibility limits.

Creator-placed [settlements](docs/settlements.md) now track food reserves, weather-limited
harvest, shortage losses and gradual growth, with reviewed prompts and overlays.
[Soil ecology](docs/soil-ecology.md) connects fertility to harvest, weather, farmer
stewardship and urban soil/vegetation loss through reviewed world activation.
[Neighbor food sharing](docs/food-sharing.md) moves surplus between settlements
with protected reserves, daily limits and independent local permissions.
[Named resource routes](docs/resource-routes.md) carry custom stocks between adjacent
land zones with reserves, destination targets, schedules and travel permissions.
[Migration journeys](docs/journeys.md) carry inhabitants, food and optional cargo
over timed land paths, with waiting, shortage accounting and reviewed recovery.
[Automatic relocation](docs/automatic-migration.md) lets residents leave for better
food or housing without individual player approval.
[Air pollution](docs/air-pollution.md) adds seeded winds, pulses, recurring emissions,
cleanup and conserved transport, with inspector budgets and air/wind overlays.
Air currently has no damage effects.
[Water quality and sanitation](docs/water-quality.md) follows real runoff, keeps
dry deposits, tracks settlement waste/treatment and reduces farming when standing
water is contaminated. Activate it through its reviewed inspector control.
[Health and recovery](docs/disease.md) separately enables illness, temporary immunity,
water-caused cases and lost farm labor, with health carried by travelers.
Separately activated contact spread connects local mixing, routine visits and
arrivals, with new cases attributed to their exposure location.

[Automatic research](docs/technology.md) lets settlements spend healthy resident
worker-days on local technologies. Improved cultivation boosts farming after
completion. Separately enabled neighboring knowledge exchange accelerates local
research through open communication channels. Filtration improves installed
sanitation plants; prerequisite chains and read-only knowledge inputs support
world-defined progression and custom rules.

[Factions and territory](docs/factions.md) lets the creator establish named factions,
assign land and record relationships, with a territory overlay. Optional hostile
border rules independently restrict travel, trade and knowledge exchange.
Local resident garrisons reserve healthy labor while retaining normal meals and
health accounting. Healthy troops can travel with supplies to reinforce their
faction’s settlements through friendly land. Explicit conflict rules enable supplied
attacks between hostile neighbors, bounded combatant losses, capture and returns.
Civilians and infrastructure survive capture; conflict starts only after activation.

**Still planned:** richer erosion, broader trade and movement,
conflict, and broader technology effects. This is an early playable foundation.

## Verify and use the CLI

For prompts, install Claude Code and Linux `bubblewrap`, and run `claude auth login`
as the user running the server. Select a tile → **Talk about this place**. Discuss
changes nothing; Propose creates a change to review before Apply. Time stays paused
while the conversation is open. See [prompt setup and exchange](docs/prompt-workflow.md)
for `.env` configuration, isolation details, and Cursor/manual workflows.

```sh
npm run check          # types, engine/integration tests, production build
npm run test:phase6    # complete Phase 6 checks; install Chromium and WebKit first
npm run test:browser   # Chromium: select, preview, apply, step, reload, layouts
npm run test:dev-cache # Concurrent development servers and stylesheet fallback
npm run test:prompts   # Prompt UI with a simulated provider; no model charges
npm run test:extensions # Custom properties/rules through the browser
npm run test:resources  # Mana transfers, stock totals, and daily balance
npm run test:checkpoints # Checkpoint/restore, branches, portable worlds
npm run test:plugins    # Stateful plugin proposal, execution, pause/resume
npm run test:textures   # GPU textures, reveal policy, overlays, fallbacks
npm run world -- create my-world amber
npm run world -- step my-world 10
npm run world -- inspect my-world
```

Browser tests need Chromium: `npx playwright install chromium`. They use an
isolated temporary save directory, not your worlds. Do not use the CLI to modify
a world while the game server is using it.

## Development

[DEVELOPMENT.md](DEVELOPMENT.md) tracks completed work, current tasks, tests, and
remaining milestones. See [PLAN.md](PLAN.md), the proposed
[world interface](docs/world-interface.md), and the narrower
[implemented interface](docs/implemented-interface.md).

The globe rendering and topology adapt MIT-licensed code from
`globe.trackr.live`. No Earth
imagery or live feeds are required. See [LICENSE](LICENSE).

World artwork supports two ordered transparent layers above terrain, selected by
reviewed appearance rules. For example, ask to keep forest terrain and overlay
city artwork at 35% opacity. See [artwork packs and composition](docs/world-artwork-packs.md).

Complete [portable bundles](docs/portable-worlds.md) preserve world artwork and
original replay histories when importing into an independent world.

[World-defined entities](docs/world-entities.md) support named objects on tiles,
properties, reviewed migrations, and deterministic rule/plugin interactions.

[Selective replay](docs/selective-replay.md) lets you omit or replace a recorded
intervention, review the consequences, and create an independent alternate world.

[Everyday neighbor travel](docs/neighbor-visits.md) adds automatic same-day food
collection, farm work and exploration. New web-created worlds enable it by default;
existing worlds can enable it under **Everyday neighbor travel**. Each trip runs
without player approval or a model call, respects travel closures and returns home.


Use **Go to zone number** at the top of the inspector to revisit a place directly.
Neighbor buttons move to adjacent zones. With the globe focused, left/right arrows
select zone IDs and Enter opens the inspector; **Return to globe** moves focus back.
These navigation actions center the selected zone and pause rotation without
changing the world. **Resume rotation** starts the globe turning again.


The inspector's **Jump to section** menu opens an existing expandable section
without closing the others. On phones, **Globe**, **Map layers**, and **Zone details**
show one view at a time. With the globe focused, **+ / −** zoom and **Home** resets
zoom; the map-layer panel also has zoom buttons. These controls only change the view.
