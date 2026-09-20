# World-defined entities

Entities are named objects on tiles: buildings, landmarks or other tangible things
whose state fits bounded numeric properties. Their types and instances live in
optional `world.entities = {types, instances}`. The application does not add a
new building class or edit engine code when the player invents a type.

For a first experiment, select a tile, choose **Entire world** scope (new type
and rule definitions need appropriate authority), and propose:

> Create a rain-cistern type with a stored-rain property from 0 to 200 rain units.
> Build one cistern here. Make it gain today's rainfall each day. Set rainfall
> here to 10 per day. Show the total stored rain in this tile as a custom supply
> index so I can watch it change.

Review the operations and five-day preview, then Apply. The tile inspector lists
each entity's name, stable ID, type/version and effective property values. A
working proposal is [rain-cistern.json](examples/rain-cistern.json); change its
world ID, revision and origin tile IDs before applying outside a fresh test world.

This example tracks an abstract collection index. It does not withdraw physical
water, reduce runoff, provide drinking water or create conserved entity stock.
Its tile supply rule reads the previous common snapshot, so supply follows
cistern accumulation one day later. Simulation advances without model calls.

## Limits and lifecycle

- At most 16 types per world, 8 numeric properties per type, 256 instances per
  world and 16 instances per tile. No automatic spawning or destruction.
- Type properties: `{id,label,unit,min,max,defaultValue}`. Numeric values and
  bounds are within ±1,000,000, with at most three decimal places; min < max.
- Instance: `{id,typeId,tileId,label,properties}`. Missing values use type defaults.
- `entity-type-define`: `{tileId,definition,migration,discardProperties}`; new
  version 1, then increment by 1. Definition includes id/version/label/description
  and properties. Requires Entire world scope through prompts.
- `entity-create`: `{tileId,entity}`; instance and operation tile must match.
  IDs cannot repeat or be reused after deletion in retained proposal history.
- `entity-update`: `{tileId,entityId,label?,properties?,toTileId?}`; patch supplied
  values, optionally rename or move. The current and destination tiles must fit
  prompt scope. Type and stable ID cannot change; capacity limits still apply.
- `entity-remove`: `{tileId,entityId}`; removes the instance and its stored values.
- `entity-type-remove`: `{tileId,typeId}`; remove instances first. Referencing
  rules, plugins and appearances must also be removed in the same proposal.

No file paths, executable code, nested objects, unbounded queries, string-valued
simulation properties or built-in economic behavior are supplied by an entity.
Objects are inspected generically; their visual layer can be driven by appearance
rules reading entity state. There is no automatic 3D building model.

## Deterministic reads and writes

All existing rule conditions/formulas, appearance conditions and plugin `read`
instructions can use:

```json
{"source":"entity-count","entityTypeId":"rain-cistern","sample":"self"}
{"source":"entity-sum","entityTypeId":"rain-cistern","fieldId":"stored","sample":"self"}
```

Count forbids fieldId; sum requires a property on the named type. Both support
`self`, `neighbors-average`, `neighbors-min`, `neighbors-max`. Each neighboring
tile contributes its own count/sum; an empty tile contributes zero. Reads are
indexed once per state snapshot, with stable ID ordering for sums.

Rule effects and plugin `emit` instructions may include optional `entityTypeId`:

```json
{"entityTypeId":"rain-cistern","fieldId":"stored","kind":"add",
 "value":{"constant":0,"terms":[{"read":{"source":"rainMm","sample":"self"},"coefficient":1}]}}
```

A rule's `add`/`set` value applies separately to every existing instance of that
type on the target tile. A plugin uses `mode: "add"` or `"set"` in its emit.
Zero instances means zero entity writes. Missing entityTypeId still targets the
custom tile property. Entity `transfer` is rejected; tile-stock transfers and the
resource ledger retain their existing meaning.

Rules/plugins share the completed built-in weather and pre-output entity/custom
snapshot. Additions combine, then each instance clamps once to its type bounds
and rounds to 0.001. Overlapping set/add writers reject even when no instance
currently exists or conditions differ. A rule can use entity sums to influence a
tile property, or weather to influence entities, without new application code.
Plugin instruction, emission and world-fuel limits remain unchanged.

## Type migrations

`migration: "preserve"` materializes old effective values (including old defaults)
and rejects values outside new bounds. `"clamp"` explicitly permits clipping.
New properties start at their new defaults. `discardProperties` must name exactly
every removed old property; use `[]` when none are removed. No automatic rename,
unit conversion or type conversion is performed.

Every existing rule, appearance rule or plugin referencing an updated type must
be explicitly updated or removed in the same proposal, including disabled ones.
This forces review of thresholds, units and effects alongside type changes.
Invalid dependencies or migrations reject the entire proposal without altering
the source world. Review shows before/Apply/day+5 entity state, up to 24 affected
instances with a full affected count. Pure type metadata changes with no affected
instances remain visible in the operation description.

## Persistence and verification

Entity data is ordinary validated world state. Checkpoints, independent branches,
replay and complete portable bundles retain it. Older worlds omit the optional
field and preserve their prior serialization/hash and behavior. Older engine
builds cannot load the new entity contract. Schema/capabilities describe the fixed
interface; accepting a world never installs new interpreter instructions.

`tests/entities.test.ts` covers lifecycle, bounds, scopes, migration dependencies,
rule/plugin integration, common-snapshot behavior, appearance reads, default
preservation, checkpoints, replay and isolated portable import. `npm run
test:entities` exercises prompt/review/Apply, day-by-day behavior, reload, a reviewed
capacity clamp and desktop/mobile inspection. Native Claude Code was also checked
against a temporary in-memory world: it generated a type, instance and daily rule;
validation and one deterministic day produced the requested stored value.
