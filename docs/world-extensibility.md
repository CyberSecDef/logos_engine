# World extensibility: Phase 4a

Status: Phase 4a and the Phase 4b resource-transfer milestone are implemented. Worlds can define numeric properties
and bounded declarative rules without changing engine/application code during play.
The remaining Phase 4 work is listed in `DEVELOPMENT.md`; this is not executable
plugin support, an arbitrary expression language, or a complete resource economy. [Conserved stock transfers](resource-transfers.md)
are now available as a separate primitive.

## Try soil fertility

Select a tile, open **Talk about this place**, choose **Entire world · definitions
and rules**, and use **Propose change**:

> Add a Soil fertility property, in points, from 0 to 100, default 50. On land,
> add 1 point each day with at least 3 mm of rain and subtract 2 each day above
> 40 °C. Keep values within their bounds.

Review the definition, rule conditions, and five-day preview, then Apply. The
property appears in tile details and the world-property overlay selector. Close
the conversation and advance time to watch the rules run. Ordinary ticks never
call a model. Fertility is a tracked game quantity; it does not yet change built-in
vegetation or crop production. Those effects need supported primitives in a later
milestone. The example defaults to 50 on every tile, but only land receives its
weather-driven changes.

[soil-fertility.json](examples/soil-fertility.json) contains the full reviewable
transaction. Its world ID, origin tile, revision, and unique proposal ID must be
adapted to the current session; do not import it as a model reply unchanged.
The existing manual exchange expects a reply envelope, not a proposal envelope.

## Definitions and values

`world.definitions.fields` contains up to 32 numeric definitions with stable `id`,
integer `version`, `label`, `unit`, `description`, `min`, `max`, and `defaultValue`.
IDs use the existing lowercase ID format; prototype-related names are reserved.
Bounds and defaults support three decimal places within ±1 billion, and `min`
must be smaller than `max`. Stored values live in each tile's `properties` record;
missing entries use the definition default. Labels are plain text, never HTML.

Definitions apply to the entire world. `field-define` and `field-remove` therefore
require explicit world scope in a model request. Individual `field-set` operations
still respect the selected tile/neighbor/world scope.

| Operation | Behavior |
| --- | --- |
| `field-define` | Create or update `definition`; includes origin `tileId` and `migration: preserve` or `clamp`. |
| `field-set` | Set `fieldId` to a bounded numeric `value` at `tileId`. |
| `field-remove` | Remove a definition and all its stored values; dependent rules must be removed first. |
| `rule-define` | Create/update a `rule`; operation origin must match the rule's `tileId`. |
| `rule-remove` | Remove `ruleId` at its original `tileId`; existing values remain. |

Versions start at 1 and increase by exactly 1 for a reused ID, including recreation
after removal. Updates preserve existing effective values, including old defaults.
Changing a default does not silently overwrite those values. If new bounds exclude
existing values, `preserve` rejects the whole proposal; `clamp` explicitly limits
them to the new range. The review shows this choice before Apply.

## Converting an existing property

After creating fertility, select **Entire world** and propose:

> Convert soil fertility from 0–100 points to a 0–1 fraction. Divide all existing
> values and both weather-rule outputs by 100. Preserve values exactly; if any
> would require rounding, explain that before proposing a rounded conversion.

[fertility-conversion.json](examples/fertility-conversion.json) updates the original
fertility example. Adapt the IDs, revision and definition versions to your world.

A `field-define` update may include:

```json
"transform": { "scale": 0.01, "offset": 0, "precision": "exact" }
```

This applies `old × scale + offset` to every existing effective value, including
old defaults. Supply the new definition's bounds and default in the new units;
the new default itself is not transformed. Only an existing property can be
converted, and its definition may appear only once in that transaction.

`migration: "preserve"` rejects converted, precision-adjusted values outside the new bounds. `"clamp"` explicitly
clips to those bounds before precision handling. `precision: "exact"` rejects
values that cannot be stored to three decimal places (allowing floating-point
noise); `"round"` explicitly rounds to 0.001. The review displays the conversion,
precision policy and bounds policy. Preview never writes live values; any invalid
operation rejects the entire transaction. Stock conversions require a positive
scale and zero offset. Index conversions also permit offsets and negative scales.

