# Conserved resources and mana sharing

Status: implemented Phase 4b resource-transfer milestone. Custom properties can
now represent stock quantities, with adjacent transfers and a daily balance.
This does not implement trade, long-distance routes, wind/water contamination,
population transport, or executable world plugins.

## Try mana sharing

Choose a tile, open **Talk about this place**, select **Entire world** scope,
and choose **Propose change**:

> Create a Mana stock resource measured in motes, with capacity 1,000 per zone
> and default zero. Give this zone 120 motes once. Each day, have this zone share
> up to 12 motes total, divided among its neighbors. Do not create more mana.

The preview shows the world total and individual values. After Apply, close the
conversation and step time. The source loses exactly what its neighbors receive;
the world total stays at 120 unless another explicit rule or intervention changes
it. The Mana overlay, per-zone stock/capacity, and daily world balance are visible.
See [mana-sharing.json](examples/mana-sharing.json) for the example transaction;
its world/revision/origin/ID must be adapted to the current session.

For an existing resource, **Selected tile and its neighbors** scope can authorize
a source-only sharing rule or an exact transfer to an adjacent tile. Defining a
new resource still requires **Entire world** scope.

## Property types and operations

Definitions accept optional `quantity: "index" | "stock"`. Missing quantity means
index, preserving fertility and other existing properties. Stock requires `min: 0`;
`max` is each tile's storage capacity. Units must describe a total quantity per tile,
not a concentration/density: different tile areas do not multiply stock amounts.
Both property types retain the existing bounds and three-decimal precision.

An exact one-time move uses:

```json
{"kind":"field-transfer","tileId":0,"toTileId":12,"fieldId":"mana","amount":5}
```

The zones must be distinct neighbors with enough source stock and destination
capacity. Otherwise the entire proposal fails without a partial transfer. Both
zones must be authorized. Existing creator `field-set` and local `add`/`set` rules
can introduce or remove stock intentionally; transfer operations never do so.

A recurring rule uses `kind: "transfer"` in its effects, with a stock `fieldId`,
`destination: "neighbors" | "lower-neighbors"`, and the existing `value` formula.
The value is a **total outgoing budget per source**, not an amount per neighbor.
`lower-neighbors` filters by elevation, not actual runoff volumes. Communication
isolation does not disable these generic physical transfers.

The rule scope names its sending tiles. Authority and preview coverage also
include all potential recipient neighbors, even if terrain currently excludes
them. This prevents a later elevation change from expanding previously authorized
transfer destinations. Updating/removing a rule checks its existing recipient
scope as well as the replacement's scope.

## Deterministic allocation

1. Conditions and formulas read the same snapshot after built-in weather/water
   systems, with custom values from before this tick's custom writes.
2. Local `add`/`set` effects combine and clamp using the existing semantics.
3. Transfer requests reserve stock and destination headroom from the resulting
   snapshot. Process requests by rule ID, effect index, and source tile ID.
4. Clamp each budget to the source's unreserved stock, split equally among eligible
   recipients, and assign leftover thousandths by ascending recipient tile ID.
5. Limit each share to that recipient's remaining snapshot headroom. Unsent stock
   stays at the source; it is not redistributed among other recipients in that
   request. Later requests may use the remaining source stock.
6. Commit balanced debits/credits together. Incoming resources cannot be forwarded
   within the same tick. Outgoing stock does not free receiving capacity until
   the next tick. No final clamping may discard transported stock.

Negative formula results request zero transfer. Budgets round to 0.001 units.
Integer thousandths are authoritative for transfer allocation and conservation.
One tick is one hop; long chains take successive days. Stable priority resolves
competition deterministically, rather than promising equal service across rules.
The existing 100,000 rule-target budget remains, with at most 250,000 potential
transfer edges. Invalid or excessive definitions fail at Apply.

## Formula additions

Reads now support `neighbors-min` and `neighbors-max`, alongside `self` and
`neighbors-average`. Formulas may include optional numeric `min` and/or `max`
to clamp their result after evaluating the sum. Inverted bounds are rejected.
These are bounded data expressions; there is still no arbitrary code execution.

## Accounting and persistence

Each simulated day saves `resourceLedger` with its tick/revision and one entry per
stock property: `beforeMilli`, `createdMilli`, `removedMilli`, `transferredMilli`,
and `afterMilli`, plus display metadata. Creation/removal records **net local
changes per tile after combining and clamping local effects**, not every gross
production/consumption request. Transferred amount is gross movement; two opposite
movements can count even when a tile ends with the same stock. The world balance
satisfies `after − before = created − removed`; transfers do not change that total.

This is the last simulated day's ledger, not an accumulated lifetime journal.
Later creator interventions do not rewrite that historical daily balance; their
transactions remain in history. Previews separately calculate candidate and baseline
whole-world totals, even when the tile list is capped at 24 entries.

Engine 0.3.0 uses save schema 3. Schema-1 and schema-2 saves are hash-verified and
migrated in memory; existing definitions, rules, and values are preserved. New
resource-ledger state starts empty. The first normal save preserves the previous
format as `state.v1.backup.json` or `state.v2.backup.json` before atomically writing
schema 3. Loading alone does not rewrite a save. Older engine versions cannot read
the new format; run only one writer per world directory.

## Food sharing is a separate channel

[Phase 5c1 food sharing](food-sharing.md) now moves built-in settlement rations
between eligible neighbors. Its open/closed permission and reserve/edge settings
apply only to food. Existing custom-stock transfers keep their own validated rules;
closing food sharing does not silently disable mana or other stock movement.
