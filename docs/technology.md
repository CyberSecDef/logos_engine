# Knowledge and technology — Phase 5g plan

Phase 5g is divided into three reviewable deliveries:

1. **5g1 — local research:** versioned world technology definitions, settlement
   projects, tangible worker-time costs, recorded progress and bounded farm
   improvements. Completion takes effect on the following day. Preserve existing
   worlds until reviewed activation. Show costs, stalled work and completion.
2. **5g2 — knowledge exchange:** separately enabled adjacent communication, frozen
   daily knowledge snapshots, closed-channel enforcement, prerequisites and
   explicit teaching/learning accounting. No same-day knowledge retransmission.
3. **5g3 — broader unlocks and acceptance:** water-treatment improvements, resource
   costs if useful, custom-rule reads and integrated multi-settlement scenarios.
   Check definitions, replay, migration, depopulation, food, health and transport.

The player confirmed automatic settlement project selection and improved
cultivation as the first example. Research
workers are healthy residents staying home, excluded from that day's farm labor;
ordinary meals remain accounted once. Visitors do not simultaneously research.
No model calls occur during research or knowledge exchange.

Implementation requirements:

- Technologies are world data interpreted by fixed engine primitives, not code.
- Local acquisition is distinct from global definition. Defining a technology
  does not grant it to every settlement.
- Research never creates inhabitants, food or worker time. Pausing retains progress.
- Flooded/submerged/empty settlements cannot research; food and health affect
  available workers. Explain stalls and protect configurable food reserves.
- Never compound bonuses by repeatedly rewriting base settlement settings. Derive
  bounded effective capacities from completed knowledge; preserve creator settings.
- Save completion time so bonuses begin at an explicit next-day boundary.
- Inactive old saves remain unchanged. Validate scope/version/dependencies and
  reject incomplete proposals atomically. Preserve replay and portable saves.
- Imported knowledge and new effects must not silently alter earlier completions.

Phase 5g is implemented. The contracts and tested limits follow below.

## Implemented: 5g1 automatic local research

Confirmed by the player: settlements choose projects automatically; improved
cultivation is the first example. **Adjacent knowledge exchange is implemented in 5g2 below.**

### Activation and world definitions

Use the inspector's **Research and technology → Review enabling research**, then
**Review cultivation technology**. These are two independently reviewed proposals.
Activation starts with no definitions; defining a technology makes it available
to every active settlement, without granting knowledge or changing progress.
Existing worlds remain unchanged until reviewed activation.

World `technology` is optional, with model `local-research-v1`, a version, enabled
flag, settings and at most 16 definitions. Settings default to `workerPermille:100`
(10% of residents) and `reserveDays:7`. Reviewed prompts can adjust the fraction
from 0–1,000 and reserves from 0–3,650 days. A zero fraction pauses automatic
research, while explicit manual assignments retain their own worker budget.

Each immutable definition has a stable lowercase ID, label, `workRequired`
(1–1 billion worker-days) and `farmBonusPermille` (0–1,000). The cultivation example
requires 200 worker-days and adds 200 permille (20%) to farm capacity and worker
productivity. Definition edits/removal remain unsupported; optional prerequisites
and treatment efficiency are described in 5g3 below. New definitions use new IDs and cannot silently rewrite
completed knowledge.

### Daily selection, labor and food

After journey arrivals, neighbor visits and illness contact spread, but before
farming/meals, populated land settlements choose an unfinished project. Retain an
existing unfinished automatic assignment; otherwise choose the cheapest total
work requirement, with stable ID as tie-breaker. One project is worked per day.

Automatic daily allocation is `floor(population * workerPermille / 1000)`, minimum
one when the fraction is positive. Bound this by healthy residents who stayed
home and the remaining required work. Illness only excludes workers when health
is active, consistent with farming. Visitors of every purpose are unavailable
for home research; incoming workers can farm but never research simultaneously.

Each researcher contributes one base worker-day and is subtracted from farm labor.
Separately enabled knowledge exchange can increase progress per researcher.
There is no invented extra food charge: researchers consume their ordinary home
meal exactly once. Research requires **pre-harvest** food of at least
`population * (reserveDays + 1)`: reserves plus today's meals. This is a start-of-day
threshold, not a guarantee against future shortages. Automatic food collection
and sharing have already occurred. Empty, unoccupied, submerged or flooded zones
(over 100 mm standing water) do no work. Temperature/soil affect food production,
not research directly.

The local daily report records actual workers/progress and why activity stopped:
idle (no selected/remaining project), paused, empty, terrain, food, no available
workers or completed. Progress is integer,
cannot overrun the requirement and completion records the current tick.

### Completion and farm effects

On the **following day**, combine completed local bonuses additively, capped at
+100% overall. Multiply both base farm capacity and available-worker output by
this factor, floor each and take their minimum, with a 10-million-ration absolute
capacity cap. Existing temperature, moisture, soil fertility, flooding and water
quality rules still limit actual production. No base settlement setting changes,
so bonuses never compound daily and creator edits remain meaningful.

