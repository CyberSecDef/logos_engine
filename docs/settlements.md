# Settlements, food and population — Phase 5b

Status: implemented and deployed. Settlements are explicitly placed by the
creator. Existing worlds and empty tiles acquire no population behavior on load.
This is an abstract fantasy subsistence model, not empirical demography.

## First model: food-population-v1

Each settled tile has one named settlement, an integer food reserve (rations),
a population capacity, farm capacity and bounded demographic settings. Actual
inhabitants use the existing `tile.population` field; there is no second competing
population count. Generic world entities remain independent: creating an entity
called “town” does not silently activate this system.

One inhabitant consumes one ration per day. Each day after weather/hydrology:

1. Compute potential production as the lesser of farm capacity and population
   times the per-worker production setting. Empty settlements produce nothing.
2. Scale production by temperature and available moisture using integer factors.
   Ideal temperature is 10–30 °C; output falls linearly to zero at 0/45 °C.
   Moisture reaches full effectiveness at 5 mm of rain plus standing water
   (standing-water contribution capped at 20 mm). Flood depths over 100 mm or
   elevation at/below zero prevent farming. Natural vegetation/custom fertility
   are not automatically farm productivity; that would require an explicit rule.
3. Harvest, account for food beyond the one-billion-ration storage bound as
   overflow, then consume up to the day's demand. Record unmet demand explicitly.
4. Consecutive shortage days accumulate; the default seven-day interval removes
   1% of inhabitants, rounded up, at least one, bounded by current population.
   Reset the shortage counter after each loss interval or a fully fed day.
5. When everyone is fed and ending reserves cover seven more days, accumulate
   consecutive surplus days. The default 30-day interval adds 1%, rounded down
   but at least one, bounded by remaining population capacity. Otherwise reset
   surplus progress. New inhabitants consume from the following day.

Setting a demographic rate to zero disables that change. Zero inhabitants never
regrow spontaneously. Food aid is a creator source, not trade. Lost inhabitants
are recorded losses, not migration. Terrain changes can halt production without
silently removing the settlement or its stock.

## Interface and compatibility

- Optional tile-local state carries a literal `food-population-v1` model marker,
  rule revision, food, shortage/surplus counters and a bounded last-day ledger.
- Creator operations place a settlement, change its bounded settings, add/remove
  food, set population or explicitly remove the settlement with exact discard
  quantities. All pass normal scope/revision checks and review before Apply.
- Existing settlement-free saved hashes and replay behavior remain identical.
  Activation is explicit; later model changes must retain this version's behavior.
- Existing custom rules/plugins read population after the settlement phase; they
  do not directly write built-in population or settlement food. No trade, travel,
  contamination, infectious disease or factions are implied by this milestone.
- The preview shows before/Apply/day+5 values and the unchanged-world baseline.
  Five days cannot demonstrate a complete 30-day growth cycle; counters and
  configured intervals must remain visible.

## Acceptance coverage

- Exact daily food and population balances, stable rounding, bounds and counters.
- Drought, freezing, heat, flooding, capacity, food aid and complete depopulation.
- Atomic invalid/discard/rule-revision rejection; prompt scope and Discuss safety.
- Save/reload, checkpoints, portable data and deterministic journal/selective replay.
- Population/food inspection and overlays; prompt and direct creator review flows.
- No autonomous models, no offline progression and unchanged pre-activation worlds.

## Settings and bounds

| Setting | Default | Inclusive range |
| --- | --- | --- |
| `capacity` | 1,000 inhabitants | 0–1,000,000 |
| `farmRationsPerDay` | 200 | 0–10,000,000 |
| `workerRationsPerDay` | 2 | 0–100 |
| `shortageIntervalDays` | 7 | 1–3,650 |
| `growthIntervalDays` | 30 | 1–3,650 |
| `reserveDays` | 7 | 0–3,650 |
| `lossPermille` | 10 (1%) | 0–1,000 |
| `growthPermille` | 10 (1%) | 0–1,000 |

Population is an integer, capped at one million and at settlement capacity.
Food is an integer from zero to one billion rations. Any unmet daily demand counts
as a shortage day, even when some people were fed. Farm productivity uses current
weather after built-in hydrology/temperature. Custom rules and plugins run afterward.
They can read `foodRations`, `shortageDays`, `surplusDays` (zero without a settlement)
and `population`, but cannot write those built-in stocks through generic outputs.

## Reviewed operations

These are operations inside the usual proposal envelope, not new HTTP routes:

```json
{"kind":"settlement-create","tileId":0,"label":"Greenhaven","population":100,"foodRations":700}
```

Creation requires unoccupied land above sea level and zero existing population.
Omitting `settings` uses the defaults above; supplying it requires all settings.
Configuration accepts a partial settings object and optional label:

```json
{"kind":"settlement-configure","tileId":0,"expectedRulesVersion":1,"settings":{"farmRationsPerDay":300}}
{"kind":"settlement-food","tileId":0,"deltaRations":700}
{"kind":"settlement-population","tileId":0,"population":150}
{"kind":"settlement-remove","tileId":0,"discardPopulation":150,"discardFoodRations":1400}
```

Each line is a separate operation example, with values adjusted to the current
world. Configuration increments the settlement's rule version and preserves
progress counters. Food adjustments preserve counters until the next daily
calculation. Explicit population replacement resets both counters. These edits
clear the old daily ledger; ordinary terrain/weather edits retain its historical
record. Removal requires exact current discard quantities and sets population to
zero. Capacity reductions below current population and negative food balances
reject the whole proposal. Normal world revision and tile scope checks also apply.

## Playing and inspecting

Select land, open **Settlement and food**, and review placement. Existing
settlements expose reviewed food adjustments. Alternatively ask the model to
found a settlement or change its bounded settings; Discuss still changes nothing.
The inspector shows inhabitants, food, days of reserve, configured production and
demographic progress, plus exact last-day balances. Population and Food reserves
overlays show geographic differences. A settlement with at least 100 inhabitants
uses the existing city artwork rule; creator actions reveal that tile immediately.

The forecast compares before, Apply, day +5 and the unchanged baseline. Five days
may not reach the configured demographic interval. Checkpoints, portable worlds,
branches and selective replay preserve settlement settings, counters and ledgers;
omitting creation fails if later interventions require that missing settlement.

## Compatibility and limitations

This build retains schema 4 / engine 0.4.0 with optional settlement state, following
existing optional feature conventions. The `food-population-v1` marker pins this
calculation. Settlement-free states remain byte-identical; saves with settlements
require a build supporting this feature. New model versions must retain old model
semantics for replay. There is no population ticking while the application is closed.

No trade, migration, sanitation, pollution or disease is active yet. Food aid is
explicit creator intervention. Generic entities named farms/towns and custom soil
fertility do not automatically participate. These are future explicit integrations.

Validation: `npm run check` and `npm run test:settlements`. Tests exercise stock
balances, rounding, extreme weather, zero rates, extinction, capacity, stale edits,
atomic rejection, prompt scope, save/reload, checkpoints, portable worlds and replay.

Acceptance on 2026-09-20: all 125 tests pass; settlement, prompt, water-transport,
portable, entity and selective-replay browser checks pass. A real native Claude
request produced a valid placement proposal, passed forecast/copy Apply/daily
accounting and left the saved test fixture unchanged. Desktop/mobile visuals were
inspected. LAN deployment preserved the exact active-world and saved-envelope hashes.
