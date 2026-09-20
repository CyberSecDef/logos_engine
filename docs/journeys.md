# Timed journeys and migration — Phase 5c3

The player confirmed creator-directed departures between existing settlements,
with blocked arrivals waiting in transit. `land-journeys-v1` implements this over
saved adjacent land paths. Automatic famine-driven migration, sea travel, disease
spread and autonomous departure policies remain future work.

## Use it

Select a populated settlement and open **Journeys and migration**. Choose a
destination settlement, inhabitants to move, food to carry and days per leg.
**Review departure** finds a deterministic shortest open land path (equal-length
choices use ascending zone ID). Review its duration, provisions and forecast before
Apply. Departure happens on Apply, debiting people and food exactly once; time
has not advanced yet. A two-leg path at three days per leg takes six simulated
days if unblocked. No progression occurs while the game is closed.

For cargo or an explicit path, use the advisor, choosing scope that covers the
whole path (usually Entire world for long journeys):

> Move 10 inhabitants from zone 0 to zone 12 along [0, 12], taking two days per leg.
> Carry 100 food rations and 5 motes of Mana. Call the journey Migrants.

Adapt IDs and confirm adjacency. The direct form carries food only; prompts support
up to eight distinct custom stock cargos. World totals include travelers and cargo.
The inspector shows current zone, destination, leg progress, provisions and shortage
progress, plus dated movement/arrival/loss reports. The five-day preview may end
before a long journey arrives; it explicitly shows remaining parties.

## Path, timing and arrival

Up to 64 active parties may travel. Paths contain 2–65 distinct, adjacent zones;
legs take 1–30 days each. Both endpoints need existing settlements at departure.
Every path zone must initially be land and allow travel. Intermediate settlements
are optional. A party remains associated with its last reached zone while a leg
is in progress; it does not become that zone's settled population.

Each day, after temperature/hydrology and before soil, food sharing and settlement
meals, process journeys by ascending stable journey ID:

1. If no travelers survive, retain the cargo at the current zone without progressing.
2. If the current or next zone is closed to travel or at/below sea level, wait
   without reducing the remaining leg timer. Standing-water floods alone do not
   block this first land model.
3. Otherwise decrement the timer. At zero, reach the next intermediate zone and
   begin a full timer for the following leg, or attempt final arrival.
4. Final arrival requires an open land destination settlement, room for every
   surviving inhabitant, food below the billion-ration cap, and room for every
   stock cargo. Arrival is all-or-nothing. Blocked parties wait at the previous
   reached zone with a zero timer and retry on later ticks; no partial unloading.
5. Successful arrival credits the destination once and removes the active party.
   Those inhabitants eat through the destination's settlement calculation that day.

Future capacity is not reserved. Competing arrivals use stable journey-ID priority.
Destination growth or creator edits can fill capacity during transit. Removing a
destination settlement causes waiting; restoring it can permit later arrival.

Arrival precedes soil and food sharing, so settled arrivals participate in that
day's population effects, food sharing and harvest/workforce calculation. Automatic
resource routes operate later through their unchanged stock-transfer phase.

## Provisions and population accounting

On every day a party remains in transit, each traveler consumes one carried ration,
including days spent waiting. No double meal is charged on successful arrival.
No farming, births, automatic replenishment, cargo conversion into food or automatic
food-sharing deliveries occur in transit.

Capture the source settlement's shortage interval and loss-permille rate at
departure. Each day with any unmet demand increments a consecutive shortage counter;
a fully fed day resets it. At the interval, lose the configured fraction of current
travelers, rounded up with at least one loss if the rate is positive, bounded by
current population. Reset the shortage counter. A zero rate disables losses.
Later edits to the source settlement do not rewrite a party's captured policy.

Losses are explicit in the daily report. If everyone dies, food/cargo remain saved
and recoverable; the party stops moving. This model does not silently delete cargo,
spawn replacements or let empty parties travel autonomously.

Departure and unloading reset shortage/surplus counters in the affected settlement
because its population composition changed. They clear its old daily ledger. Normal
food provisioning only adjusts food and clears that ledger, leaving progress to the
next daily food calculation.

