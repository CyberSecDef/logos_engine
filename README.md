# Logos Engine

A local, single-player fantasy world simulation. Be the world creator: reshape
terrain, establish settlements, change tangible rules, and watch the consequences
spread across a slowly rotating hex-tiled globe. There is no endgame and no
offline progression.

The simulation runs deterministically without a language model. Models are called
only when you ask to discuss or propose a change. Reviewed, validated operations
change the active world's data; models cannot edit the engine during gameplay.

**Current state:** the six planned development phases are complete within their
[documented scope](DEVELOPMENT.md). The game includes environment, settlements,
movement, pollution, disease, technology, factions and conflict; extensible world
rules; prompt-driven creator tools; and desktop-first browser controls. Recent
visual updates add textured beveled tile sides, 3% body spacing, and 20 additional
painterly terrain images. This remains an evolving creator sandbox with the
limits described below.

## Run locally or on your home network

Requires **Node.js 22.12+ and npm**.

```sh
npm ci
npm run build
npm start
```

The server binds to **0.0.0.0:5180**. From another machine, open
**http://<server-ip>:5180** using the Network URL printed at startup. On the server,
http://localhost:5180 also works. `npm start` serves the built application. For
application development, use `npm run dev`; development/test servers have separate
temporary Vite dependency caches, cleaned up when each server stops.

Optional server-side `.env` settings are documented in [.env.example](.env.example).
`HOST` and `PORT` control the listener; `ALLOWED_HOSTS=logos.example.lan` permits a
custom DNS name. IP addresses work by default. Restart after configuration changes.
No provider credentials are required for simulation or manual creator controls.
This is a trusted-home-network application with no user login or multiplayer.

Saves are automatic under `worlds/<id>/` and excluded from Git. Run only one writer
per world directory. See [local operation and recovery](docs/local-operation.md)
for complete backups, restoration, updates and startup troubleshooting.

## Play

1. Open or create a seeded world in **Worlds**. Worlds start paused and newly born
   terrain starts as colored tiles.
2. Select a zone to inspect its conditions. Use direct creator controls or
   **Talk about this place** to discuss an idea or propose a change.
3. Review the operations and forecast before **Apply**. Discussion, preview and
   cancellation do not change the saved world.
4. Use **+1 day** or **Let time flow** to watch deterministic consequences unfold.
   Time pauses when the tab is hidden; there is no offline catch-up.

Drag to orbit and scroll to zoom. With the globe focused, left/right arrows select
zones, Enter opens the inspector, **+ / −** zoom and **Home** resets zoom. Use
**Go to zone number** or neighbor buttons to revisit a place. Navigation centers
the selected zone and pauses rotation; **Resume rotation** starts it again.

The inspector keeps expandable sections with a **Jump to section** menu. Mobile
layouts provide **Globe**, **Map layers**, and **Zone details** views. Map overlays
show physical conditions, population, food, health, territory and custom fields.

## What the world simulates

Many systems require explicit world activation or creator placement. Existing
worlds are not silently given settlements, factions or conflict.

| System | Current behavior |
| --- | --- |
| Weather, water and terrain | Deterministic weather, evaporation, runoff, sediment transport and vegetation response. [Water budgets](docs/water-transport.md) expose neighbor routes and sources/sinks. |
| Temperature | One-time heat/cold events or sustained settings influence neighbors, evaporation and vegetation. |
| Settlements and farming | Creator-placed inhabitants, daily food reserves, worker- and weather-limited harvest, shortage losses and slow growth. [Soil fertility](docs/soil-ecology.md) responds to rain, temperature, farmer stewardship and urban pressure. [Settlement guide](docs/settlements.md). |
| Trade and resources | [Neighbor food sharing](docs/food-sharing.md), conserved [custom resource transfers](docs/resource-transfers.md), and scheduled [land resource routes](docs/resource-routes.md), with reserves, capacities and permissions. |
| Travel and migration | Automatic same-day [neighbor visits](docs/neighbor-visits.md) for food, farm work and exploration; timed [migration journeys](docs/journeys.md) with inhabitants, food and cargo; optional [automatic relocation](docs/automatic-migration.md) toward better food and housing. Travel closures are respected. |
| Air pollution | Seeded winds, pulses, recurring emissions, cleanup and conserved [air transport](docs/air-pollution.md), with budgets and overlays. Air pollution currently causes no damage. |
| Water quality | Runoff-carried contamination, dry deposits, settlement waste and sanitation. [Contaminated standing water](docs/water-quality.md) reduces farming; sanitation needs capacity and maintenance. |
| Disease | Optional [illness and recovery](docs/disease.md), temporary immunity, lost farm labor, polluted-water cases and contact spread through local mixing, visits and arrivals. Travelers carry health state. No direct disease deaths. |
| Technology | Settlements automatically choose [research](docs/technology.md), spending healthy worker-days. Cultivation improves farming; filtration improves existing treatment plants. Neighbor knowledge accelerates research through open communication channels; prerequisites support progression. |
| Factions and conflict | Creator-established [factions and territory](docs/factions.md), relationships, independent hostile border policies, resident garrisons and supplied reinforcements. Explicitly enabled conflict permits hostile neighbor attacks, combatant losses, capture and returns; civilians and buildings survive capture. |

Routine neighbor visits are enabled by default in new web-created worlds; existing
worlds can activate them in the inspector. Simulation, visits, research, conflict,
forecasts and replay never trigger autonomous model calls.

## Prompt providers

Select a tile → **Talk about this place**. **Discuss** explores consequences;
**Propose change** returns operations to review and explicitly apply. Unsupported
requests can receive an explanation instead of a proposal. Time remains paused
while the conversation is open; conversations and applied changes are saved.

