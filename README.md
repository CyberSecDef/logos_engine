# Logos Engine

A local, single-player fantasy world simulation. Shape tangible tile state and
rules, then watch the consequences unfold. No endgame and no offline progression.

## Development status

The deterministic engine foundation is implemented. The web globe and model
adapters are being developed. See [DEVELOPMENT.md](DEVELOPMENT.md) for current
work, completed milestones, verification, and known limitations.

## Run the engine

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm test
npm run world -- create my-world amber
npm run world -- step my-world 10
npm run world -- inspect my-world
```

World saves live in `worlds/<id>/state.json` and are excluded from Git. This first
version supports deterministic weather/runoff, vegetation response, explicit
rainfall rules, elevation edits, and communication flags. It does not yet include
trade, war, technology, model adapters, or executable world plugins.

See [PLAN.md](PLAN.md) and the proposed [world interface](docs/world-interface.md)
for the broader design. Source adapted from `globe.trackr.live` retains its MIT
license; no Earth imagery or live data feeds are required.
