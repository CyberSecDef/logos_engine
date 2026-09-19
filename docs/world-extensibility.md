# World extensibility: Phase 4a

Status: implemented first Phase 4 milestone. Worlds can define numeric properties
and bounded declarative rules without changing engine/application code during play.
The remaining Phase 4 work is listed in `DEVELOPMENT.md`; this is not executable
plugin support, an arbitrary expression language, or a complete resource economy.

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

## Rule language and execution

A custom rule has `id`, `version`, `label`, origin `tileId`, `scope` (`tile`,
`neighbors`, or `world`), `enabled`, `everyDays` (1–365), `conditions`, and `effects`.
Neighbors includes the origin and its adjacent tiles. The cadence runs when the
world tick is divisible by `everyDays`, not relative to the installation date.
A disabled rule stays defined but does not run; updating it increments its version.

All conditions must match. Each compares a read to a numeric value using `lt`,
`lte`, `eq`, `gte`, or `gt`. Reads have `source` and `sample` (`self` or
`neighbors-average`). Sources are `temperatureC`, `rainMm`, `waterMm`, `vegetation`,
`elevationM`, `population`, and `custom` with a required `fieldId`. A neighbor average
is the arithmetic mean over adjacent tiles, excluding the origin.

Each effect names a custom property, chooses `add` or `set`, and supplies a formula:
`constant + sum(coefficient × read)`. There is no code execution, recursion, division,
unbounded query, or implicit built-in-state write. Each rule allows at most eight
conditions, four effects, and eight terms per formula. Worlds allow up to 64 rules
and 100,000 enabled rule-target evaluations per tick.

Rules run after weather, temperature, water flow, and built-in vegetation. All read
the same completed built-in state and the previous custom-property snapshot.
One rule cannot observe another rule's writes from that tick. Additive effects
combine, then clamp once to the definition bounds and round to 0.001. Any overlapping
`set` writer conflicts with another writer for the same tile/property, even if
conditions or cadences appear disjoint. Disabled rules do not reserve writes.
References and conflicts are checked at Apply; failure leaves the live world intact.

These are generic numeric effects, not conserved transfers. A neighbor average
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

Engine version 0.2.0 uses save schema 2. The server checks the original envelope
hash before accepting/migrating schema-1 saves, initializes empty definitions and
property records, and validates the result. Loading does not rewrite the file.
The first normal save preserves the last schema-1 document as
`worlds/<id>/state.v1.backup.json`, then atomically commits schema 2. Existing
compatible backups are not overwritten; corrupt backups stop migration writes.
Read-only migration was verified against the existing local worlds.

Definitions and current rules are embedded in the checksummed `state.json`;
accepted transactions retain their versioned definitions in history. This is not
yet the planned separate immutable artifact store, append-only journal, general
rollback UI, or branches/import/export. Older engine builds cannot load schema 2;
keep the backup when moving between versions. Run one writer per world directory.

Executable schemas: `packages/contracts/src/extensions.ts`; evaluator and
validation: `packages/engine/src/extensions.ts`. The model response schema derives
extension operations from the same Zod definitions. Tests cover model authority,
version changes, migration, rules, overlays, and browser persistence.
