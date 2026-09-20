# World-specific appearance rules

World data can now select terrain labels, colors and existing artwork from observable
conditions. A custom property or plugin output can visibly change its region without
editing the engine. These rules are cosmetic: they do not create forests, cities,
resources or physical effects.

## Try crystal terrain

After adding the crystal-bloom example, select **Entire world** and propose:

> When land has at least five crystal shards, call it Crystal grove, use a violet
> base color #a18ae0 and the existing alpine artwork. Otherwise use normal terrain.
> This is only an appearance rule; keep crystal production unchanged.

[crystal-appearance.json](examples/crystal-appearance.json) contains the full
proposal. Adapt the world ID, revision, origin and definition version as needed.
The `crystal` property must already exist or be defined earlier in the transaction.
The installed alpine image depicts rock, not newly generated crystal artwork.

Review lists conditions, scope, priority, color and artwork. **Appearance on Apply**
shows up to 24 immediate before/after changes and the total changed count in the
proposal's affected scope. Artwork selection is shown even for unrevealed tiles;
this does not imply their images reveal immediately. The regular five-day forecast
still reports physical/resource consequences. Inspector notes show applicable
appearance rules and which one currently wins.

## Contract

`world.definitions.appearance` is an optional array of at most 32 rules. Existing
saves without it retain their original serialization and appearance.

- `appearance-define`: `tileId` and `rule`; creates or replaces a versioned rule.
- `appearance-remove`: `tileId` and `ruleId`; removes a rule at its original origin.

A rule contains `id`, `version`, `label`, `tileId`, `scope`, `enabled`, `priority`,
`conditions`, and `style`. Versions start at 1 and increment exactly by one,
including recreation after removal. An update cannot move its origin. Tile,
neighbor (origin plus adjacent tiles), and world scopes follow prompt authority;
updates/removals also check the old scope. Global changes need Entire world scope.
There is a 100,000 enabled rule-target evaluation budget.

Conditions use the existing bounded numeric read/comparison format: all must match.
Reads include physical fields and custom properties, with self or neighbor
average/min/max sampling. Empty conditions always match. Add an elevation condition
when a style should apply only on land; world rules can otherwise cover oceans.
All referenced custom properties must exist, even in disabled rules. Removing a
referenced property requires removing or updating its appearance rules. Property
unit conversions require explicit coordinated appearance-rule updates too.

The highest-priority matching enabled rule wins (priority 0–100); equal priorities
use ascending rule ID. If none matches, the ordinary terrain catalog applies.
There is no hidden visual history or hysteresis: crossing a threshold changes the
style immediately, including changing back when the condition stops matching.

`style` contains:

- `label`: a plain-text terrain name, at most 60 characters.
- `color`: a six-digit hexadecimal color such as `#a18ae0`.
- `asset`: `none`, `ocean`, `city`, `alpine`, `forest`, `meadow`, or `dry`.

`none` displays solid color. Otherwise color is visible before texture reveal,
with Colors only selected, or as an image-loading fallback. The existing image
replaces that color as it reveals; this is not an image tint or layered composition.
URLs, file paths, shader code and generated images are not accepted.

World birth stays color-only. The existing 1,000-day staggered reveal continues;
an applied operation reveals its origin immediately, not every tile covered by a
world rule. Rain, temperature, water, communication and custom-property overlays
retain their data colors. Rendering never consumes simulation randomness or calls
an LLM. Definitions and accepted changes travel in checkpoints, branches and exports.
Older builds without the appearance contract cannot load saves containing these rules.

World-local external image bundles, layered artwork and richer terrain transitions
remain future work.