| Provider | Configuration and prerequisites |
| --- | --- |
| Local Claude Code (default) | `LLM_PROVIDER=claude-code`; installed native CLI and existing login (`claude auth login`). Linux and `bubblewrap` required. |
| Local Cursor CLI | `LLM_PROVIDER=cursor`; supported CLI version and browser login, or optional server-side `CURSOR_API_KEY`. Linux and `bubblewrap` required. |
| Local Codex CLI / OpenAI models | `LLM_PROVIDER=codex`; supported native CLI and existing ChatGPT login, or server-side `CODEX_API_KEY`. Linux and `bubblewrap` required. |
| Anthropic API | `LLM_PROVIDER=anthropic`; server-side `ANTHROPIC_API_KEY` and model configuration. No local CLI or sandbox required. |

See [prompt setup and exchange](docs/prompt-workflow.md) for exact supported CLI
versions, model overrides, isolation boundaries, authentication and manual JSON
exchange. Credentials stay in the server environment/native credential stores,
not browser code or world files. OpenAI access currently uses the Codex adapter;
there is no separate direct OpenAI HTTP adapter.

## World extensibility and history

The engine exposes a bounded, documented interface rather than arbitrary model
execution. World-specific mechanics can use:

- [Versioned numeric properties and declarative rules](docs/world-extensibility.md),
  with migrations, inspectors and overlays. Try the soil-fertility example.
- [Conserved stock transfers](docs/resource-transfers.md), including mana sharing.
- [Restricted JSON plugins](docs/world-plugins.md), with arithmetic, conditions,
  saved per-tile state, instruction limits and failure recovery. Try crystal bloom.
- [World-defined entities](docs/world-entities.md) and reviewed migrations.
- [Conditional appearance rules](docs/world-appearance.md), world-local artwork
  replacements and layered images.

The Worlds panel supports named checkpoints, ten rolling automatic checkpoints at
100-day intervals, and reviewed restoration with a backup. [Branches and checkpoints](docs/world-checkpoints.md),
[portable bundles](docs/portable-worlds.md) and [selective replay](docs/selective-replay.md)
preserve independent worlds, committed history and required artwork. Selective
replay can omit or replace an intervention and review an alternate outcome.

Use the [implemented engine–world interface](docs/implemented-interface.md) as the
current contract. [The original interface proposal](docs/world-interface.md) and
[PLAN.md](PLAN.md) contain design history and are not implementation guarantees.

## Globe and artwork

Terrain images gradually fade in over the first **1,000 simulated days**; an applied
creator action reveals its targeted tile immediately. **Colors only** remains
available, and data overlays retain their own colors.

The built-in pack contains **26 images**: five appearances each for alpine, dry,
forest, meadow and ocean, plus the city image. Each biome keeps its original PNG
and adds `-2` through `-5`. Stable seed/tile/biome selection and quarter-turn
rotations create variety that persists across reloads and branches.

Textures cover the top, beveled rim and shaded sides of raised tiles. Tile bodies
are separated by **3% of the original tile width**. World-local replacements take
precedence over built-in variants; two ordered transparent layers can add
settlement or condition artwork above terrain.

See [terrain artwork](docs/terrain-artwork.md), [tile surfaces](docs/tile-surfaces.md),
and [world-local artwork packs](docs/world-artwork-packs.md). Generated assets,
[prompts](docs/terrain-variant-prompts.json) and provenance are committed locally;
no remote image service is needed during play. The full PNG library is about
74 MiB, so the first load is larger; browser cache reuse depends on available
cache capacity. The atlas uses about 42.7 MiB including mipmaps.

## Verification and current limits

The latest terrain-variant milestone passed **273 engine/server tests**, typecheck,
production build, Chromium artwork workflows and production WebKit raised-terrain
checks. Historical acceptance reports record the scope and evidence at each phase:
[Phase 4](docs/phase-4-acceptance.md), [Phase 5](docs/phase-5-acceptance.md),
[Phase 6](docs/phase-6-acceptance.md).

```sh
npm run check              # types, engine/server tests, production build
npx playwright install chromium webkit
npm run test:phase6        # consolidated Phase 6 acceptance workflows
npm run test:tile-surfaces # textured caps/bevels/walls and WebKit production view
npm run test:textures      # reveal, overlays, texture toggles and fallbacks
npm run test:artwork       # reviewed world-local artwork installation/reset
npm run test:layers        # transparent layer composition
npm run test:prompts       # prompt UI with a simulated provider
```

Browser tests use isolated temporary worlds. Additional focused checks are listed
in [package.json](package.json). Live-provider checks are separate and require
configured accounts; ordinary simulation and UI tests do not need model calls.

After building, the CLI can create, inspect or step worlds:

```sh
npm run world -- create my-world amber
npm run world -- inspect my-world
npm run world -- step my-world 10
```

Do not use the CLI to modify worlds while the game server is using them.

Current boundaries include land-based travel/routes, a bounded technology and
conflict model, pollution/health effects as described above, and restricted JSON
plugins rather than arbitrary JavaScript. Browser/accessibility checks do not
constitute a complete assistive-technology audit or WCAG certification. Larger
worlds and the expanded artwork library have higher CPU/GPU and memory costs;
see the [rendering measurements](docs/phase-6-render-performance.md).

## Development and credits

[DEVELOPMENT.md](DEVELOPMENT.md) is the living record of completed work, current
tasks, validation and remaining work. [PLAN.md](PLAN.md) preserves the original
product direction; the phase acceptance reports and implemented interface describe
what is available now.

The globe rendering and topology adapt MIT-licensed code from
`globe.trackr.live`. No Earth imagery or live feeds are required. See [LICENSE](LICENSE).
