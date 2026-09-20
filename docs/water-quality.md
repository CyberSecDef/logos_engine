# Water contamination and sanitation

`runoff-pollution-v1` tracks dissolved contaminants and surface deposits, carried by
actual hydrology. Polluted standing water reduces farm output (confirmed player
choice). Illness and direct health/vegetation damage are deferred to later work.
Existing food-shortage demographic rules still apply if lower harvest causes famine.
All quantities are fantasy game units, not real water-safety measurements.

## Activation and controls

Open **Water quality and sanitation → Review enabling water quality**. Initial
activation creates clean pools, full sanitation condition, zero explicit sources
and zero installed treatment capacity. By default, inhabited settlements then
produce daily waste; the preview discloses this before Apply. Existing worlds stay
unchanged until this recorded activation. New worlds also require activation.

| Operation | Effect |
| --- | --- |
| water-quality-configure | Global enabled/settings and expectedVersion (0 initially, current thereafter). Requires Entire world advisor scope; increments version. |
| water-pollution-release | Local amount and pool `water` or `surface`. Water releases on dry tiles become surface deposits. |
| water-pollution-cleanup | Remove an exact available amount, dissolved first, then surface. Reject overdraft; sources remain configured. |
| water-pollution-source | Recurring local surface unitsPerDay 0–1 million. Zero stops that source, not settlement waste or existing pollution. |
| sanitation-configure | Local capacityPerDay 0–1 billion and conditionPermille 0–1,000. Explicitly sets condition, including repairs. |

Tile `waterQuality` stores dissolved, surface, emissionPerDay, sanitationCapacity
and sanitationCondition. Each pool is nonnegative integer units; **combined tile
load cannot exceed one billion**. Invalid creator edits reject atomically.

| World setting | Default | Bounds / meaning |
| --- | --- | --- |
| washoffPermille | 250 | 0–1,000; wet surface fraction dissolved per day |
| settlingPermille | 50 | 0–1,000; remaining dissolved fraction deposited after transport |
| decayPermille | 0 | 0–1,000; fraction explicitly removed from each pool daily |
| qualityLimitPerMillionL | 100 | 1–1 million; concentration at which water's farming multiplier reaches zero |
| settlementWasteEnabled | true | Explicitly disclosed during activation |
| wastePerPerson | 10 | 0–1,000; daily waste units per resident in a settlement |
| shortageLossPermille | 100 | 0–1,000; sanitation condition lost per day with unmet food |
| recoveryPermille | 50 | 0–1,000; condition recovered per fully-fed occupied day |

## Exact transport and ordering

Hydrology remains unchanged. Its real report records rain, evaporation, pre-flow
mixing volume, each runoff edge, final volume and ocean drainage. Pollution runs
immediately after hydrology, before air, journey arrivals, soil and meals:

1. Explicit sources, then enabled settlement waste, enter surface pools. Population
   is the pre-arrival resident population at this boundary. Capacity limits each
   addition; rejected source/waste units are reported and never enter the stored
   system. No existing load is erased to admit a new source.
2. A populated land settlement treats local surface waste first, then dissolved
   load, up to floor(installed capacity × condition / 1,000). Unpopulated/submerged
   plants do not operate. Today's incoming load cannot be treated until tomorrow.
3. If post-evaporation mixing water is zero, dissolved load becomes a surface
   deposit. Otherwise floor(surface × wash-off / 1,000) dissolves into that water.
4. Each **actual runoff edge** proposes
   floor(snapshot dissolved × edge water litres / mixing water litres).
   Multiplication/division use exact integer arithmetic, including large volumes.
   Incoming pollution cannot be sent onward today. Shared destination capacity
   reads the pre-transfer combined pool snapshot; outgoing load does not free
   same-day space. Origins/recipients resolve in ascending ID order. Capacity-
   rejected transfers stay at the source, an explicit storage-bound approximation.
5. Incoming water can wet previously dry deposits after transfers; this newly
   washed load cannot continue downstream until another tick. It is washed once,
   not again on tiles already washed before transfer.
