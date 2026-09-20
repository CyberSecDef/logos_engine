# Phase 5 — broader deterministic simulation

Started 2026-09-20. Phase 4 is complete. This plan breaks broader simulation into
reviewable milestones; each adds documentation, bounded world data/operations,
deterministic tests, persistence/replay checks, readable previews and a usable UI.
The model is called only for creator prompts. No offline progression, autonomous
model decisions, arbitrary engine edits during play or automatic provider repair.

Status: **5a and 5b complete and deployed**. 5c–5i remain planned; trade and movement are next.

## Sequence and exit criteria

| Milestone | Scope and dependencies | Acceptance |
| --- | --- | --- |
| 5a. Actual water transport and explanations | Extract the current hydrology phase without changing its arithmetic or ordering. Expose exact one-hop water/sediment transfers and per-zone source/sink budgets through a read-only next-day preview. | Old 100-day hashes remain identical; every zone balances; no same-day retransmission of incoming runoff; preview changes neither save nor journal and makes zero model calls. |
| 5b. Food and population — complete | Explicitly introduce settlement state, food inventory, bounded production/consumption and tangible weather/flood/heat effects. Define inhabitants, food units, capacity and shortage/surplus counters. Creator placement and actual inhabitants/daily food reserves are confirmed. See [implemented model](settlements.md). | Food sources/sinks balance; inhabitants stay bounded/nonnegative; shortage and recovery are observable; existing worlds do not silently acquire active demographic rules. |
| 5c. Trade and movement | Begin with adjacent food/resource transfers, capacities and supply/demand. Add explicit travel permissions independent of communication, then timed long-distance routes and migration. | No double spending, lost inventory or duplicated people; stable competition resolution; travel respects duration; world totals include travelers in transit. |
| 5d. Airflow and air pollution | Deterministic spherical wind field, emissions, bounded directed transport, mixing and explicit removal. Add creator pulses and sustained sources, wind/air-quality inspection and overlays. | Wind reversal changes the affected neighbors; calm behavior is defined; emissions/transfers/removal balance; stopping emissions does not erase existing load. |
| 5e. Water contamination and sanitation | Reuse 5a water volumes for load transfer. Define dissolved load, dry deposits, dilution, wash-off and ocean export. Add explicit sanitation/infrastructure links after 5b; famine affects these through documented rules. | Evaporation does not delete contaminant mass; dry zones avoid division by zero; runoff carries load downstream; sources/sinks and ocean export balance. |
| 5f. Generic disease | After 5b/5c: healthy/ill/recovered people, local contact, recovery and declared losses. Carry health state with travelers. Environmental exposure is separate from infectious spread. | Empty zones cannot gain sick inhabitants spontaneously; distant arrivals spread illness only on arrival; people and health compartments reconcile. |
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
