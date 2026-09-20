# Selective replay

Open **Worlds → Recent world history**. A recorded intervention offers:

- **Review without this**: omit that one intervention, then replay later inputs.
- **Replace intervention**: load its original operations, edit the replacement
  summary and JSON operations, then **Review replacement replay**.

Replacement uses the normal validated proposal operations. This advanced editor
changes world data only; it cannot execute JavaScript or alter the engine. Use
ordinary prompts when making a new change to the current world. Selective replay
itself never calls a model.

Review shows the original/replacement operations, replayed day/action counts,
adjusted revision count, resulting world summary, and current tile/entity state
compared with the source. At most 12 changed tiles and 12 changed entities are
shown, with full counts. Rules may differ even when current values match. Cancel
makes no branch or state writes. **Create alternate world** uses the copy name,
creates an independent world, and leaves the source unchanged.

## What is replayed

The engine reconstructs the state immediately before the selected intervention
from a verified journal snapshot. It verifies each original subsequent transition
against its recorded hash, while separately executing the changed candidate.
Original step batches retain their day counts and order. Later proposal
operations, IDs and summaries stay unchanged; only world identity and expected
revision are adjusted for the new branch. The replacement retains the selected
proposal ID, with the new summary and operations. Omission removes that proposal.

Branch creation starts with the standard copied-state revision increment. Thus
some later revision numbers may already match after one omission; the review
counts actual differences. Definition versions, entity IDs, property bounds and
plugin state dependencies are never automatically repaired or renumbered.

Later failure stops the candidate. The error includes its recorded day, revision,
a shortened record hash, action summary and engine validation/execution reason.
For example, omitting a property definition stops at a later action that sets
that property. A change that makes a plugin divide by zero stops at that recorded
step batch. No later action is silently skipped, and no partial branch is offered.
Choose a different replacement or a later intervention and review again.

## Boundaries and limits

- Only proposal records in the active world's committed journal are selectable.
  Old proposal-history entries without replay records, orphan artifacts, source
  histories retained from imports and arbitrary days inside a batch are not targets.
- A restore or replacement snapshot after the selected intervention is a blocking
  boundary. Its saved state would overwrite the experiment; the engine refuses
  rather than treating it as an ordinary input. Choose a target after that boundary.
- Search/reconstruction are bounded to 10,000 records each. Preview permits up to
  1,000 work days: reconstructing the prior state plus twice the later step days
  (original verification and candidate simulation). It currently uses journal
  snapshots, not checkpoint acceleration. Oversized requests fail explicitly.
- Publishing rechecks the candidate and performs at most one additional pass over
  its candidate step days to durably write the branch journal. There is no model
  call, offline time advance, unlimited retry or automatic dependency repair.
- Normal 32-operation proposal, numeric, rule, entity and plugin limits apply.
  Replacement artwork must already be stored in the source world. Branch artwork
  is bounded to 1,024 images / 128 MiB of decoded PNG file bytes.

The branch retains its reconstructed starting snapshot and rewritten input journal,
so its new history can be verified, used for further branches, checkpointed and
exported. Earlier source inputs before the reconstructed starting snapshot remain
in the original world's journal. Existing retained import histories are copied.

## Review and publication guarantees

Preview is tied to the active source ID/revision and candidate hash (including
new identity, name, history and resulting state). Apply recomputes the candidate
and rejects a stale source, changed name/input or different hash. Existing world
IDs are never overwritten.

The server builds and verifies a durable branch journal in a temporary directory,
then reserves the destination exclusively and publishes state.json last. Handled
failures remove staged data and any new incomplete destination. A crash may leave
an unselected temporary/incomplete directory; it is not silently reused. A complete
branch saved before activation remains available from the world list after restart.
The source save and journal are never rewritten by this process.

## API and tests

All endpoints require the local session token and a paused/idle prompt workflow.

- `POST /api/history/intervention`: `{worldId,recordId,expectedRevision}` returns
  the original validated proposal from committed history.
- `POST /api/history/selective/preview`: `{worldId,recordId,id,name,expectedRevision,edit}`.
  `edit` is `{mode:"omit"}` or `{mode:"replace",summary,operations}`.
- `POST /api/history/selective/branch`: the same body plus `reviewedHash`.

`tests/selective-replay.test.ts` covers reproducibility, original-state verification,
omission/replacement, later dependencies, plugin failure, work limits, corrupt and
orphan records, snapshot boundaries, stale/tampered review rejection, staged-write
cleanup, independent journals, checkpoints, portability and restart recovery.
`npm run test:selective` exercises the actual browser review/editor/Apply flow,
source preservation, dependency error display and mobile layout.
