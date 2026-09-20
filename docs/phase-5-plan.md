# Phase 5 — broader deterministic simulation

Started 2026-09-20. Phase 4 is complete. This plan breaks broader simulation into
reviewable milestones; each adds documentation, bounded world data/operations,
deterministic tests, persistence/replay checks, readable previews and a usable UI.
The model is called only for creator prompts. No offline progression, autonomous
model decisions, arbitrary engine edits during play or automatic provider repair.

Status: **5a–5e implemented and deployed**, including automatic visits and
relocation follow-ups. Phase 5e passes engine, browser and native Claude source
acceptance. Historical provider refusal for the earlier combined air/migration
request is documented in DEVELOPMENT.md. Phase 5f1 health accounting is implemented; 5f2 contact transmission follows.

## Sequence and exit criteria

| Milestone | Scope and dependencies | Acceptance |
| --- | --- | --- |
| 5a. Actual water transport and explanations | Extract the current hydrology phase without changing its arithmetic or ordering. Expose exact one-hop water/sediment transfers and per-zone source/sink budgets through a read-only next-day preview. | Old 100-day hashes remain identical; every zone balances; no same-day retransmission of incoming runoff; preview changes neither save nor journal and makes zero model calls. |
| 5b. Food and population — complete | Explicitly introduce settlement state, food inventory, bounded production/consumption and tangible weather/flood/heat effects. Define inhabitants, food units, capacity and shortage/surplus counters. Creator placement and actual inhabitants/daily food reserves are confirmed. See [implemented model](settlements.md). | Food sources/sinks balance; inhabitants stay bounded/nonnegative; shortage and recovery are observable; existing worlds do not silently acquire active demographic rules. |
| 5c. Trade and movement — complete | Begin with adjacent food/resource transfers, capacities and supply/demand. Add explicit travel permissions independent of communication, then timed long-distance routes and migration. | No double spending, lost inventory or duplicated people; stable competition resolution; travel respects duration; world totals include travelers in transit. |
| 5d. Airflow and air pollution — implemented | Deterministic spherical wind field, emissions, bounded directed transport, mixing and explicit removal. Add creator pulses and sustained sources, wind/air-quality inspection and overlays. | Wind reversal changes the affected neighbors; calm behavior is defined; emissions/transfers/removal balance; stopping emissions does not erase existing load. |
| 5e. Water contamination and sanitation — implemented | Reuse 5a water volumes for load transfer. Define dissolved load, dry deposits, dilution, wash-off and ocean export. Add explicit sanitation/infrastructure links after 5b; famine affects these through documented rules. | Evaporation does not delete contaminant mass; dry zones avoid division by zero; runoff carries load downstream; sources/sinks and ocean export balance. |
| 5f. Generic disease — 5f1 implemented, 5f2 pending | After 5b/5c: susceptible/ill/immune people, local contact, recovery, no direct disease deaths. Carry health state with travelers. Environmental exposure is separate from infectious spread. | Empty zones cannot gain sick inhabitants spontaneously; distant arrivals spread illness only on arrival; people and health compartments reconcile. |
| 5g. Knowledge and technology | Tangible research costs, progress and unlocked bounded production/infrastructure effects. Communication permits defined knowledge exchange; completion activates effects at a documented tick boundary. | Knowledge does not teleport across closed channels; costs debit once; unlocks survive saves/replay; no model call is needed for progress. |
| 5h. Factions and conflict | World-defined ownership, explicit relationships and resource-backed conflict over zones/routes. Concrete manpower, supplies, damage and repair rules; no abstract “freedom” settings. | Stable simultaneous resolution, accounted losses/displacement, explicit travel/trade effects, recovery and deterministic replay. |
| 5i. Integration and tuning | Long-run scenarios combining weather, food, movement, environment, health, knowledge and conflict. Reconcile documentation, overlays and explanations. | Scenario replay, conservation, old-world compatibility, interruption recovery, bounded cost and browser acceptance; publish a final evidence matrix. |

5d can proceed independently after 5a. Water contamination can be tested with
creator releases before sanitation exists. Disease waits for population and
movement. Technology and conflict should use working resource/population rules
rather than introducing a separate inventory or population accounting system.
This ordering refines the earlier environment roadmap; its causal requirements
still apply. Each milestone may be split further if a review would become too large.

## Agreed decisions for 5b

- Confirmed: the creator explicitly places initial settlements. New worlds begin
  unpopulated; existing worlds do not gain settlements on load.
- Confirmed: track actual inhabitants and daily food reserves. Sustained shortage
  reduces population; sustained surplus allows slow growth.
- Exact food units, rates, demographic intervals and capacity limits are
  documented in [settlements](settlements.md). They are fantasy gameplay balance,
  not empirical human nutrition or disease parameters.

## Compatibility and tick policy

Phase 5a is diagnostic/refactoring work: no saved schema change, no new model
operations, no new sources/sinks and no change to existing deterministic output.
Its report is transient data for the same next-day calculation, not fabricated
history. Reusable edge transfers establish the basis for contamination transport.

