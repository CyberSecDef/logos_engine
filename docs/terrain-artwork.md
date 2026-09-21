# Painterly terrain artwork

The built-in `painterly-v1` pack contains overhead forest canopy, meadow, dry
grassland, alpine rock, ocean, and fantasy settlement images. On the Terrain
layer, choose **Evolving artwork** or **Colors only**. That preference is stored
in your browser; it does not change the world. The inspector reports whether a
place's artwork is unrevealed, appearing, or revealed.

## Reveal behavior

An untouched world starts with colored tiles. A deterministic ordering, based on
the pack ID, world seed, and stable tile IDs, reveals small groups over the first
**1,000 simulated days**. Each place blends from its terrain color into its image
as its turn arrives. All tiles finish the scheduled reveal by day 1,000.

With the default 1,442-tile world, roughly one or two places appear per day; on a
smaller globe, each individual place fades in over a longer interval. This is a
visual presentation rule, not ecological growth or a new simulation mechanic.

A tile explicitly targeted by an **applied creator operation** reveals immediately,
including at day zero. Exact resource transfers reveal both endpoints. Defining a
world-wide field/rule/plugin reveals its operation's origin tile, not the whole
world. Selecting, discussing, previewing, or cancelling does not reveal a place.
Repeated edits update its image from its current terrain/population conditions.

Reveal progress is derived from the saved tick and applied transaction history.
Reload, branch, export/import, and restore therefore reproduce it without storing
extra simulation state or consuming random draws. Restoring an older state also
restores its corresponding reveal progress. Existing worlds gain the appropriate
reveal level from their current age and past actions when first opened with this
version. Nothing advances while the game is closed.

## What images represent

The catalog uses the existing terrain classification, evaluated in this order:

| Image | Condition |
| --- | --- |
| Ocean | Elevation ≤ 0 m |
| Settlement | Population ≥ 100 |
| Alpine | Elevation > 1,200 m |
| Forest | Vegetation > 0.6 |
| Meadow | Vegetation > 0.3 |
| Dry grassland | Remaining land |

A settlement texture is ready for populated worlds, but this milestone adds no
population growth, building placement, settlement creation, or new LLM operation.
Water/rain/temperature/communication/custom-property overlays always retain their
original data colors. The selection outline stays readable, and the same artwork covers the beveled rims and shaded sides. At distant zoom levels, texture detail fades back to color.

## Files and provenance

All six original generated PNGs are committed under
`packages/tile-packs/public/painterly-v1/`:

- `forest.png`, `meadow.png`, `dry.png`
- `alpine.png`, `ocean.png`, `city.png`

The pack's [manifest](../packages/tile-packs/public/painterly-v1/manifest.json)
contains ordered matching conditions, labels, fallback colors, and local image
URLs. The complete [generation prompts and provenance](../packages/tile-packs/public/painterly-v1/provenance.json)
record use of the built-in imagegen tool. No API/CLI fallback was used. Images were
generated for this project, inspected, and copied into the workspace without
editing. The repository's MIT license covers this contributed pack to the extent
applicable; the images do not incorporate third-party reference artwork.

Version 1 is a shared, fixed application pack. Its URLs are cached immutably in
production; publish changed artwork under a new version rather than replacing
these files. Portable worlds use the receiving application's bundled pack; they
can also pin world-local replacement packs and carry their image files in portable
bundles. Layered settlement/condition images are supported. Hysteresis around
biome thresholds remains future work.

## Rendering and extending the pack

The browser assembles 26 built-in images into one 4,096 × 2,048 sRGB atlas, with 32
512-pixel slots and 16-pixel extruded gutters. A tile uses a 480-pixel content area;
UVs stay half a texel inside it. Both hexagons and pentagons clip their top faces
naturally. Stable quarter-turn rotations reduce repetition. Shared geometry and a
single material avoid one draw call per tile. Mipmaps and bounded anisotropy support
zooming; atlas storage is approximately 42.7 MiB including mip levels.

The image downloads total about 74 MiB and are cached after first load.
A missing, invalid, or timed-out image leaves its tiles colored; the status text
reports fallback use. Loading assets never blocks stepping or calling the model.

Catalog conditions are data, not executable code: supported fields are elevation,
vegetation, population, temperature and rainfall; comparisons are lt/lte/gt/gte.
The first matching entry wins, so the unconditional fallback belongs last. Up to
32 images fit the atlas (26 built-in images plus up to two world-local layers). The pack is bundled at build time; catalog
changes require rebuilding the application, but no simulation-engine changes.
Models do not edit this shared application pack during gameplay.

Run `npm run test:textures`. It compares actual WebGL pixels for texture toggles
and overlays, checks day-zero action reveal and reload, exercises all six biomes,
and verifies desktop/mobile layouts, missing-image fallback, and unchanged world
hashes. Unit tests cover the reveal schedule, copies, assets and padded UVs.

World-specific [conditional appearance rules](world-appearance.md) can now select
existing artwork, labels and colors from physical or custom values.

[World-local PNG replacement packs](world-artwork-packs.md) can now be imported,
reviewed and pinned per world, including layered composition.

## Biome variations (2026-09-20)

Alpine, dry, forest, meadow and ocean each have their original image plus four
new variations, named `alpine-2.png` through `alpine-5.png`, and likewise for the
other four biomes. City keeps its existing image. The manifest lists variants
under their original biome, so world appearance rules still use the same six IDs.

A deterministic hash of pack ID, world seed, tile ID and biome chooses one of the
five images. Choices stay stable over time, reloads and branches. A biome change
selects that biome's variant; returning to the previous biome restores its choice.
No simulation state or random draws are involved. Birth colors, gradual reveal,
quarter-turn rotations, beveled sides and the 3% body gap continue to apply.

An installed world-local replacement overrides the entire matching biome,
including all its built-in variants. If a selected variant fails to load, the
renderer uses the original image when available, otherwise the terrain color.
World settlement/condition layers retain their own atlas slots and composition.

Generated with built-in imagegen using each original as a style reference. The
[complete 20-prompt set](terrain-variant-prompts.json) and
[asset provenance and hashes](../packages/tile-packs/public/painterly-v1/variant-provenance.json)
record the unmodified PNGs. These are visually similar but distinct arrangements;
seamless borders are requested in the prompts, not mechanically guaranteed.

The larger atlas preserves 480-pixel content resolution and gutters per image.
It increases initial downloads and GPU memory; images remain local and browser
cached. Run `npm run check`, `npm run test:tile-surfaces`, `npm run test:textures`,
`npm run test:layers`, and `npm run test:artwork` for the affected checks.
