# Phase 6c2 — frontend delivery

The original production JavaScript was a single 751,500-byte asset. Browser
imports of technology/conflict defaults also initialized validation schemas,
bringing Zod into the client unnecessarily. Data-only defaults now live in
separate modules; existing server imports remain compatible through re-exports.
No default values, validation rules or simulation behavior changed.

The build separates Three.js into a stable renderer chunk. The production server
serves hashed JavaScript/CSS with a one-year immutable cache policy. HTML and
other unversioned static files use no-cache so normal navigation checks for
updates. Session/world API responses retain no-store. Existing versioned terrain
artwork caching is unchanged.

## Measurements and verification

| Production JavaScript | Before | After |
| --- | ---: | ---: |
| Total bytes | 751,500 | 691,819 |
| Application bundle bytes | 751,500 (included renderer) | 134,114 |
| Separate renderer bytes | — | 557,705 |
| Sum of gzip estimates | 189,701 | 176,538 |

Total JavaScript is 59,681 bytes (7.94%) smaller. These are actual build sizes;
gzip values are estimates, not bytes sent by this server. It currently serves
identity encoding. The renderer is required on initial load and is preloaded by
Vite; this change does not claim lazy loading or fewer cold-start requests.

Raw evidence: [baseline](phase-6-delivery-baseline.json) from commit 7f021dc,
and [production browser results](phase-6-delivery-results.json).
A fresh Chromium context downloads all three build assets (JS/JS/CSS); a second
normal navigation in the same context transfers zero bytes for those assets.
HTML/API traffic and image downloads are excluded from that zero-byte claim.
This is cache evidence, not a first-paint or frame-rate benchmark.

Run `npm run test:delivery`:
- Build inspection rejects bundled Zod and technology/conflict schema modules.
- An in-memory application-code change produces a new entry hash while retaining
  the renderer hash. This probe does not write build files.
- An isolated production server verifies MIME-independent byte equality, cache
  headers, cold/warm browser resource timings, successful globe startup, no browser
  errors and exact persisted-save preservation.

All 269 engine/server tests, typecheck and build pass. Combined simulation,
filtration, conflict and review-accessibility browser workflows also pass,
including stepping/replay, cancellation, mobile layouts and no autonomous models.
The initial save assertion in the new test compared freshly generated API JSON
with schema-parsed disk JSON, whose property ordering differed; it now compares
persisted state before/after and the complete save file bytes.

## Limits and next work

Three.js remains 558 kB and still triggers Vite's 500 kB advisory. The threshold
has not been raised, and splitting the library into arbitrary smaller files just
to suppress it is not an acceptance criterion. The measured improvement is removal
of unused schema initialization and independently cacheable renderer code.
Physical-device load timing, compression and further on-demand UI loading remain
possible future improvements. Cache eviction and forced reloads can download
assets again.

A deployment replaces build assets; already-open older clients should refresh.
No service worker, offline mode or retained historical asset store is introduced.
Phase 6c's measured rendering/delivery milestone is complete within this scope;
Phase 6d local operation and recovery is next.

Configuration follows the official
[Rolldown code-splitting interface](https://rolldown.rs/reference/OutputOptions.codeSplitting)
and [Vite production build guidance](https://vite.dev/guide/build).
