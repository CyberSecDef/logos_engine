# Logos Engine

A local, single-player fantasy world simulation. Shape a place, then watch its
consequences travel across a rotating hex-tiled globe. No endgame and no offline
progression.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
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
arrows to select tiles. The Worlds panel creates and opens seeded worlds.

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
- One-time or sustained heat/cold, deterministic neighbor influence, evaporation
  and vegetation effects, temperature overlay and inspector tracking.
- Validated creator transactions, five-day previews, saved rules, and reload.
- Responsive inspector, time controls, world creation, and appearance/UV foundation.
- Local Claude Code conversations: Discuss, Propose, review, Apply; cancellation
  and saved history; scoped JSON exchange; optional Anthropic API adapter.
- Versioned custom numeric properties and weather-driven declarative rules, with
  generic inspectors/overlays and safe migration of existing worlds. See the
  [soil-fertility walkthrough](docs/world-extensibility.md).

**Still planned:** automatic Cursor CLI launching, texture images, sandboxed world plugins, richer erosion, trade,
population, conflict, and technology. The communication flag is persisted but
knowledge exchange is not simulated yet. This is an early playable foundation.

## Verify and use the CLI

For prompts, install Claude Code and Linux `bubblewrap`, and run `claude auth login`
as the user running the server. Select a tile → **Talk about this place**. Discuss
changes nothing; Propose creates a change to review before Apply. Time stays paused
while the conversation is open. See [prompt setup and exchange](docs/prompt-workflow.md)
for `.env` configuration, isolation details, and Cursor/manual workflows.

```sh
npm run check          # types, engine/integration tests, production build
npm run test:browser   # Chromium: select, preview, apply, step, reload, layouts
npm run test:dev-cache # Concurrent development servers and stylesheet fallback
npm run test:prompts   # Prompt UI with a simulated provider; no model charges
npm run test:extensions # Custom properties/rules through the browser
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
