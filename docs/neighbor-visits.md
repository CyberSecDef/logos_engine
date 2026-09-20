# Everyday neighbor travel

`neighbor-visits-v1` adds automatic temporary day trips alongside creator-directed
permanent migration. Each day, people in populated open land zones may visit any
open land neighbor, including unpopulated zones. Trips return home within that tick;
no individual approval, prompt, model call, offline time or active journey is needed.
These are aggregate decisions, not individually simulated personalities.

New worlds created by the web application start enabled. Historical worlds retain
old behavior until a recorded `neighbor-visits-configure` operation activates it.
The inspector's **Everyday neighbor travel** control reviews activation or pause.
Configuration through the advisor requires Entire world scope and review/Apply.
Existing explicit travel closures are respected at both endpoints; absent means
open. Communication is independent. Permanent migration uses journeys, including the separately configured
[automatic relocation policy](automatic-migration.md).

## Rules and effects

World `neighborVisits` contains model, version, enabled, settings and optional
lastDay. Configuration supplies complete settings and expectedVersion (0 initially,
current version thereafter). Changes increment version and clear the old report.

| Setting | Default | Bounds / meaning |
| --- | --- | --- |
| dailyPermille | 100 | 0–1,000; daily fraction of resident population |
| foodReserveDays | 7 | 0–3,650; donor reserve beyond today's meal |
| foodTargetDays | 3 | 0–reserveDays; recipient target beyond today's meal |
| carryRationsPerVisitor | 5 | 0–100; food collector carrying capacity |

At a positive rate, budget = min(population, max(1, floor(population × rate / 1,000))).
Zero pauses visits. No open neighbors means no departures. Every visitor has one
purpose and visits exactly one neighbor. Origins resolve in ascending zone ID;
open neighbors are sorted and rotated by (day + origin ID) modulo neighbor count.
This rotates destination priority reproducibly. Earlier origins have priority for
scarce food/jobs; this initial model does not promise equal allocation.

1. **Food collection:** a settlement below its meal-plus-target reserves sends
   collectors to neighbors with settlement food above their meal-plus-protected
   reserves. Both must allow food sharing as well as travel. Whole rations debit
   donor stores and credit home stores, limited by stock, demand, storage capacity
   and carrying capacity. This is surplus sharing, with no price or currency.
2. **Work:** remaining visitors fill initially vacant farm worker slots in suitable
   neighboring settlements. Slots = max(0, ceil(farm capacity / worker output) −
   resident population); worker output must be positive. Land, temperature,
   moisture, flood and fertility conditions must permit some harvest. Reservations
   prevent multiple origins overbooking those slots. Harvest stays at the host;
   wages and crop ownership are not modeled yet.
3. **Exploration:** remaining visitors spread across available neighbors, including
   empty land. Records provide observable contacts for later systems; exploration
   currently yields no resources, technology, damage or new settlements.

All visitors are absent from home farming that day. Only work visitors contribute
farm labor at their destination. Effective farm workers = residents − all outgoing
visitors + incoming work visitors. Incoming explorers/collectors do not farm.
Visitors eat exactly once at home through existing settlement accounting and
remain included in home population, capacity and demographic rules. They are not
also added to migration/transit totals. Unsettled inhabitants can visit/work, but
have no food inventory or newly introduced demographic/meal simulation.

## Tick boundary and conservation

Order: weather/water → migration arrivals → soil → automatic food sharing →
neighbor visits → settlement harvest/meals/demographics → custom rules/plugins.
Food collection uses frozen stocks after automatic sharing, so these systems cannot
spend the same rations. Incoming visitor deliveries cannot be forwarded by other
visits that day. Jobs use resident counts at this boundary; outbound trips do not
create additional job vacancies on the same day. Migration departures already
removed residents; today's arrivals may visit. Soil pressure remains resident-based.

Travel gating is evaluated after hydrology. Day trips have no overnight state;
there is no mid-tick border closure or stranded return leg. Creator interventions
between ticks affect the next day's visits. Historical reports retain their own day
and are not current presence snapshots. Disabled worlds have no visit labor effect.

`lastDay` records tick, equal beforeFood/afterFood totals, and bounded entries
`{from,to,purpose,visitors,rations}`. Rations travel from `to` back to `from`.
Population is never mutated by this phase. The settlement ledger optionally records
workers, visitorsAway and visitingWorkers. Inspector and deterministic five-day
preview show visit destinations/purposes and food collected. Reports survive
save/checkpoint/export/replay; they do not accumulate an unbounded daily history.
Future disease can use these contacts, but no disease spreading is implemented.
