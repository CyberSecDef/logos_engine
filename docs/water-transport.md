# Water transport and next-day budgets (Phase 5a)

Select a zone and click **Explain next day’s water**. Time pauses and the inspector
shows a one-day deterministic preview under the world's currently applied rules.
It does not apply a pending proposal, advance time, change a save or call a model.
Close the preview to return to the creator controls. Selecting another zone,
stepping time, applying a change or opening another world clears it. Reload does
not reconstruct a preview as if it were recorded history.

The budget shows starting water, rainfall added, evaporation removed, incoming and
outgoing runoff, ocean drainage and ending water. All volumes are integer litres;
depths in the inspector are equivalent millimetres over the selected zone's area.
Route rows name actual source/destination zones and their water and sediment
amounts. Sediment is measured in integer kilograms.

## Exact existing calculation

This milestone extracts and observes the existing hydrology phase; it introduces
no new water physics. Its order is unchanged:

1. Calculate the next day's temperature, including sustained sources and anomaly
   diffusion. Choose each tile's rainfall override or seeded weather rainfall.
2. Add `rainMm * areaM2` litres. Remove the lesser of available water and
   `areaM2 * max(0, floor(temperatureC / 12))` litres as evaporation.
3. Read that snapshot for all runoff. Land above zero elevation retains 20 mm.
   Half the integer volume above that level is the outgoing budget. Only strictly
   lower adjacent zones qualify. Each share is weighted by the elevation drop
   and rounded down independently; rounding residue remains at the origin.
4. Each edge carries `floor(originSedimentKg * edgeWaterL / max(1,
   originSnapshotWaterL))` kilograms. Debit and credit water and sediment
   simultaneously, so incoming water/sediment is not sent onward on the same day.
5. Drain all water on zones at elevation zero or below into the ocean export
   accounting. Sediment remains there. Then update flood events and vegetation.
6. Run existing restricted plugins and custom rules, then validate the whole day.
   A plugin failure rejects the preview as it would reject the actual tick.

Rainfall, evaporation and ocean export change global stored water. Neighbor
transfers do not. Sediment is redistributed without a new source or sink.
Communication isolation does not close any physical water route. Raising a
neighbor above the origin changes the next calculation's eligible destinations.
No groundwater, wind, contaminant transport or ocean currents are implied.

For every zone:

```text
ending water = starting water + rain - evaporation
               + incoming runoff - outgoing runoff - ocean drainage
ending sediment = starting sediment + incoming sediment - outgoing sediment
```

The diagnostic includes `mixingWaterL`, the post-rain/evaporation, pre-transfer
origin volume. Future contamination transport must use that same snapshot and
these actual edges. It must define its own solute/deposit accounting: evaporation
and ocean drainage must not silently erase contaminant mass.

## Engine interface

- `advance(world)` retains its original return type and behavior. Ordinary ticks
  do not allocate a transfer report.
- `advanceWithWaterReport(world)` returns `{ world, report }`, using exactly the
  same step implementation. Both paths clone the source and return a validated
  candidate. The report is transient; neither path mutates the input.
- `previewWater(world, tileId)` performs one full step on a copy and returns only
  that tile's budget and its incoming/outgoing edges. Unknown tiles fail.
- `packages/engine/src/hydrology.ts` owns the shared hydrology calculation;
  `packages/contracts/src/transport.ts` documents the report types.

`WaterTransportReport` contains source world identity, revision, source tick,
result tick, one `WaterBudget` per tile and positive-volume `WaterTransfer` edges.
A budget contains `beforeWaterL`, `rainL`, `evaporationL`, `mixingWaterL`,
`incomingWaterL`, `outgoingWaterL`, `oceanDrainL`, `afterWaterL`, and corresponding
before/incoming/outgoing/after sediment kilograms. An edge contains `fromTileId`,
`toTileId`, `waterL`, `sedimentKg`.

Work is one normal engine day plus linear diagnostic collection over the existing
bounded topology (at most 6,762 tiles, at most six neighbors each). The HTTP result
contains one tile and at most six edges per direction, not an unbounded history.
The calculation is deterministic on the supported runtime; it is a gameplay
model, not a scientific hydrological forecast.

## HTTP contract

Authenticated `POST /api/transport/preview`:

```json
{"worldId":"first-world","expectedRevision":840,"tileId":0}
```

The response is `WaterPreview`: `{ worldId, sourceRevision, sourceTick, tick,
tileId, areaM2, budget, incoming, outgoing }`. It validates the active world,
expected revision and tile before computing. It is unavailable while a model
request holds the existing world lock. It writes no journal records, checkpoints,
conversations or world files. The browser additionally discards responses for a
previous selection/world/revision.

There is no new model operation and no change in creator scope. Models still
propose rainfall, elevation and temperature through the existing review interface.
A future transport-consuming mechanic will need its own documented world state,
activation, versioning and validated operations.

## Compatibility and evidence

No save schema or engine version changes are needed because saved simulation
outputs are identical. Two pre-refactor 100-day hashes (including rainfall and
sustained-temperature interventions) are pinned in `tests/transport.test.ts`.
Additional checks balance each zone for 40 days, compare report-enabled and
ordinary steps, verify one-hop timing and ocean behavior, and reject failed plugin
ticks without source mutation. API tests verify authentication, source/revision,
unchanged save/journal and zero model calls.

`npm run test:transport` covers pause/read-only inspection, exact correspondence to
the next committed day, route labels, stale selection responses, close/reload,
desktop/mobile layout and zero model calls using a disposable world.