6. Actual ocean drainage exports all dissolved load at that tile as an explicit
   sink. Any remaining dry dissolved load becomes surface deposit. Settling moves
   a configured fraction from dissolved to surface. Decay removes a configured
   fraction from each pool as an explicit abstract sink (default zero).

Evaporation removes **water only**. Clean rain/inflow can dilute concentration
without deleting load. Surface deposits persist through dry days and may dissolve
when standing water or incoming runoff wets them. Borders and communication do
not block contamination. Air deposition, chemical species and ocean circulation
are not included. Dry ocean deposits remain until water washes them into the
accounted drainage sink; they are not silently deleted because the tile is ocean.

Budget: after = before + actual sources + actual waste − treatment − ocean export
− decay. Transfers conserve world load; wash-off, drying and settling conserve
local total. Every tile and transport edge has a bounded last-day accounting report.
Integer fractions round down, so small remainders can persist until cleanup.

## Farming and usable-water indicator

Concentration = dissolved units × 1 million / standing water litres. Dry tiles show
**unavailable**, with zero quality-weighted water, rather than claiming clean water.
Surface load is shown separately.

Game water quality percent = max(0, 100 × (1 − concentration / configured limit)).
The inspector's quality-weighted water estimate is floor(water litres × percent /100).
It is not a second inventory, drinking-water withdrawal, or claim of real safety.

When the model is enabled and water is present, farm multiplier =
floor(quality percent × 10) / 1,000. Apply this after the existing temperature,
moisture and soil-fertility multipliers, then floor final harvest once. Examples:
50% water quality and 50% soil fertility yield 25% of otherwise suitable farm output.
At/above the concentration limit the water multiplier is zero. Farm worker visits
skip destinations whose water multiplier is zero. The settlement daily ledger
records this multiplier, and forecasts compare both pollution and food outcomes.

Dry surface deposits do not directly damage crops. With no standing water, the
water-quality multiplier is one; existing rain/moisture/weather factors still
apply. No direct illness, population loss or vegetation damage comes from this
model; consequences through existing food shortages remain possible.

## Sanitation and famine

After today's settlement meals, before automatic relocation, occupied settlements
lose configured condition points if any rations went unmet; fully-fed days recover
condition. Clamp to 0–1,000. This affects **tomorrow's** treatment capacity. Condition
persists separately from shortage counters, so famine-interval resets or migration
cannot automatically repair plants. If there are no inhabitants, condition stays
stored and treatment stops. After repopulation, meals can restore operation.

The causal chain is waste production → reduced sanitation during food shortages →
more surface/dissolved load → runoff to neighbors → reduced harvest where polluted
water remains. Famine itself is not a flowing substance. Capacity is a creator-set
infrastructure abstraction: no building inventory, worker allocation, construction
cost or currency is implemented. Repairs are explicit reviewed condition edits.

Pausing freezes pollution sources, pools and sanitation condition, and disables the
farm penalty. Hydrology continues, so displayed concentration may still change.
Re-enabling resumes from stored load and reconciles drying/wetting on the next tick.
Creator pollution/cleanup/source/plant edits work while paused.

## Interface and extensibility

**Water quality** overlay shows teal clean → orange at the configured limit, tan
dry, grey inactive. **Surface deposits** uses a logarithmic load scale. Inspector
reports dissolved/surface load, concentration, farming factor, sources, plant
condition and exact budgets/edges. **Explain next day's contamination** forecasts
one full deterministic day on a copy; it never saves, advances live time or calls
a model. Proposals compare five-day results with an unchanged baseline.

Custom rules, appearance conditions and restricted plugins can read `waterPollution`
(dissolved), `surfacePollution`, `waterConcentration` (units/million L), and
`sanitationCondition`. Absent state reads zero; dry custom concentration reads zero,
so check waterMm when distinguishing dry from clean. Outputs cannot edit built-in
pollution or sanitation through generic custom fields. Dedicated operations enforce
bounds and atomic scope. Saving, checkpoints, exports and replay preserve all state.
