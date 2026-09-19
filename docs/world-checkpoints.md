# Checkpoints, branches, and portable worlds

Open **Worlds** to preserve an experiment or explore another outcome. These
controls never call a model. The panel pauses time; opening a world or restoring
it does not advance its simulation.

## Checkpoints and restore

Enter a checkpoint name and choose **Save checkpoint**. A checkpoint captures the
entire simulated state: topology, seed, day, terrain, water, temperature, custom
properties, built-in/custom rules, resource accounting, and recorded creator
changes. Saving a checkpoint does not change the world's revision.

Automatic checkpoints capture the starting state before the world's first step
and then every **100 simulated days**. The latest **ten automatic checkpoints**
are retained per world. A multi-day API step records its final state when it
crosses a 100-day boundary. Restarting the server does not create extra automatic
checkpoints, and closed/paused games do not generate them. Named checkpoints and
pre-restore backups are never pruned automatically. There is no deletion UI yet.

Choose **Review restore** on a checkpoint, inspect the world/day summary, then
**Restore**. The current state is checkpointed as a restore backup before the
save is replaced. Cancel leaves the world unchanged. Restoring brings back that
checkpoint's rules as well as its tile state, and leaves time paused. Revision
numbers keep increasing, so pending proposals become stale and need a new prompt.
The backup can itself be restored or branched. Conversation files stay on the
original world and are not rewound; restored simulation history determines which
changes are marked applied.

## Branches

Set **Copy name**, then choose **Branch current world**, or **Branch from here**
on a checkpoint. The game opens an independent world with a new ID. Its initial
state and seed match the source; the same future inputs produce the same tile
simulation. Changing either copy does not change the other. Copies include current
state and recorded changes, but do not copy conversation files or the checkpoint
collection. The active-world choice persists across server restarts.

## Export and import

**Export this world** downloads a portable JSON archive of the current world.
To import, set **Copy name**, choose the archive file, review the summary, and
confirm **Import world**. Import always creates a new ID and never overwrites an
existing world. It validates the checksum, save schema, topology, definitions,
rules, and state before creating files. Supported older save versions migrate
through the existing migration pipeline.

Archives include the current simulated state and its recorded changes, not
conversation records, checkpoint collections, credentials, or arbitrary executable files. Restricted JSON plugin programs and their internal
state are included with the simulated state.
The limit is 32 MiB including the request envelope. The SHA-256 checksum detects
accidental modification; it is not a signature proving who authored an archive.
Texture packs and external JavaScript/native plugin files are not bundled.
Restricted plugin artifacts are recreated from the embedded definitions on save.

## Storage and guarantees

```text
worlds/
  .active-world.json
  <world-id>/
    state.json
    checkpoints/<checkpoint-id>.json
    snapshots/<sha256>.json
    definitions/<sha256>.json
    plugins/<plugin-id>/<version>/<sha256>.json
    conversations/<request-id>.json
```

Snapshot and definition artifacts are content-addressed, immutable JSON files.
Identical content is stored once. A checkpoint descriptor is published only after
both artifacts are durable. Every read verifies their hashes and world identity;
damaged checkpoints are omitted from the restorable list, and an explicit read
reports the error. Automatic retention deletes only expired automatic references
and their unshared artifacts, preserving named and restore references. If a
checkpoint descriptor is malformed, cleanup leaves artifacts intact for recovery.
Interrupted writes can leave harmless unreferenced artifacts; this milestone does
not perform a general garbage collection sweep.

State replacement remains atomic. If backup creation fails, restore does not
replace the active state. Checkpoints are recovery points, not a complete
append-only event journal or selective replay system. Automatic checkpointing is
part of the server's step workflow; the developer CLI does not create checkpoints.
Run only one server/writer for a world directory. General entity migrations,
JavaScript/native plugin execution, and texture packs remain separate work.
[Restricted world plugins](world-plugins.md) now preserve state through this workflow.

Run `npm run test:checkpoints` for the browser acceptance flow. Integration tests
also cover immutable artifacts, corruption rejection, retention, deterministic
copies, revision safety, and persistent active-world selection.