Neighbor work-trip assignment currently uses base farm staffing needs; the shared
capacity/productivity factor normally preserves that staffing ratio. At the
absolute capacity ceiling, work visits can exceed useful staffing. Research does
not request additional visiting workers to replace researchers in this milestone.

### Local archives, overrides and pause

Optional tile `research` stores projects (technology ID, progress, completion tick),
assignment, local pause and last daily report. Treat these as local archives:
progress/knowledge remain when population leaves or a settlement is removed.
New inhabitants can use the archive; travelers do not carry it elsewhere. Sharing between zones requires the separately activated exchange described below;
prerequisites are enforced locally as described in 5g3 below.

- `technology-configure`: world scope; `expectedVersion` 0 initially/current later,
  `enabled`, complete `settings`. Increments the shared technology version.
- `technology-define`: world scope; current `expectedVersion` and a complete
  definition. Increments version; rejects duplicate IDs or more than 16 definitions.
- `research-assign`: local populated land settlement; existing `technologyId`,
  `workers` 1–1 million, `reserveDays` 0–3,650. Overrides automatic selection.
  Keeps all previous progress; rejects already learned projects. A completed
  manual assignment stays selected until the creator changes it.
- `research-pause`: local pause, keeps archives and learned bonuses.
- `research-auto`: clears local pause/manual override; automatic choice resumes
  on the next day and retains project progress.

Global pause disables research **and farm bonuses**, preserving archives. Local
pause only stops research. Simulation calls no model; prompts can discuss a plan
before proposing operations and all operations pass the existing review workflow.

### Validation and remaining work

Inspector reports show allocation, progress, stalls and completion/bonus dates.
Five-day previews compare research against the unchanged baseline; longer projects
will not complete within that window. Tests cover labor, food, terrain, illness,
visits, automatic/manual selection, paused archives, completion timing, immutable
IDs, bad progress, world scope, forecast purity and 100-day replay/checkpoint/portable
saves. `npm run test:technology` checks the full browser flow with isolated saves.

Phase 5g3 adds treatment efficiency, prerequisites and knowledge reads below.
Resource-input construction costs remain outside these efficiency primitives.
Knowledge exchange uses its separate opt-in model below.


## Implemented: 5g2 adjacent knowledge exchange

Confirmed: neighbor knowledge accelerates local research rather than granting
instant completion. The default bonus is +100% progress per worker (twice as
productive). Knowledge is access to a neighboring archive, not a shipment of
people or a separate population of teachers.

### Activation and channel

After enabling technology, use **Research and technology → Review enabling
knowledge exchange**, or ask the advisor with Entire world scope. Operation
`knowledge-configure` requires current technology `expectedVersion`, `enabled`,
and integer `bonusPermille`0–1000 (default1000). It increments the shared technology
version. Optional `technology.exchange` has model `neighbor-knowledge-v1`.
`technology-configure` preserves it. Existing research and replays are unchanged
without exchange activation. Global technology pause also suspends exchange;
pausing exchange alone leaves local research and learned farm improvements active.

Both source and learner must be populated land settlements with communication
open. The source must be adjacent and have already completed the learner's current
project before today's tick. Select the eligible source with the lowest zone ID;
multiple sources never stack. Travel permissions, trade permissions and routine
visits do not gate this separate communication channel. Source population loss or
submergence prevents assistance. A populated source with flooded ground can still
provide archive access; flooded learners cannot research under existing rules.

Local research pause prevents learning, but does not hide completed archives from
neighbors. Closing either endpoint's communication stops future assistance while
preserving all previous progress and completions. Sources do not lose knowledge.
There is no direct long-distance sharing or knowledge carried by migration.

### Snapshot, labor and completion

Build the source snapshot before any local research. Only `completedTick < tick`
qualifies, so today's completions cannot spread again today, regardless of tile
order. A project keeps its existing automatic/manual assignment and food/health/
visit constraints. Let R be remaining research work, B the selected bonus, and A
the existing available/reserved resident worker budget. Then:

```
workers = min(A, ceil(R * 1000 / (1000 + B)))
progressAdded = min(R, workers + floor(workers * B / 1000))
knowledgeWork = progressAdded - workers
```

With no eligible source B=0, giving the original local-research arithmetic.
There is no fractional carry or minimum bonus; a small bonus may round to zero.
The final-day allocation only takes enough workers to finish, rather than charging
the full worker budget. Workers still leave farming once and eat ordinary meals
once. Sources do not reserve teachers or pay a separate transmission charge in
this first exchange model. The tangible cost is the receiving settlement's worker
time and foregone farm production; efficiency is a technology benefit.

Completion remains local and recorded at the current tick; farm benefits start
next day. Food-short, paused, empty or unhealthy learners do not receive free
progress. No model is called during learning.

### Reports and verification

Local `research.lastDay` records actual workers and total progress. When assistance
adds progress, `knowledgeWork` records the extra work and `knowledgeSource` records
the source zone. These refer to that day's snapshot, so later closure or migration
does not invalidate the historical report. Inspector and five-day forecast rows
show the source and contribution; the Connections overlay shows communication.

