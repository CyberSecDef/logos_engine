# Agreed Phase 4 finish line

Confirmed by the player on 2026-09-19: complete all five areas below, then close
Phase 4 and move to broader simulation. This checklist supersedes suggestions to
defer selective replay or layered artwork. No additional feature categories are
required to finish this phase without a new agreement.

## 1. World-local artwork and composition — complete

- Import validated world-specific artwork, store it under the world's assets,
  and pin image content/version references in world data.
- Review activation before Apply; retain color fallback and birth/reveal rules.
- Combine base terrain with settlement/condition layers using bounded rendering.
- Verify missing assets, world switching, save/reload, checkpoint/branch behavior,
  overlays, deterministic appearance and unchanged simulation outcomes.

Verified: reviewed/versioned PNG packs; two ordered alpha layers; optional
settlement/condition image slots; bounded rendering; missing-image fallback;
world switching, checkpoint/branch persistence, replay and unchanged physics.
86 engine/API tests pass, with artwork, layer and appearance browser acceptance.
Dedicated new production overlay paintings can be added through packs; existing
images already work as layers. The remaining agreed areas are tracked below.

## 2. Complete portable world bundles — complete

- Export/import required artwork and replay history alongside world state,
  definitions, plugins and accepted proposals.
- Validate sizes, references, hashes, compatibility and incomplete/corrupt bundles.
- Preserve source history clearly when importing into an independent world.
- Prove an exported world can be opened from an isolated world directory with its
  artwork and required history intact; exclude credentials and conversations by default.

Verified: version-2 bundles contain committed replay snapshots/records and all
referenced world artwork. Imports validate and replay before publication, retain
original source identities, and begin an independent active journal. Isolated
re-export, source-history browsing, custom plugin memory, corruption handling and
failed-publication cleanup are covered by 90 passing tests plus portable and
checkpoint browser acceptance. See [limits and compatibility](portable-worlds.md).

## 3. Minimal generic entities — complete

- Add world-defined entity types and stable instances within tiles, with bounded
  properties, creation/update/removal, migrations and generic inspection.
- Let existing rules/plugins address supported entity state through a documented
  fixed interface. Keep counts, queries and execution bounded.
- Demonstrate a tangible building-like entity introduced through a prompt,
  participating in deterministic simulation without application edits during play.
- Verify persistence, recovery and invalid/dependent migration rejection.

Verified: bounded world-defined types/instances, lifecycle and movement, explicit
property migrations, indexed count/sum reads and rule/plugin property outputs.
97 engine/API tests pass, including persistence/replay/isolated import and invalid
dependencies. Entity and portable browser acceptance pass. Native Claude Code
generated a valid building-like type/instance/rule and its deterministic tick was
verified in memory. See [entity interface and limits](world-entities.md).

## 4. Selective replay — pending

- Start from recorded history, omit or replace a selected intervention, then replay
  subsequent inputs into an independent candidate world.
- Detect and explain later inputs whose revisions, definitions or dependencies no
  longer fit. Do not silently skip failures or overwrite the source.
- Review the resulting state before creating a branch; enforce explicit work limits.
- Verify reproducibility, source preservation, failure handling and branch recovery.

## 5. Integration, compatibility and final acceptance — pending

- Run the shared change-contract acceptance cases across native Claude Code,
  Cursor workflows and the configured direct API adapter.
- Complete automatic local Cursor CLI integration, checking the installed CLI and
  its supported interfaces first; request missing installation/login details as needed.
- Review save/engine compatibility, interruption recovery, import/export, world
  isolation and no-autonomous-model/no-offline-time behavior.
- Reconcile PLAN, README, implemented-interface documentation and DEVELOPMENT;
  publish a final acceptance matrix with evidence and any explicitly agreed limits.

JavaScript/native plugin execution is not required: the restricted runtime remains
the selected approach. Trade/population/warfare/technology, wind-driven pollution,
water contamination and disease transport belong to Phase 5. Art alone does not
create those mechanics.