Every existing rule, plugin, or appearance rule reading or writing the property must be explicitly
updated or removed in the same transaction, including disabled ones. Review its
thresholds, constants, output amounts, and saved plugin counters. The engine does
not infer their units or rewrite them. Plugin updates explicitly choose preserve/reset or a bounded
[saved-state mapping](world-plugins.md#mapping-saved-memory-on-update); arbitrary
migration code remains unsupported.
A model reply allows 16 operations; if a conversion needs more coordinated edits,
it should explain the limit rather than silently omit dependencies.

Accepted conversions remain in proposal history and travel with saves, checkpoints,
branches and exports. A manual checkpoint before a large conversion provides a
convenient recovery point. Existing daily resource-ledger entries describe the
previous simulation day in their recorded units; the next tick records new units.
Older builds that lack the transform contract cannot load histories containing it.

## Rule language and execution

A custom rule has `id`, `version`, `label`, origin `tileId`, `scope` (`tile`,
`neighbors`, or `world`), `enabled`, `everyDays` (1–365), `conditions`, and `effects`.
Neighbors includes the origin and its adjacent tiles. The cadence runs when the
world tick is divisible by `everyDays`, not relative to the installation date.
A disabled rule stays defined but does not run; updating it increments its version.

A definition may declare `quantity: "stock"` to support
[conserved adjacent transfers](resource-transfers.md); omitted quantity remains
an index. Stocks require a zero minimum.

All conditions must match. Each compares a read to a numeric value using `lt`,
`lte`, `eq`, `gte`, or `gt`. Reads have `source` and `sample` (`self` or
`neighbors-average`, `neighbors-min`, or `neighbors-max`). Sources are `temperatureC`, `rainMm`, `waterMm`, `vegetation`,
`elevationM`, `population`, `foodRations`, `shortageDays`, `surplusDays`, and `custom` with a required `fieldId`. Settlement-specific reads return zero on unsettled tiles. A neighbor average
is the arithmetic mean over adjacent tiles, excluding the origin.

Each effect names a custom property, chooses `add` or `set`, and supplies a formula:
`constant + sum(coefficient × read)`, with optional `min`/`max` clamps. Transfer
effects are described in the resource guide. There is no code execution, recursion, division,
unbounded query, or implicit built-in-state write. Each rule allows at most eight
conditions, four effects, and eight terms per formula. Worlds allow up to 64 rules
and 100,000 enabled rule-target evaluations per tick.

Rules run after weather, temperature, water flow, built-in vegetation, and activated settlement food/population. All read
the same completed built-in state and the previous custom-property snapshot.
One rule cannot observe another rule's writes from that tick. Additive effects
combine, then clamp once to the definition bounds and round to 0.001. Any overlapping
`set` writer conflicts with another writer for the same tile/property, even if
conditions or cadences appear disjoint. Disabled rules do not reserve writes.
References and conflicts are checked at Apply; failure leaves the live world intact.

Local add/set effects do not conserve stock; use explicit transfer effects for
conserved movement. A neighbor average
can drive a property but does not implement water, pollution, trade, or population
transport. Those systems remain on the environmental/broader-simulation roadmap.

## Authority, inspection, and previews

The model sees current definitions, relevant tile values, and the supported
schema. A narrower request cannot introduce a global definition or add/remove/update
a rule affecting tiles beyond its authority. Updates check both the old and new
rule target sets; shrinking a world rule does not bypass world-scope authority.
World scope permits broad changes; the review lists their exact meaning.

The inspector lists property values and applicable rules. Custom overlays derive
colors from definition bounds. Preview simulates the complete world but returns
at most 24 zones, prioritizing directly edited tiles and immediate neighbors and
disclosing the potential affected count. New properties say “not previously
defined” in baseline comparisons. Removing a property is explicitly described in
the operations. This bounded view is not a list of every later consequence.

## Persistence and migration

Engine version 0.3.0 uses save schema 3. The server checks the original envelope
hash before accepting/migrating schema-1 or schema-2 saves. Version 1 receives empty
definitions/property records; existing version-2 definitions are preserved.
Both receive an empty daily resource ledger, then pass full validation. Loading does not rewrite the file.
The first normal save preserves the previous document as
`worlds/<id>/state.v1.backup.json` or `state.v2.backup.json`, then atomically commits
schema 3. Existing
compatible backups are not overwritten; corrupt backups stop migration writes.
Read-only migration was verified against the existing local worlds.

Definitions and current rules are embedded in the checksummed `state.json`;
accepted transactions retain their versioned definitions in history. A complete
append-only journal and general entity migrations remain pending. [Checkpoints and branches](world-checkpoints.md)
now provide immutable snapshots/definitions, reviewed restore, and portable import/export. The current runtime adds [restricted plugins](world-plugins.md) in schema 4;
older engine builds cannot load it;
keep the backup when moving between versions. Run one writer per world directory.

Executable schemas: `packages/contracts/src/extensions.ts`; evaluator and
validation: `packages/engine/src/extensions.ts`. The model response schema derives
extension operations from the same Zod definitions. Tests cover model authority,
version changes, migration, rules, overlays, and browser persistence.

## Connect fertility to farms

The historical soil example remains a custom-rule demonstration. To connect its
existing values to harvests and population effects, review [soil ecology activation](soil-ecology.md).
Activation explicitly pauses conflicting old weather writers to avoid counting
rain/heat twice. The normalized index range supports both points and fractions.