`npm run test:knowledge` covers reviewed activation/cancel, real assistance,
closure/reopening, completion/next-day bonuses, save/replay, desktop/mobile and no
autonomous model calls. Engine coverage adds two-hop no-relay, both endpoint gates,
travel independence, source eligibility, local/global/exchange pauses, reserves,
rounding, no stacking/source tie-breaks, scope/version rejection and portable saves.
Phase 5g3 is implemented below, including combined simulation acceptance.


## Implemented: 5g3 treatment efficiency, prerequisites and world-rule reads

Confirmed: improved filtration makes **existing** sanitation plants more effective.
It never creates a plant, repairs condition or grants an instant pollution cleanup.
Use **Review filtration technology** after activating research, or define a project
through a reviewed world prompt. The example requires 300 base worker-days,
`farmBonusPermille:0` and `treatmentBonusPermille:500` (+50%). No prerequisite is
imposed on this example; creators can define dependent technologies separately.

### Treatment effects

The optional definition field `treatmentBonusPermille` is an integer0–1000. Omitted
means zero with no migration or changed historical serialization. Sum completed
local treatment bonuses independently of farming, capped at+100%. The effective
multiplier is1000 plus that sum, only while the technology model is active.

On the day after completion, before water-pollution treatment:

```
effectiveCapacity = min(1_000_000_000,
  floor(installedCapacity * conditionPermille * treatmentMultiplier / 1_000_000))
```

Exact integer arithmetic preserves rounding and old behavior without a bonus.
Treatment still requires enabled water quality and a populated land settlement.
Zero installed capacity or zero condition gives zero treatment. Only available
pollution is removed, surface first then dissolved, using the existing conservation
ledger. Existing food-shortage maintenance rules still change tomorrow's condition.
Base capacity/condition never compound or get rewritten by research.

The water ledger records effective capacity and, when above baseline, optional
`treatmentTechnologyPermille`. Inspector reports distinguish effective capacity
from installed capacity and condition. Global technology pause suspends bonuses;
local research pause retains already learned benefits. A recorded completion
cannot improve treatment earlier on the same day: water processing precedes
research, and eligibility requires an earlier completion tick.

### Prerequisite graphs

Optional `prerequisites` contains up to four unique technology IDs. Define those
IDs first; unknown/duplicate dependencies and cycles reject atomically. Definitions
remain immutable, so an old project cannot silently gain new requirements.
Saved/imported graphs and completion chronology are validated as well.

Every prerequisite must be completed in the **same zone before the current day**.
Automatic selection skips locked projects; manual assignment may select one but
reports `prerequisites` and spends no workers until eligible. Neighbor knowledge
assistance cannot bypass a local prerequisite. A completed prerequisite makes its
dependent project eligible on the following day. Archived knowledge survives
population changes under the existing tile-archive policy.

### Read-only world interface

Rules, appearance conditions and restricted plugins share two new numeric reads:

| Source | Required identifier | Value |
| --- | --- | --- |
| `technologyKnown` | `technologyId` | 1 if locally completed, otherwise0 |
| `technologyProgress` | `technologyId` | Stored research work, otherwise0 |

The ID must name a defined technology. `fieldId` and `entityTypeId` are not accepted
for these reads; `technologyId` is not accepted on other read sources. Existing
self/neighbor-average/min/max sampling works normally. These are observations of
local archives, including while research is paused. They do not bypass the built-in
communication gates or grant research: custom outputs still only affect their
existing custom properties/entities. A rule may deliberately observe neighboring
knowledge as any other exposed state; that observation has no built-in learning
effect.

Custom rules/plugins run after research, so they can observe completion today.
Built-in treatment/farming benefits and prerequisite/knowledge-sharing eligibility
still use their documented next-day boundary. Plugins cannot write research state,
change installed treatment capacity or introduce new engine opcodes.

### Costs and integrated acceptance

Resident worker-time and foregone farm production remain the research cost. No
additional material/currency cost was added for these efficiency improvements;
physical construction and resource-cost recipes remain future extensions. This
is a deliberate limit, not an unimplemented requirement for the current effects.

Tests verify next-day treatment, independent bonus caps, no free plants, zero/
damaged/unpopulated treatment, pause behavior, prerequisite ordering/cycles/forged
history, strict read validation and actual rule/plugin execution. A deterministic
200-day scenario combines soil/weather, water pollution/waste/treatment, health/
contact, visits, migration and a timed journey, food sharing, air transport,
research and knowledge exchange. Population and pollution ledgers reconcile;
replay, checkpoints and portable archives preserve the resulting state.

`npm run test:technology-effects` verifies the reviewed filtration definition,
automatic research, next-day treatment, unchanged installed capacity, zero-capacity
neighbors, forecasts, replay/reload, responsive layout and zero autonomous calls.
Phase 5g is complete; Phase 5h factions/conflict is next. Longer whole-world tuning
across conflict and every other system remains Phase 5i.
