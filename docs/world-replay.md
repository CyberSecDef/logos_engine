# Recorded world history and replay verification

The engine now keeps an immutable replay journal for future saved steps and applied
proposals. Open **Worlds → Recent world history** to see the latest 50 recorded
saves, including steps, creator changes and snapshot boundaries. **Load earlier
history** fetches the next 50. Use **Review branch** to explore a recorded moment
in an independent world, or checkpoints to restore the current world.

Existing worlds begin recording with an **adopted snapshot on their next save**.
Their earlier proposal list is retained, but missing historical timing is not
invented. New worlds start with an initial snapshot. Opening a world, previewing a
proposal, discussing with the model or creating a checkpoint does not add a replay
action. A saved multi-day advance is one record containing its day count.

## Branch from a recorded moment

1. Open **Worlds → Recent world history** and load earlier pages if needed.
2. Set **Copy name**, then select **Review branch** on the desired recorded save.
3. Review the reconstructed day, world summary, starting snapshot/checkpoint and
   number of replayed days. Cancel leaves your current world untouched.
4. Choose **Create branch** to open an independent world at that moment.

The source world stays at its current day. The new world's state, definitions,
plugin memory, appearance rules and accepted proposals come from the selected
record. It gets its own ID, revision and initial journal snapshot. Advance or edit
it independently. No model is called, and reconstruction never advances saved time.
Records from a path abandoned by checkpoint restoration remain branchable.

Only committed records in the selected world's chain can be used; orphan files
are rejected. Reconstruction starts at the nearest preceding journal snapshot or
available checkpoint whose exact world hash matches a record. It replays intervening
steps/proposals and checks each resulting hash. A matching checkpoint verifies a
starting state, not the earlier path leading to that checkpoint. Full-history
verification remains a separate CLI operation.

Browser reconstruction is capped at 1,000 replayed days and a search of 10,000
records. Matching retained checkpoints often shorten replay. Missing, corrupt or
incompatible inputs fail before creating a branch. Review binds the source world,
current revision and reconstructed hash; a changed active world or stale revision
requires reviewing again. Reconstruction runs again before creation. Existing world
IDs cannot be overwritten.

This branches at recorded **save boundaries**. A multi-day step has one boundary
at its end; choosing an intermediate day, skipping/editing past interventions,
portable journal bundles and overwriting the source from a journal record remain
future work. The current UI searches/paginates within the newest 10,000 records.

## Verify a world

From the project directory:

```sh
npm run world -- history first-world
npm run world -- verify-history first-world
npm run world -- verify-history first-world 20000
```

Verification reads snapshots, re-executes recorded proposals and deterministic days,
and compares the state hash after every record and against the current save. It
never applies changes to the live world, advances saved time or calls a model.
Pause gameplay for a stable view, and continue to use one writer per world directory.
Verification runs in a separate CLI process; it can take time on large worlds.

The default budget is 10,000 simulated days and 10,000 records. An explicit day
limit can be between 0 and 100,000; exceeding either budget fails rather than
reporting partial work as verified. Missing/corrupt artifacts, incompatible record
versions, mismatched transitions or a different final hash fail verification.
The output reports days, proposals, snapshot boundaries, revisions and the final
hash. Snapshot boundaries are loaded and checked, not reconstructed from earlier
physics: **verified means the recorded steps/proposals between those boundaries
reproduce their saved results**, not that unavailable earlier history was recovered.

## Storage and commit behavior

`worlds/<id>/journal/<sha256>.json` holds content-addressed records and snapshots.
The save envelope adds `journalHead`, pointing to its committed record. World data
and its own checksum retain their existing format. Each record includes the prior
record hash, world identity, engine version, resulting tick/revision/state hash,
and one of:

- `step`: prior state hash and a bounded day count.
- `proposal`: prior state hash and the exact accepted proposal.
- `snapshot`: an immutable complete state and an explicit initial/adopted/restore/
  replacement reason.

Artifacts are written and synchronized before `state.json` publishes the new head
through its existing atomic replacement. Interrupted writes can leave unreachable
artifacts, but readers follow only the committed chain. Immutable files are never
overwritten. Individual journal artifacts are limited to 64 MiB on both write and
read; an oversized artifact rejects the save before publishing its head. Load checks the head against the saved state; full ancestor and replay
checks are explicit. Hashes detect accidental damage; they are not signatures or
proof against someone who can rewrite the entire world directory.

Restoring a checkpoint appends a snapshot boundary to the same chain, retaining
the abandoned path. General store writes without step/proposal metadata use an
explicit replacement snapshot. Branches and portable world imports start independent
journals from their copied states. The current world export includes its normal
proposal history but **does not bundle the replay journal**. Back up the whole
world directory to retain it.

Journal records are retained indefinitely in this milestone. Ordinary days store
small records rather than full world snapshots; initialization/adoption, restores
and explicit replacements store snapshots. This retention is independent of the
100-day automatic checkpoint policy, which still keeps ten automatic checkpoints.
Automatic checkpoint pruning never deletes journal artifacts. Journal compaction,
portable journal bundles, editing/skipping replay events and arbitrary historical restore
remain future work.

Older engine builds do not maintain `journalHead`; avoid using them as writers on
journaled worlds. Replay requires compatible simulation behavior and validates
hashes rather than silently rewriting history after an engine change.
