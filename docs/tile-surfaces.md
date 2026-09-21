# Textured walls and beveled tile tops

Revealed terrain artwork now continues over a narrow sloped rim and down each
tile's exposed walls. Settlement/condition layers follow the same mapping.
Colors-only mode, overlays, missing-image fallback and the original reveal
schedule remain intact. New worlds still start with colored tiles.

Tile bodies are inset by 3% toward their centers, giving approximately 3% spacing
relative to original tile width. Flat tops retain their 13% inset; the bevel spans
the wider shoulder. The cap is slightly inset from the outer footprint. A chamfer joins it
to a lower shoulder, followed by the wall down to the existing base radius.
Its depth tracks its width and is bounded on low terrain so ocean tiles do not
invert. Both pentagons and hexagons use the same construction. The selection
outline follows the inset cap, and all new triangles map to their original zone.

UV coordinates join continuously between the cap, rim and wall. Artwork folds
inward toward its center as it descends: this reuses the existing top-down image,
so tall cliffs can show stretched trees/city artwork rather than geological
cross-sections. Dedicated cliff artwork could be added later. This is a narrow
sloped bevel, not a fully rounded multi-segment edge.

Narrow/grazing triangles can extrapolate interpolated coordinates outside their
atlas image and produce oversized mip footprints. The shader carries each
image's slot as a flat varying, clamps coordinates to its content rectangle and
limits gradients to a gutter-safe footprint. This preserves transparent layers
without sampling a neighboring atlas image. Existing mipmaps remain enabled.

## Verification and cost

- Geometry invariants cover pentagons/hexagons, low/normal/high elevations,
  non-degenerate triangles, cap/rim/wall continuity and bounded UVs.
- Isolated browser checks use real terrain assets on a raised tile and verify
  every surface has artwork, triangle-to-zone mapping and color-mode fallback.
- Existing texture/layer tests cover GPU pixels, transparent and missing layers,
  overlays, world changes, reveal policy, reload and save preservation.
- Rendering-cache signatures now use
  [the beveled-surface reference](tile-surface-render-reference.json).
  The original Phase 6 pre-cache reference remains unchanged as historical
  evidence; it cannot match this intentionally different geometry.
- Each polygon edge now has five triangles instead of three (67% more). Cache
  reuse still avoids buffer uploads on unchanged updates. Recorded CPU medians
  are approximately 1 ms / 4 ms for unchanged standard/maximum worlds, 5 ms /
  21 ms for one land elevation edit and 58 ms / 265 ms for whole-overlay updates.
  These are host-specific CPU measurements, not physical GPU frame-rate claims.
  Maximum-world full redraws remain a performance limitation.

Run npm run test:tile-surfaces for the raised-terrain browser fixture and
npm run test:render-performance for current buffer stability. npm run check
includes the geometry invariants. No save schema, simulation rule, terrain
elevation or other world data is changed by this presentation update.

The isolated source-module close-up fixture is Chromium-only. WebKit
reproducibly closed that development fixture, but the identical raised world
passed in the production application. A separate production WebKit fixture
checks artwork readiness, selection, zoom, shader errors and save preservation.
The development-fixture closure remains a test-environment limitation.
