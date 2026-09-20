# Complete portable worlds

**Worlds → Export this world** downloads a version-2 `logos-world` JSON bundle.
It contains the saved world (rules, properties, plugins and their state, appearance,
accepted interventions), every committed replay record and snapshot, and every
world-local PNG referenced by current or historical states. Retained histories
from earlier imports are included too. Built-in painterly images ship with the
engine and do not need duplication.

**Import a world** verifies the complete bundle, previews its image/history counts,
and waits for Apply. Cancel makes no world or image writes. Apply creates an
independent ID using the copy name; it never overwrites an existing world. The
new world begins a fresh active replay journal. Imported source records retain
their original IDs, state hashes, revisions and world identity; they are not
rewritten to look like events that happened in the new world.

Open **Worlds → Imported source histories** to browse these read-only records.
Re-export carries them forward. Normal recorded-history branching continues to
use the new world's active journal; branching directly from imported source
records is not implemented. An ordinary branch of an imported world preserves
its retained source histories and their artwork.

## Included and excluded

- Includes immutable images referenced by accepted artwork changes, even if the
  current pack was reset or a restore abandoned those changes.
- Includes replay snapshots and input records, not uncommitted/orphan artifacts.
- Includes custom rules, restricted plugin definitions and saved plugin memory.
- Excludes credentials, environment files, model conversations, local paths and
  unrelated files. Player-authored world names and accepted proposal summaries
  remain part of world data.
- Named checkpoint labels, restore-backup labels and rolling checkpoint files are
  not included; replay snapshots preserve recorded restore boundaries. Keep a
  directory backup if you also want those labels or conversations.

Legacy version-1 state-only archives still import, with an explicit warning in
review that artwork bytes and replay records are absent. Missing legacy assets
retain the renderer's fallback behavior. Exporting such a world as a complete
bundle requires restoring all referenced images first.

## Validation and limits

The v2 envelope pins the engine version and a SHA-256 digest of the complete
payload. Import checks strict schemas, world validity, image hashes and PNG
structure, journal links/snapshots, and re-executes recorded steps and proposals
against their recorded result hashes. Snapshot boundaries represent saved state;
they do not claim to prove the unrecorded actions before a snapshot. Digests
identify corruption; they are not signatures or proof of who authored a world.

- Bundle/request: 128 MiB, with 4 KiB reserved for request envelope overhead.
- PNG: 8 MiB and 2048×2048 per image; at most 1024 unique referenced images.
- All histories combined: 10,000 records and 10,000 simulated days of verification.
- At most 16 retained source histories after import. Repeated imports add one
  source history each; export refuses a bundle that would exceed the next import's
  limit. Histories are not silently truncated or consolidated.
- Current engine version only for v2 replay. Legacy v1 uses existing state migration.

Oversized, corrupt, incomplete, duplicate or unreferenced artifact sets reject
before destination creation. Import stages images and source history before
publishing the first state file. Handled write failures remove the incomplete
new destination. A process crash may leave an incomplete directory; it is never
silently reused or overwritten. The source world stays unchanged.

Retained source histories are stored in an immutable
`worlds/<id>/origins-<sha256>.json` file referenced by `state.json`'s `originHash`.
Ordinary saves and restores retain that reference. Image bytes use the existing
`assets/<sha256>.png` storage. Rendering and simulation never execute retained
source histories; verification only occurs on explicit import.

## API and acceptance

- `GET /api/worlds/export`: full version-2 bundle.
- `POST /api/worlds/import/preview`: `{archive,id,name}`, with verified counts.
- `POST /api/worlds/import`: same body, validated again before publication.
- `GET /api/worlds/sources`: source identities and record counts.
- `GET /api/worlds/sources?index=N[&before=recordHash]`: bounded 50-record pages.

All require the local session token. No model call is involved.

`tests/portable.test.ts` covers isolated-directory portability, original identity,
PNG preservation, custom properties/plugin state, replay verification, re-export,
branching, corrupt/missing inputs, authenticated API review/restart and failed
publication cleanup. `npm run test:portable` covers download/review/cancel/import,
actual rendered image equality, reload, source-history browsing and mobile UI.
