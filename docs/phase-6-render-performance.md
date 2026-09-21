# Phase 6c1 — globe buffer caching

The renderer previously rebuilt every tile's positions, projected UVs, colors,
normals and bounds on each update. It now retains each tile's UV projection and
rendered style. Appearance rules still run on every update; changed output,
texture availability, reveal opacity, overlays and terrain invalidate the
appropriate data. World changes clear the cache. Unchanged updates request no
attribute uploads. Terrain edits still recompute whole-mesh normals and bounds.

## Measurements

Run `npm run test:render-performance`. Requires installed Playwright Chromium.
The test uses isolated temporary worlds and never calls a model or opens live saves.
SHA-256 signatures of seven geometry attributes and exact bounds must match the
pre-change renderer for initial state, unchanged updates, overlays, color-only
mode, actual land elevation edits, missing slots and same-sized world switches.
A separate assertion checks that unchanged updates do not mark attributes dirty.

Median CPU milliseconds, eight warm samples per case on the recorded host:

| Zones | Update | Before (ms) | After (ms) |
| --- | --- | --- | --- |
| 42 | Unchanged world | 1.6 | 0.1 |
| 42 | Overlay switch | 1.3 | 1.2 |
| 42 | One land elevation | 1.6 | 0.4 |
| 1,442 | Unchanged world | 40.1 | 1.1 |
| 1,442 | Overlay switch | 39.8 | 36.3 |
| 1,442 | One land elevation | 37.9 | 3.5 |
| 6,762 | Unchanged world | 179.6 | 4.8 |
| 6,762 | Overlay switch | 182.2 | 159.5 |
| 6,762 | One land elevation | 179.8 | 13.7 |

Raw evidence: [baseline](phase-6-render-baseline.json) and
[cached renderer](phase-6-render-results.json), including host, time, first
construction timings, maxima and buffer hashes. Baseline is from the pre-cache
renderer at commit a5b5829. Do not regenerate it from the optimized implementation.
The capture environment variable is for deliberate reference maintenance only.

These are Chromium/SwiftShader CPU buffer-update measurements using the Vite
source module. They exclude asset I/O, animation rendering, GPU submission and
production delivery, and do not claim equivalent FPS gains on physical GPUs.
Results vary with host load. The Float64 projection cache costs approximately
1.9 MB at standard size and 8.8 MB at maximum size, plus style strings/map overhead.
Float64 preserves the original arithmetic before Float32 buffer writes.

Production browser checks separately cover actual GPU pixels, layered artwork,
custom appearance rules, missing artwork, reveal/application, world switching,
panels/mobile layouts and combined simulation. All 269 engine/server tests,
typecheck and production build pass. Engine and world schemas are unchanged.

## Remaining Phase 6c work

Overlay switches still rewrite all visual attributes when colors change; large
terrain edits still recompute normals/bounds. Initial construction is uncached.
Frontend delivery still has the approximately 752 kB JavaScript bundle warning.
6c2 will measure and address delivery structure; warning thresholds are unchanged.
