# Logos Engine

A local, single-player fantasy world simulation. Shape a place, then watch its
consequences travel across a rotating hex-tiled globe. No endgame and no offline
progression.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5180**. For a production build:

```sh
npm run build
npm start
```

Select a tile, inspect its conditions, preview a rainfall/elevation/communication
change, then Apply. Use **+1 day** or **Let time flow** to observe consequences.
Drag to orbit, scroll to zoom; when the globe has keyboard focus, use left/right
arrows to select tiles. The Worlds panel creates and opens seeded worlds.

The game starts paused, pauses when its tab is hidden, and never catches up on
offline time. Saves are automatic under `worlds/<id>/state.json` and excluded
from Git. Run only one writer per world directory. Optional `.env` can set `PORT`;
no provider credentials are needed for this milestone.

## What works now

- Seeded fictional globe with stable tiles, terrain relief, picking, and overlays.
- Deterministic daily weather, evaporation, runoff, sediment transport, and
  vegetation response, with explicit water accounting.
- Validated creator transactions, five-day previews, saved rules, and reload.
- Responsive inspector, time controls, world creation, and appearance/UV foundation.

**Still planned:** LLM discussion and proposals, Cursor/Claude Code workflows,
API adapters, texture images, sandboxed world plugins, richer erosion, trade,
population, conflict, and technology. The communication flag is persisted but
knowledge exchange is not simulated yet. This is an early playable foundation.

## Verify and use the CLI

```sh
npm run check          # types, engine/integration tests, production build
npm run test:browser   # Chromium: select, preview, apply, step, reload, layouts
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
