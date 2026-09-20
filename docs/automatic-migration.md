# Automatic permanent relocation

`neighbor-migration-v1` lets residents choose a permanent move to an adjacent
existing settlement. It is independent of temporary [neighbor visits](neighbor-visits.md).
Both endpoints must be land and allow travel (missing permission means open).
No player approval or model call is required for each departure. Communication and
food-sharing permission do not control people carrying their own supplies.

New web-created worlds start enabled. Historical worlds retain their recorded
behavior until `migration-configure` activation. The **Automatic relocation**
inspector control reviews enabling/pausing. Advisor configuration requires Entire
world scope, current expectedVersion (0 initially), enabled and complete settings.
Configuration increments version and preserves cooldowns and the journey ID sequence.
Pausing stops future departures; existing journeys continue.

## Reasons and limits

| Setting | Default | Meaning / bounds |
| --- | --- | --- |
| departurePermille | 20 | 0–1,000; maximum fraction of residents in one departure |
| cooldownDays | 7 | 1–3,650; minimum days between departures from one zone |
| shortageDays | 3 | 1–3,650; shortage counter used to identify food pressure |
| crowdingPermille | 900 | 1–1,000; crowding threshold as share of housing capacity |
| reserveImprovementDays | 2 | 1–3,650; required improvement in food days to attract |
| destinationReserveDays | 3 | 1–3,650; destination food cover required after arrival |
| daysPerHop | 2 | 1–30; journey duration to the adjacent destination |
| provisionDays | 3 | 0–3,650; maximum food carried per migrant |

Decisions read a snapshot after daily meals and demographic changes. Destinations
need space and enough current food for residents, existing inbound travelers and
this new group. Existing inbound food is excluded from the food-coverage calculation;
this avoids relying on supplies that might be consumed or redirected before arrival.

An origin considers neighbors ordered by food days per resident plus inbound person,
then zone ID. It selects the first that fits at least one person and offers either:

- Food cover after adding the proposed group improves by reserveImprovementDays.
  This is reported as **food pressure** when home reserves are below one day or
  its shortage counter reaches shortageDays; otherwise **better reserves**.
- Home is at/above the crowding threshold, and destination crowding after arrival
  is both below that threshold and lower than home (**crowding**).

Food improvement is not required for the crowding alternative, but destination
minimum food cover always is. These are deterministic aggregate decisions, not
individual personalities or predictions of future harvests.

Budget = min(population, max(1, floor(population × departurePermille / 1,000))) at
positive rates; zero stops departures. Housing and food capacity may reduce a group.
Origins resolve in zone ID order. A zone receiving an existing or newly planned
party does not depart, and a departing zone cannot receive a newly planned party
that same phase. This avoids immediate opposing moves. At most 64 migration journeys
of all kinds can remain active; full capacity postpones new departures.

## Journeys and accounting

A departure immediately debits residents and carried food once. Food is bounded by
population × provisionDays, available source food, and destination storage headroom
including existing inbound cargo food. No extra rations are created. Home shortage
counters persist, so migration cannot continually reset famine losses; its growth
streak resets because the resident population changed.

Automatic migration runs after settlement meals, before custom rules/plugins.
Migrants have already eaten (or missed their meal) at home today. Their first travel
step and carried meal occur next tick. They reuse [journey](journeys.md) movement,
shortage losses, full-capacity arrival, waiting, provisioning, redirection and docking.
The population total includes transit. No automatic settlement founding, cargo
stocks, sea travel or teleportation is introduced.

Inbound reservations are conservative departure checks, not guaranteed housing.
Later births, manual journeys, border closures, submersion or creator changes can
still block arrival. Travelers then wait under the existing recovery rules.

State saves a bounded per-zone last-departure list, a monotonic sequence for stable
journey IDs, and lastDay departure reasons/destinations/counts/food. The five-day
preview lists departures across all forecast days; the inspector shows today's
local departures and active journey progress. Historical settlement daily ledgers
are cleared when a departure changes their balances, rather than retaining invalid
post-meal population/food totals.
