# Soil ecology and farming

The optional `soil-ecology-v1` model connects the existing fertility index to
harvests, weather and population. This is fantasy gameplay balance: the population
bands approximate land stewardship and urban pressure, not individual occupations
or real-world agronomy. Nothing calls a model during daily simulation.

## Activate in a world

Select any zone, open **Settlement and food**, then **Review soil ecology activation**.
Review the world-wide change and press Apply. Existing recorded days retain their
original calculations; ecology starts with the next day. You can also ask the
advisor using **Entire world** scope:

> Enable soil ecology with the default rates. Preserve my existing fertility values
> and explain any custom rules or plugins that must be paused to avoid double counting.

Activation reuses `soil-fertility`, or the currently bound index. If absent, the
button proposes a 0–100 index with default 50. It does not reset existing values.
A 0–1 index works too: the field's minimum means zero fertility and maximum means
full fertility. A stock cannot be used as fertility. Choose a different index via
the advisor when needed. Direct `field-set` edits remain available on selected tiles.

Enabled custom rules or plugins that write this index conflict with ecology and
must be paused explicitly. The activation review lists each whole rule/plugin it
pauses, including any other effects in that writer; cancel if those effects should
be retained and ask the advisor to split them first. Definitions, values and plugin
memory remain saved. Reads of fertility remain valid. The model never silently
adds its weather effects on top of the old fertility weather rules.

## Daily calculation

Order: temperature → hydrology/natural vegetation → soil ecology → settlement
harvest/food/population → custom rules/plugins. Soil uses the population at the
start of that day; births/losses affect stewardship and urban pressure tomorrow.
All land participates, including unpopulated land. Ocean soil values remain saved
but do not evolve, and submerged settlements cannot farm.

Normalize fertility to 0–100 percentage points. On land, apply weather recovery
and losses, add farmer stewardship, subtract urban pressure, then clamp to the
field range and round to its existing three-decimal storage precision. Fine rates
can round away in very narrow field ranges; use a 0–100 field for finer precision.

| Weather condition | Default soil change (percentage points/day) |
| --- | --- |
| Rain 1–50 mm/day, temperature 0–35 °C, not flooded | +0.2 |
| Rain below 1 mm/day | −0.2 |
| Rain above 50 mm/day | −0.3 |
| Temperature above 35 °C | −0.5 |
| Temperature below 0 °C | −0.1 |
| Standing water deeper than 100 mm after hydrology | −0.5 |

Losses combine: drought plus heat gives −0.7 by default. Flooded/cold/hot days do
not receive rain recovery. Rain describes rainfall rather than irrigation; standing
water supports farm moisture and stewardship but does not remove the drought term.

Farmer benefit rises linearly from zero people to +0.5 soil points/day at 1,000
inhabitants, then fades linearly to zero at 5,000. It is multiplied by the existing
farm temperature and moisture suitability, and is zero when flooded. This is a
population-level stewardship effect; separate farmer jobs and land use are not
implemented. Zero population receives no stewardship benefit.

Urban pressure is zero through 5,000 inhabitants, grows linearly to full pressure
at 50,000, and stays capped above that. At full pressure it removes 1 soil point/day
and 0.01 vegetation fraction/day (one percentage point), after natural vegetation
change. Both soil and vegetation stop at zero. Defaults therefore cause a large city
to lose vegetation even in weather that otherwise encourages natural growth.

At 20 °C and 5 mm rain/day:

| Population | Weather | Stewardship | Urban soil loss | Net soil points/day |
| --- | --- | --- | --- | --- |
| 0 | +0.2 | 0 | 0 | +0.2 |
| 100 | +0.2 | +0.05 | 0 | +0.25 |
| 1,000 | +0.2 | +0.5 | 0 | +0.7 |
| 3,000 | +0.2 | +0.25 | 0 | +0.45 |
| 5,000 | +0.2 | 0 | 0 | +0.2 |
| 27,500 | +0.2 | 0 | −0.5 | −0.3 |
| 50,000+ | +0.2 | 0 | −1 | −0.8 |

Harvest uses **that day's updated fertility**. Normalize it to a 0–1 factor,
quantize downward to 0.001, multiply potential farm production by temperature,
moisture and fertility factors, then floor once to whole rations. A 50% fertile
zone yields half the weather-supported harvest; zero fertility yields zero.
Flooded/submerged farms still produce nothing regardless of fertility. Fertility
does not directly boost wild vegetation; urban pressure reduces it explicitly.

## Reviewed interface

```json
{
  "kind": "soil-ecology-configure",
  "tileId": 0,
  "expectedVersion": 0,
  "enabled": true,
  "fieldId": "soil-fertility",
  "settings": {
    "farmerPopulationMax": 1000,
    "cityPopulationStart": 5000,
    "cityPopulationFull": 50000,
    "rainRecovery": 0.2,
    "droughtLoss": 0.2,
    "excessRainLoss": 0.3,
    "heatLoss": 0.5,
    "coldLoss": 0.1,
    "floodLoss": 0.5,
    "farmerGain": 0.5,
    "cityLoss": 1,
    "cityVegetationLoss": 0.01
  }
}
```

This is an operation inside the ordinary proposal envelope. Define the index first
when absent. `expectedVersion` is zero initially, otherwise the current ecology
version; successful configuration increments it. Supply all settings. Thresholds
are integers 1–1,000,000 with `farmerPopulationMax < cityPopulationStart < cityPopulationFull`.
Soil rates are 0–100 points/day; vegetation loss is a fraction 0–1/day. Zero rates
turn off individual effects. Threshold weather values are fixed by this model version.
Disabling the model preserves soil/configuration/history, stops weather/population
soil effects and urban vegetation loss, and restores legacy full-fertility harvests.
Paused custom writers are not automatically resumed. The bound index cannot be
removed or made a stock while referenced; explicitly rebind first.

The inspector shows current fertility and the last day's weather, stewardship,
urban soil loss and vegetation loss. The settlement ledger includes its fertility
harvest factor. The existing custom-property overlay colors soil fertility. Preview
shows day +5 soil, vegetation and settlement food versus the unchanged baseline;
it is not a long-term sustainability prediction.

## Compatibility and verification

World `soilEcology` and tile `soilDay` are optional schema-4 fields. Inactive worlds
keep their previous hashes and physics; no automatic migration changes old days.
The model marker pins semantics for future replay. Configuration, soil values and
ledgers survive save/reload, checkpoints, portable copies and journal replay.
Old builds do not support active ecology saves.

`npm run check` covers yield factors, weather extremes, population breakpoints and
saturation, normalized units, old-rule conflict rejection, scope/version checks,
atomic edits, replay/checkpoints and portable copies. `npm run test:ecology` checks
activation/cancel/Apply, preserved values, explicit writer pausing, urban loss,
farmer recovery, prompted population changes, overlays, reload and mobile layout.