5b uses explicit settlement activation and the `food-population-v1` marker. Keep inactive historical worlds on their original behavior. If a
physics change cannot preserve old replay, introduce an explicit versioned model
and migration/review boundary; do not silently reinterpret committed steps or
increment an engine version without supporting recorded histories.

Each new phase declares its input snapshot and whether later phases see its
output. Water, messages, goods and people are distinct transport channels. Account
for stocks and transit explicitly, round deterministically and explain every
source, sink and creator edit. Plugin/custom-rule interaction must be documented;
new properties are not automatically writable from every existing interface.

## Per-milestone delivery checklist

1. Document units, bounds, defaults, activation and phase ordering.
2. Implement pure calculations and validate proposed world changes atomically.
3. Test deterministic replay, conservation, limits, dependencies and old saves.
4. Add inspector/overlay/preview feedback that shows causes and destinations.
5. Verify browser behavior and no model calls during ordinary simulation.
6. Update DEVELOPMENT.md, deploy while preserving the saved world, and commit/push.

See [environment and health](environment-and-health.md) for the requested smoke,
contaminated runoff, famine/sanitation and travel-linked illness scenarios.

### 5b soil follow-up

Added explicit [soil ecology](soil-ecology.md): fertility-limited harvest, weather
recovery/depletion, farmer stewardship and urban fertility/vegetation pressure.
Thresholds and rates are world data; historical worlds retain original behavior
until reviewed activation. Trade/movement remains next.

## Phase 5c substeps and decisions

1. **5c1 — adjacent food sharing:** automatic neighbor sharing after reviewed world
   activation (confirmed), protected reserves, demand targets, capacities, local
   permissions and conserved daily routes. See [food sharing](food-sharing.md).
2. **5c2 — resource routes and travel permissions:** implemented [named stock routes](resource-routes.md) with resource-route policies
   and tangible general movement permissions without conflating communication,
   existing custom stock effects and food sharing.
3. **5c3 — timed journeys and migration:** explicit departures/arrivals, capacity,
   inventory and inhabitants in transit, interruption and route-change policies.

5c1 does not complete the whole trade/movement milestone. Prices, currency and
markets are not implied. The player also confirmed per-settlement food/population
balance settings are adjustable through reviewed prompts.

### Phase 5c3 decisions

Confirmed: creator-directed departures between existing settlements, with blocked
arrivals waiting for repair/capacity or redirection. Automatic migration was
initially deferred and is now added under the separately requested 5c5 policy. Land neighbors first was also confirmed for resource routes. See
[journeys](journeys.md) for provisions, shortage losses, recovery and conservation.

### Phase 5c acceptance

5c1 automatic food sharing, 5c2 named adjacent stock routes/travel gates, and 5c3
timed creator-directed land journeys are implemented and deployed. Whole-world
population and stock totals include transit; movement/capacity/shortage outcomes
are explained and recoverable. Automatic relocation is the requested 5c5 follow-up;
sea travel and currency markets remain future extensions.

### Phase 5c4 — routine neighbor visits (complete)

Requested after 5c3: populated zones autonomously visit adjacent zones for food,
work and exploration without individual player approval. Implement temporary
same-day trips, separate from migration, with default-open travel permissions,
conserved food, reallocated labor and visible deterministic contact records.
See [neighbor visits](neighbor-visits.md) for defaults, phase ordering and limits.

### Phase 5c5 — automatic relocation (implemented)

Player now requests autonomous permanent moves as well as temporary visits.
Food pressure, crowding and better nearby conditions motivate departures; explicit
travel closures apply. See [automatic migration](automatic-migration.md).

### Phase 5d confirmed scope

Track and spread air pollution first; defer ALL vegetation, farming and health
damage. The load/wind/source/control/overlay milestone is documented in
[air pollution](air-pollution.md). Physical transport ignores human travel borders.

### Phase 5e decisions and implementation

Confirmed: polluted water reduces farm output; illness comes later. Settlements
produce adjustable waste only after explicit water-model activation. Sanitation
has installed capacity and persistent condition; food shortages impair the next
day’s treatment and fully-fed days restore it. Actual runoff carries integer load,
dry pools retain deposits, clean water dilutes, and ocean export is accounted.
See [water quality](water-quality.md) for activation, conservation, scope and limits.

### Phase 5f substeps and confirmed decisions

1. **5f1 — health accounting and recovery:** implemented [health tracking](disease.md),
   creator introduction/treatment, water-caused cases, temporary immunity and farm
   workforce loss. All population edits and journeys preserve valid compartments.
2. **5f2 — contact transmission:** next; bounded local and travel-contact infection,
   with explicit snapshots and attribution. No contagion exists in 5f1.

Confirmed: no direct disease deaths; starvation rules still apply. Polluted water
may introduce initial cases, in addition to creator introduction. Existing worlds
require reviewed health activation; no model calls occur during simulation.