Total inhabitants = settled inhabitants + active-party survivors. Total food includes
settlement reserves plus carried food. Total custom stock includes both zone stock
and carried cargo. Meals and declared population losses are sinks; transport itself
never creates or destroys them. Existing food-sharing and custom-production ledgers
remain phase-specific settled/zone-stock ledgers, separately labeled in the interface.

## Reviewed recovery

All recovery happens through the usual proposal/preview/Apply workflow:

- **Provision:** debit food from a settlement at the party's current zone and add
  it to carried reserves. No settlement there means one must be explicitly created,
  or the party must travel/dock elsewhere. Provisioning does not create food.
- **Redirect:** choose a new adjacent path starting at the current zone and ending
  at an existing settlement. Reset to a full first-leg timer; partial leg progress
  is intentionally discarded. Keep survivors, supplies, cargo and shortage progress.
  Closed/submerged parts of a redirect path may be planned but will block movement.
- **Dock:** unload the entire party into the current zone's settlement and end the
  journey. Requires open land and full population/food/cargo capacity. Works for
  zero-survivor cargo recovery. No inventory is discarded as a cancellation fee.

Creator provisioning is local even when travel is closed. Docking requires reopening
it first. Redirecting alone does not escape a closed or submerged current zone;
reopen/raise it, then resume, or establish a suitable recovery settlement.
Food-sharing permissions and communication remain separate from travel permission.
Existing generic custom stock transfers still follow their own rules.

## Operations and saved contract

```json
{
  "kind": "journey-depart", "tileId": 0,
  "journeyId": "migrants", "label": "Migrants",
  "path": [0, 12], "daysPerHop": 2,
  "population": 10, "foodRations": 100,
  "cargo": [{"fieldId":"mana","amount":5}]
}
```

IDs are unique and cannot be reused after arrival/docking. Source population/food/
stock must cover every debit. Population is 1–1,000,000; food is 0–1 billion rations.
Cargo amounts use stock units, 0–1 billion with at most three decimals, bounded by
field capacity. Duplicate cargo fields are rejected. The whole operation is atomic.
All path zones must fit prompt scope. Existing world revision checks still apply.

```json
{"kind":"journey-provision","tileId":0,"journeyId":"migrants","foodRations":50}
{"kind":"journey-redirect","tileId":0,"journeyId":"migrants","path":[0,12],"daysPerHop":3}
{"kind":"journey-dock","tileId":0,"journeyId":"migrants"}
```

Recovery tileId must be the party's current zone. Provision/dock are local;
redirection requires scope over both the old remaining path and the new path.
There is no operation that simply deletes a loaded party.

Optional `world.journeys` stores the `land-journeys-v1` marker, active parties and
up to 64 daily reports. Active state includes path/index/timer, survivors, carried
food/cargo and frozen shortage policy. Daily report statuses explain movement,
arrival, closed/submerged legs, missing settlements, capacity shortages and no
surviving travelers. Arrival reports show zero transit meals: the destination's
normal ledger accounts for them.

Cargo fields cannot be removed or changed to indexes while referenced. Unload all
cargo for a field in a separate reviewed action before applying its numeric unit conversion; this prevents unit
changes from silently reinterpreting carried quantities. Capacity reductions that
would invalidate cargo are rejected too.

## Verification and compatibility

No journey fields are invented in older worlds; previous clocks, food and stock
calculations remain unchanged until explicit departure. Model semantics must be
retained for replay. Old builds cannot load active journey saves. Checkpoints,
portable worlds, history branches and replay preserve exact in-transit state.

`npm run check` verifies timed paths, arrival once, meals once, conserved totals,
waiting/recovery, shortages/extinction, competition, permissions, scope, atomic
failures, cargo references, save/reload, checkpoints and portable replay.
`npm run test:journeys` covers departure/cancel/review, transit totals, meals,
closed travel, prompted resupply, reload, reopening/arrival and mobile layout.

Acceptance on 2026-09-20: all 154 tests pass, along with journey, route, food-sharing,
settlement and resource browser checks. Native Claude proposed a departure whose
timed arrival conserved 200 inhabitants. Mobile visuals were inspected. LAN
restart preserved the exact active-world and saved-envelope hashes.

Routine temporary day trips now have a separate [neighbor visits](neighbor-visits.md)
model. They preserve residency; this document describes permanent migration.
